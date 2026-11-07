import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../ai/errors.js";
import * as gemini from "../ai/gemini.js";
import { createApp } from "../app.js";

vi.mock("../ai/gemini.js", () => ({
  checkKey: vi.fn(),
  generateText: vi.fn(),
  generateJson: vi.fn(),
  streamText: vi.fn(),
}));

let server;
let base;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

afterAll(() => server.close());
beforeEach(() => vi.resetAllMocks());

const headers = { "Content-Type": "application/json", "X-Gemini-Key": "test-key-123" };

const post = (path, body, extra = {}) =>
  fetch(base + path, { method: "POST", headers: { ...headers, ...extra }, body: JSON.stringify(body) });

/** Parse an SSE body into [{event, data}]. */
function parseSse(text) {
  return text
    .split("\n\n")
    .filter(Boolean)
    .map((block) => {
      const event = block.match(/^event: (.*)$/m)[1];
      return { event, data: JSON.parse(block.match(/^data: (.*)$/m)[1]) };
    });
}

const chunk = { id: "S1", locator: "p. 1", text: "Plants turn light into chemical energy in the chloroplasts." };
const stepBrief = { title: "Light to energy", objective: "Explain photosynthesis", opening: "Think of a leaf", checkQuestion: "Where does it happen?" };

const turnBody = {
  kind: "reply",
  teacherPrompt: "Teach this to 7th graders. Be Socratic.",
  lessonTitle: "Photosynthesis",
  spec: { language: "English", audience: "7th graders", method: "Socratic", timeBudgetMin: 15 },
  step: { ...stepBrief, index: 0, total: 3, successCriteria: "Names the chloroplast" },
  nextStep: { ...stepBrief, title: "Water" },
  chunks: [chunk],
  nextChunks: [{ id: "S2", locator: "p. 2", text: "Roots absorb water." }],
  progress: { hintLevel: 0, finalAttempt: false, notes: [] },
  messages: [{ role: "student", text: "In the chloroplast" }],
};

async function* chunksOf(pieces) {
  for (const piece of pieces) yield piece;
}

describe("health and key check", () => {
  it("answers the wake-up ping without a key", async () => {
    const body = await (await fetch(`${base}/health`)).json();
    expect(body.ok).toBe(true);
  });

  it("reports a rejected key as INVALID_KEY", async () => {
    gemini.checkKey.mockRejectedValue(new AppError("INVALID_KEY", "The Gemini API key was rejected.", 401));
    const res = await post("/key/check", {});
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("INVALID_KEY");
  });

  it("passes the caller's key and chosen model to Gemini", async () => {
    gemini.checkKey.mockResolvedValue();
    await post("/key/check", {}, { "X-Gemini-Model": "gemini-3.5-flash-lite" });
    expect(gemini.checkKey).toHaveBeenCalledWith({ key: "test-key-123", model: "gemini-3.5-flash-lite" });
  });

  it("ignores a malformed model name", async () => {
    gemini.checkKey.mockResolvedValue();
    await post("/key/check", {}, { "X-Gemini-Model": "../../evil model" });
    expect(gemini.checkKey.mock.calls[0][0].model).toBe("gemini-3.5-flash-lite");
  });
});

describe("POST /lesson/turn", () => {
  it("streams visible text, hides the assessment, and verifies citations", async () => {
    gemini.streamText.mockReturnValue(
      chunksOf([
        "Exactly! The chloroplast is where it happens. What do you think the leaf needs next?\n",
        "<sta",
        'te>{"verdict":"correct","citations":[{"chunkId":"S1","quote":"chemical energy"},',
        '{"chunkId":"S1","quote":"duplicate"},{"chunkId":"S99","quote":"invented"}],"note":null}</state>',
      ]),
    );

    const res = await post("/lesson/turn", turnBody);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const events = parseSse(await res.text());

    const visible = events.filter((e) => e.event === "delta").map((e) => e.data.text).join("");
    expect(visible).toBe("Exactly! The chloroplast is where it happens. What do you think the leaf needs next?");
    expect(visible).not.toContain("state");

    const state = events.find((e) => e.event === "state").data;
    expect(state.verdict).toBe("correct");
    expect(state.citations).toEqual([{ chunkId: "S1", quote: "chemical energy" }]); // S99 dropped, duplicate dropped
    expect(events.at(-1).event).toBe("done");
  });

  it("treats a missing assessment as 'none' instead of failing the turn", async () => {
    gemini.streamText.mockReturnValue(chunksOf(["Welcome! Have you seen a leaf up close?"]));
    const events = parseSse(await (await post("/lesson/turn", { ...turnBody, kind: "start" })).text());
    expect(events.find((e) => e.event === "state").data.verdict).toBe("none");
    expect(events.at(-1).event).toBe("done");
  });

  it("puts the teacher prompt and the current passages in the system prompt, and no key anywhere", async () => {
    gemini.streamText.mockReturnValue(chunksOf(["Hi?"]));
    await (await post("/lesson/turn", turnBody)).text();
    const call = gemini.streamText.mock.calls[0][0];
    expect(call.system).toContain("Teach this to 7th graders. Be Socratic.");
    expect(call.system).toContain("Plants turn light into chemical energy");
    expect(JSON.stringify(call.contents)).not.toContain("test-key-123");
    expect(call.system).not.toContain("test-key-123");
  });

  it("returns a plain JSON error when Gemini rejects the call before any token", async () => {
    gemini.streamText.mockImplementation(async function* () {
      throw new AppError("RATE_LIMITED", "Gemini rate limit reached.", 429, { retryAfterSec: 12 });
    });
    const res = await post("/lesson/turn", turnBody);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: { code: "RATE_LIMITED", message: "Gemini rate limit reached.", retryAfterSec: 12 },
    });
  });

  it("sends an error event when the stream breaks midway", async () => {
    gemini.streamText.mockImplementation(async function* () {
      yield "Let me explain";
      throw new AppError("UPSTREAM_BUSY", "Gemini is busy right now.", 503);
    });
    const events = parseSse(await (await post("/lesson/turn", turnBody)).text());
    expect(events.at(-1)).toEqual({ event: "error", data: { code: "UPSTREAM_BUSY", message: "Gemini is busy right now." } });
  });

  it("reports an empty model answer as an error", async () => {
    gemini.streamText.mockReturnValue(chunksOf(['<state>{"verdict":"none","citations":[]}</state>']));
    const events = parseSse(await (await post("/lesson/turn", turnBody)).text());
    expect(events.at(-1).data.code).toBe("BAD_MODEL_OUTPUT");
  });

  it("rejects a malformed request with 400", async () => {
    const res = await post("/lesson/turn", { kind: "reply" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
  });
});

