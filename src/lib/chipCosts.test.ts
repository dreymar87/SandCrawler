import { describe, expect, it } from "vitest";
import { chipsBetween, chipsFromDefaultTo, formatChipCost } from "./chipCosts";

describe("chipsFromDefaultTo", () => {
  it("sums per-rarity upgrade steps to hit the target tier", () => {
    // COMMON: 10 + 25 = 35 to reach DIAMOND
    expect(chipsFromDefaultTo("COMMON", "DIAMOND")).toBe(35);
    // MYTHIC full path to BESKAR = 8000 + 15000 + 40000 + 80000
    expect(chipsFromDefaultTo("MYTHIC", "BESKAR")).toBe(143_000);
    // LEGENDARY DEFAULT → GOLD
    expect(chipsFromDefaultTo("LEGENDARY", "GOLD")).toBe(400);
  });

  it("returns 0 when target = DEFAULT (nothing to upgrade)", () => {
    expect(chipsFromDefaultTo("COMMON", "DEFAULT")).toBe(0);
    expect(chipsFromDefaultTo("MYTHIC", "DEFAULT")).toBe(0);
  });

  it("returns null when no chip path exists", () => {
    // ICONIC droids don't upgrade at all
    expect(chipsFromDefaultTo("ICONIC", "GOLD")).toBe(null);
    // FLAWLESS is a drop-only variant
    expect(chipsFromDefaultTo("COMMON", "FLAWLESS")).toBe(null);
    // Unknown rarity has no seed row
    expect(chipsFromDefaultTo(undefined, "GOLD")).toBe(null);
  });
});

describe("chipsBetween", () => {
  it("sums only the transitions from `from` to `to`", () => {
    // RARE GOLD → BESKAR = 60 + 100 + 250 = 410
    expect(chipsBetween("RARE", "GOLD", "BESKAR")).toBe(410);
  });

  it("returns 0 when to <= from", () => {
    expect(chipsBetween("EPIC", "DIAMOND", "GOLD")).toBe(0);
    expect(chipsBetween("EPIC", "DIAMOND", "DIAMOND")).toBe(0);
  });
});

describe("formatChipCost", () => {
  it("uses thousands separators", () => {
    expect(formatChipCost(143_000)).toBe("143,000");
    expect(formatChipCost(0)).toBe("0");
  });

  it("returns em dash for null", () => {
    expect(formatChipCost(null)).toBe("—");
  });
});
