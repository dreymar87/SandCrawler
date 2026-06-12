import { describe, expect, it } from "vitest";
import { normalizeTier, satisfies, tierGap, tierRank } from "./tiers";

describe("tierRank", () => {
  it("orders tiers low to high", () => {
    expect(tierRank("DEFAULT")).toBe(0);
    expect(tierRank("GOLD")).toBe(1);
    expect(tierRank("DIAMOND")).toBe(2);
    expect(tierRank("RAINBOW")).toBe(3);
    expect(tierRank("BESKAR")).toBe(4);
  });

  it("returns 0 for unknown values rather than throwing", () => {
    expect(tierRank("BOGUS")).toBe(0);
  });
});

describe("satisfies", () => {
  it("higher tiers cover lower-tier requirements", () => {
    expect(satisfies("DEFAULT", "GOLD")).toBe(true);
    expect(satisfies("DEFAULT", "BESKAR")).toBe(true);
    expect(satisfies("RAINBOW", "BESKAR")).toBe(true);
  });

  it("lower tiers do NOT cover higher-tier requirements", () => {
    expect(satisfies("GOLD", "DEFAULT")).toBe(false);
    expect(satisfies("BESKAR", "RAINBOW")).toBe(false);
  });

  it("equal tiers cover themselves", () => {
    expect(satisfies("DIAMOND", "DIAMOND")).toBe(true);
  });
});

describe("normalizeTier", () => {
  it("uppercases the prototype's Title-case", () => {
    expect(normalizeTier("Default")).toBe("DEFAULT");
    expect(normalizeTier("Gold")).toBe("GOLD");
    expect(normalizeTier("Beskar")).toBe("BESKAR");
  });

  it("maps community shorthand 'Basic' to DEFAULT", () => {
    expect(normalizeTier("Basic")).toBe("DEFAULT");
    expect(normalizeTier("basic")).toBe("DEFAULT");
  });

  it("falls back to DEFAULT for empty / unknown input", () => {
    expect(normalizeTier(undefined)).toBe("DEFAULT");
    expect(normalizeTier("")).toBe("DEFAULT");
    expect(normalizeTier("Mythril")).toBe("DEFAULT");
  });
});

describe("tierGap", () => {
  it("returns 0 when owned matches or exceeds required", () => {
    expect(tierGap("DEFAULT", "DEFAULT")).toBe(0);
    expect(tierGap("GOLD", "BESKAR")).toBe(0);
  });

  it("returns the tier-step distance when owned is lower", () => {
    expect(tierGap("GOLD", "DEFAULT")).toBe(1);
    expect(tierGap("BESKAR", "DEFAULT")).toBe(4);
  });

  it("returns max distance when the droid isn't owned at all", () => {
    expect(tierGap("DEFAULT", null)).toBe(5);
  });
});
