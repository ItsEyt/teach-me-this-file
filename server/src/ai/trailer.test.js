import { describe, expect, it } from "vitest";
import { parseTrailer, TrailerSplitter } from "./trailer.js";

function run(chunks) {
  const splitter = new TrailerSplitter();
  const visible = chunks.map((c) => splitter.push(c)).join("");
  const end = splitter.end();
  return { visible: visible + end.visible, rawTrailer: end.rawTrailer };
}

describe("TrailerSplitter", () => {
  it("passes plain text through untouched", () => {
    expect(run(["Hello ", "there"])).toEqual({ visible: "Hello there", rawTrailer: null });
  });

  it("separates the hidden state block from the message", () => {
    const { visible, rawTrailer } = run(["What is 2+2?\n", '<state>{"verdict":"none"}</state>']);
    expect(visible).toBe("What is 2+2?");
    expect(parseTrailer(rawTrailer).verdict).toBe("none");
  });

  it("handles the opening tag split across chunks", () => {
    const { visible, rawTrailer } = run(["Why?\n<sta", "te>", '{"verdict":"correct"}', "</state>"]);
    expect(visible).toBe("Why?");
    expect(parseTrailer(rawTrailer).verdict).toBe("correct");
  });

  it("does not swallow text that merely looks like the start of the tag", () => {
    const { visible } = run(["a < b and c <", " d"]);
    expect(visible).toBe("a < b and c < d");
  });

  it("never leaks any character of the state block", () => {
    const splitter = new TrailerSplitter();
    const pieces = ["Hi\n<", "s", "t", "a", "t", "e", ">", "{}", "</state>"].map((c) => splitter.push(c));
    expect(pieces.join("")).toBe("Hi");
  });
});

describe("parseTrailer", () => {
  it("returns no assessment when the trailer is missing", () => {
    expect(parseTrailer(null)).toEqual({ verdict: "none", citations: [], note: null });
  });

  it("returns no assessment when the JSON is broken", () => {
    expect(parseTrailer("{oops").verdict).toBe("none");
  });

  it("accepts a fenced JSON block and a missing closing tag", () => {
    const raw = '```json\n{"verdict":"wrong","citations":[{"chunkId":"S2","quote":"x"}],"note":"mixes up terms"}\n```';
    const parsed = parseTrailer(raw);
    expect(parsed.verdict).toBe("wrong");
    expect(parsed.citations[0].chunkId).toBe("S2");
    expect(parsed.note).toBe("mixes up terms");
  });

  it("falls back to none for an unknown verdict", () => {
    expect(parseTrailer('{"verdict":"great"}</state>').verdict).toBe("none");
  });
});
