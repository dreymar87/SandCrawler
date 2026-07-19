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

const card = (
  name: string,
  tier: CollectionCard["tier"],
  working: number,
  lounge = 0,
): CollectionCard => ({ name, tier, owned: true, working, lounge, companion: 0 });

describe("computeProduction", () => {
  it("sums flat credits/sec across working cards", () => {
    const r = computeProduction(
      [card("MOUSE", "DEFAULT", 1), card("MOUSE", "GOLD", 1), card("GONK", "DEFAULT", 1)],
      stats,
    );
    expect(r.flat).toBe(10n); // 2 + 4 + 4
    expect(r.percentLabels).toEqual([]);
    expect(r.contributors).toBe(3);
  });

  it("multiplies income by the working count (duplicates)", () => {
    // 3 GOLD MOUSEs deployed = 3 × 4/s = 12/s
    const r = computeProduction([card("MOUSE", "GOLD", 3)], stats);
    expect(r.flat).toBe(12n);
    expect(r.contributors).toBe(3);
  });

  it("Lounge droids don't produce credits", () => {
    // 5 in Lounge, 0 working → 0/s. And they're still rebirth-eligible elsewhere.
    const r = computeProduction([card("MOUSE", "GOLD", 0, 5)], stats);
    expect(r.flat).toBe(0n);
    expect(r.contributors).toBe(0);
  });

  it("skips cards with 0 working (owned-only stays quiet)", () => {
    const r = computeProduction(
      [
        { name: "MOUSE", tier: "DEFAULT", owned: true, working: 0, lounge: 0, companion: 0 },
        card("GONK", "DEFAULT", 1),
      ],
      stats,
    );
    expect(r.flat).toBe(4n);
    expect(r.contributors).toBe(1);
  });

  it("percentage boosters surface once per working copy", () => {
    // 2 BB8s working = "5%/s" listed twice; MOUSE's 2/s adds normally.
    const r = computeProduction([card("BB8", "DEFAULT", 2), card("MOUSE", "DEFAULT", 1)], stats);
    expect(r.flat).toBe(2n);
    expect(r.percentLabels).toEqual(["5%/s", "5%/s"]);
  });

  it("ignores cards whose stats aren't in the table", () => {
    const r = computeProduction([card("UNKNOWN-DROID", "DEFAULT", 1)], stats);
    expect(r.flat).toBe(0n);
    expect(r.contributors).toBe(0);
  });
});