describe("POST /plan", () => {
  const request = { teacherPrompt: "Teach this in French", direction: "ltr", chunks: [chunk, { id: "S2", locator: "p. 2", text: "Roots absorb water." }] };
  const step = (extra = {}) => ({ ...stepBrief, successCriteria: "ok", chunkIds: ["S1"], ...extra });
  const spec = { language: "French", audience: "7th graders", method: "Socratic", timeBudgetMin: 15 };

  it("returns a plan with stable step ids", async () => {
    gemini.generateJson.mockResolvedValue({ teachable: true, title: "La photosynthèse", spec, steps: [step(), step({ chunkIds: ["S2"] })] });
    const { plan } = await (await post("/plan", request)).json();
    expect(plan.steps.map((s) => s.id)).toEqual(["step-1", "step-2"]);
    expect(plan.spec.language).toBe("French");
  });

  it("repairs a step that cites passages that do not exist", async () => {
    gemini.generateJson.mockResolvedValue({ teachable: true, title: "T", spec, steps: [step({ chunkIds: ["S404"] }), step({ chunkIds: ["S404"] })] });
    const { plan } = await (await post("/plan", request)).json();
    expect(plan.steps.map((s) => s.chunkIds)).toEqual([["S1"], ["S2"]]);
  });

  it("passes through an unteachable verdict with its reason", async () => {
    gemini.generateJson.mockResolvedValue({ teachable: false, reason: "This is a shopping list.", title: "", spec });
    const { plan } = await (await post("/plan", request)).json();
    expect(plan).toMatchObject({ teachable: false, reason: "This is a shopping list.", steps: [] });
  });

  it("fails clearly when the model returns the wrong shape", async () => {
    gemini.generateJson.mockResolvedValue({ nonsense: true });
    const res = await post("/plan", request);
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("BAD_MODEL_OUTPUT");
  });
});

describe("POST /ingest", () => {
  const upload = (name, content, type = "text/plain") => {
    const form = new FormData();
    form.append("file", new Blob([content], { type }), name);
    return fetch(`${base}/ingest`, { method: "POST", headers: { "X-Gemini-Key": "k" }, body: form });
  };

  it("reads a text file into citable chunks", async () => {
    const text = "# Cells\n\nThe cell is the basic unit of life. ".repeat(3) + "\n\n# Energy\n\nMitochondria release energy from food. ".repeat(3);
    const { document } = await (await upload("bio.md", text)).json();
    expect(document.name).toBe("bio.md");
    expect(document.chunks[0]).toMatchObject({ id: "S1", locator: "§ Cells" });
    expect(document.direction).toBe("ltr");
  });

  it("detects a right-to-left document", async () => {
    const { document } = await (await upload("heb.txt", "פוטוסינתזה היא התהליך שבו צמחים הופכים אור לאנרגיה. ".repeat(4))).json();
    expect(document.direction).toBe("rtl");
  });

  it("rejects an empty file with a friendly code", async () => {
    const res = await upload("empty.txt", "   ");
    expect(res.status).toBe(422);
  });

  it("rejects an unsupported type", async () => {
    const res = await upload("movie.mp4", "not a movie", "video/mp4");
    expect(res.status).toBe(415);
    expect((await res.json()).error.code).toBe("UNSUPPORTED_TYPE");
  });

  it("rejects a corrupt PDF without crashing", async () => {
    const res = await upload("bad.pdf", "this is not a pdf", "application/pdf");
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("UNREADABLE_FILE");
  });

  it("asks for the file when none is sent", async () => {
    const res = await fetch(`${base}/ingest`, { method: "POST", headers: { "X-Gemini-Key": "k" }, body: new FormData() });
    expect(res.status).toBe(400);
  });
});
