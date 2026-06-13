import { describe, expect, it } from "vitest";
import type { CollectionCard, DroidStats } from "../types";
import { computeProduction } from "./production";

const stats: DroidStats = {
  MOUSE: {
    DEFAULT: { cost: "950", income: "2/s", value: "665" },
    GOLD: { cost: "3.8k", income: "4/s", value: "2.66k" },
  },
  GONK: {
    DEFAULT: { cost: "3k", income: "4/s", value: "2.10k" },
  },
  BB8: {
    DEFAULT: { cost: null, income: "5%/s", value: null },
  },
};

describe("computeProduction", () => {
  it("sums flat credits/sec across active cards", () => {
    const cards: CollectionCard[] = [
      { name: "MOUSE", tier: "DEFAULT", owned: true, active: true },
      { name: "MOUSE", tier: "GOLD", owned: true, active: true },
      { name: "GONK", tier: "DEFAULT", owned: true, active: true },
    ];
    const r = computeProduction(cards, stats);
    expect(r.flat).toBe(10n); // 2 + 4 + 4
    expect(r.percentLabels).toEqual([]);
    expect(r.contributors).toBe(3);
  });

  it("skips inactive cards", () => {
    const cards: CollectionCard[] = [
      { name: "MOUSE", tier: "DEFAULT", owned: true, active: false },
      { name: "GONK", tier: "DEFAULT", owned: true, active: true },
    ];
    const r = computeProduction(cards, stats);
    expect(r.flat).toBe(4n);
    expect(r.contributors).toBe(1);
  });

  it("collects percentage incomes separately (MYTHIC boosters multiply, don't add)", () => {
    const cards: CollectionCard[] = [
      { name: "BB8", tier: "DEFAULT", owned: true, active: true },
      { name: "MOUSE", tier: "DEFAULT", owned: true, active: true },
    ];
    const r = computeProduction(cards, stats);
    expect(r.flat).toBe(2n);
    expect(r.percentLabels).toEqual(["5%/s"]);
  });

  it("ignores cards whose stats aren't in the table", () => {
    const cards: CollectionCard[] = [
      { name: "UNKNOWN-DROID", tier: "DEFAULT", owned: true, active: true },
    ];
    const r = computeProduction(cards, stats);
    expect(r.flat).toBe(0n);
    expect(r.contributors).toBe(0);
  });
});
