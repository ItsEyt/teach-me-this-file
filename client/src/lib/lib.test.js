import { describe, expect, it } from "vitest";
import { highlightSegments } from "./highlight.js";
import { parseBlock, readSse } from "./sseParser.js";

function streamOf(parts) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      parts.forEach((part) => controller.enqueue(typeof part === "string" ? encoder.encode(part) : part));
      controller.close();
    },
  });
}

async function collect(parts) {
  const events = [];
  await readSse(streamOf(parts), (event, data) => events.push([event, data]));
  return events;
}

describe("readSse", () => {
  it("parses events split across network chunks", async () => {
    const events = await collect(['event: delta\ndata: {"text":"He', 'llo"}\n\nevent: done\n', "data: {}\n\n"]);
    expect(events).toEqual([
      ["delta", { text: "Hello" }],
      ["done", {}],
    ]);
  });

  it("keeps multi-byte characters that are split between chunks", async () => {
    const bytes = new TextEncoder().encode('event: delta\ndata: {"text":"שלום"}\n\n');
    const events = await collect([bytes.slice(0, 30), bytes.slice(30)]);
    expect(events).toEqual([["delta", { text: "שלום" }]]);
  });

  it("ignores comments and handles CRLF line endings", async () => {
    const events = await collect([': keep-alive\n\nevent: done\r\ndata: {}\r\n\r\n']);
    expect(events).toEqual([["done", {}]]);
  });
});

describe("parseBlock", () => {
  it("returns null for a block without data", () => {
    expect(parseBlock("event: ping")).toBeNull();
  });
});

describe("highlightSegments", () => {
  it("marks the quote even across markdown and line breaks", () => {
    const segments = highlightSegments("Plants turn **light** into\nchemical energy.", "turn light into chemical");
    expect(segments.find((s) => s.match).text).toBe("turn **light** into\nchemical");
    expect(segments.map((s) => s.text).join("")).toBe("Plants turn **light** into\nchemical energy.");
  });

  it("returns the whole passage when there is no quote or no match", () => {
    expect(highlightSegments("abc", null)).toEqual([{ text: "abc", match: false }]);
    expect(highlightSegments("abc", "zzz")).toEqual([{ text: "abc", match: false }]);
  });

  it("is safe with regex characters in the quote", () => {
    expect(highlightSegments("cost is (5+5)?", "(5+5)?").some((s) => s.match)).toBe(true);
  });
});
