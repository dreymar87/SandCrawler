import { describe, expect, it } from "vitest";
import { normalizeName } from "./normalize";

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Mouse  ")).toBe("mouse");
  });

  it("collapses punctuation so dashes/spaces don't break matching", () => {
    // Semantic aliases like WLKR<->Walker are dictionary aliases, NOT this
    // function's job. normalizeName only smooths over punctuation+case so
    // "B2-RP" and "B2 RP" hash to the same key.
    expect(normalizeName("B2-RP")).toBe(normalizeName("B2 RP"));
    expect(normalizeName("DRK-1")).toBe(normalizeName("DRK 1"));
    expect(normalizeName("MONO-WLKR")).toBe(normalizeName("Mono Wlkr"));
  });

  it("collapses internal whitespace runs", () => {
    expect(normalizeName("B1   Security")).toBe("b1 security");
  });

  it("handles empty / nullish input", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName(undefined as unknown as string)).toBe("");
  });
});
