import { describe, expect, it } from "vitest";
import { verifyCitations } from "./citations.js";

const chunks = [
  { id: "S1", locator: "p. 1", text: "Plants turn **light** into chemical energy\nin the chloroplasts." },
  { id: "S2", locator: "p. 2", text: "The outputs are glucose and oxygen." },
];

describe("verifyCitations", () => {
  it("keeps a real quote, ignoring case, markdown and line breaks", () => {
    const [c] = verifyCitations([{ chunkId: "S1", quote: "turn light into chemical energy in the chloroplasts" }], chunks);
    expect(c).toEqual({ chunkId: "S1", quote: "turn light into chemical energy in the chloroplasts" });
  });

  it("drops a quote the model made up but keeps the passage", () => {
    expect(verifyCitations([{ chunkId: "S2", quote: "outputs are sugar and helium" }], chunks)).toEqual([
      { chunkId: "S2", quote: null },
    ]);
  });

  it("drops passages that were never provided", () => {
    expect(verifyCitations([{ chunkId: "S9", quote: "x" }], chunks)).toEqual([]);
  });

  it("removes duplicates and caps the list at three", () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: `S${i}`, locator: "", text: "t" }));
    const cites = [{ chunkId: "S0" }, { chunkId: "S0" }, ...many.slice(1).map((c) => ({ chunkId: c.id }))];
    expect(verifyCitations(cites, many).map((c) => c.chunkId)).toEqual(["S0", "S1", "S2"]);
  });
});
