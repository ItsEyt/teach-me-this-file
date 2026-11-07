import { describe, expect, it } from "vitest";
import { chunkUnits, splitByHeadings } from "./chunker.js";
import { detectDirection } from "./direction.js";
import { assertReadable } from "./quality.js";

describe("splitByHeadings", () => {
  it("makes one unit per markdown section", () => {
    const units = splitByHeadings("# One\n\nalpha\n\n## Two\n\nbeta");
    expect(units.map((u) => u.locator)).toEqual(["§ One", "§ Two"]);
  });

  it("returns a single untitled unit when there are no headings", () => {
    expect(splitByHeadings("just text")).toEqual([{ locator: null, text: "just text" }]);
  });
});

describe("chunkUnits", () => {
  it("never merges text from different pages", () => {
    const chunks = chunkUnits([
      { locator: "p. 1", text: "short one" },
      { locator: "p. 2", text: "short two" },
    ]);
    expect(chunks.map((c) => c.locator)).toEqual(["p. 1", "p. 2"]);
    expect(chunks.map((c) => c.id)).toEqual(["S1", "S2"]);
  });

  it("splits a long page into numbered parts of bounded size", () => {
    const paragraph = "word ".repeat(100).trim();
    const text = Array.from({ length: 10 }, () => paragraph).join("\n\n");
    const chunks = chunkUnits([{ locator: "p. 3", text }], 1000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.length <= 1000)).toBe(true);
    expect(chunks[0].locator).toBe(`p. 3 (1/${chunks.length})`);
  });

  it("hard-slices one giant unbroken paragraph", () => {
    const chunks = chunkUnits([{ locator: null, text: "x".repeat(5000) }], 1000);
    expect(chunks).toHaveLength(5);
    expect(chunks[0].locator).toBe("Part 1");
  });
});

describe("detectDirection", () => {
  it("detects Hebrew and Arabic as rtl", () => {
    expect(detectDirection("שלום עולם, זהו שיעור במדעים")).toBe("rtl");
    expect(detectDirection("مرحبا بكم في درس العلوم")).toBe("rtl");
  });

  it("treats English, and English with a few Hebrew words, as ltr", () => {
    expect(detectDirection("Photosynthesis happens in chloroplasts")).toBe("ltr");
    expect(detectDirection("The word shalom is שלום in Hebrew and is used by many English speakers")).toBe("ltr");
  });
});

describe("assertReadable", () => {
  it("rejects nearly empty text", () => {
    expect(() => assertReadable("hi there")).toThrow(/enough readable text/);
  });

  it("rejects text that is mostly symbols", () => {
    expect(() => assertReadable("%$#@!&*^".repeat(40))).toThrow(/readable lesson material/);
  });

  it("accepts ordinary prose", () => {
    expect(() => assertReadable("Plants turn light into chemical energy. ".repeat(5))).not.toThrow();
  });
});
