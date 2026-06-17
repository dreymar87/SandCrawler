import { describe, expect, it } from "vitest";
import type { NovaUpgrade, NovaUpgradeState } from "../types";
import {
  computeBalance,
  crystalsEarnedThrough,
  crystalsSpent,
  nextLevelCost,
} from "./novaCrystals";

describe("crystalsEarnedThrough", () => {
  it("returns 0 before crystal rewards start (RB12)", () => {
    expect(crystalsEarnedThrough(0)).toBe(0);
    expect(crystalsEarnedThrough(11)).toBe(0);
  });

  it("matches the workbook's per-level values", () => {
    // RB12 = 11 crystals (first rebirth that grants any)
    expect(crystalsEarnedThrough(12)).toBe(11);
    // RB13 = 11 + 16 = 27
    expect(crystalsEarnedThrough(13)).toBe(27);
  });

  it("totals to 11+16+22+29+37+46+56+67+79+92+106+121 = 682 at RB23", () => {
    expect(crystalsEarnedThrough(23)).toBe(682);
  });

  it("caps above the max rebirth (no additional crystals)", () => {
    expect(crystalsEarnedThrough(50)).toBe(682);
  });
});

describe("crystalsSpent", () => {
  const upgrades: NovaUpgrade[] = [
    { id: "core.credits", tree: "CORE", name: "Credits", costs: [2, 6, 10, 14] },
    { id: "core.movement-speed", tree: "CORE", name: "Speed", costs: [1, 2, 4] },
  ];

  it("sums the costs you paid to reach each upgrade's current level", () => {
    const states: NovaUpgradeState[] = [
      { id: "core.credits", level: 3 }, // 2 + 6 + 10 = 18
      { id: "core.movement-speed", level: 1 }, // 1
    ];
    expect(crystalsSpent(states, upgrades)).toBe(19);
  });

  it("ignores states for unknown upgrade ids", () => {
    expect(crystalsSpent([{ id: "ghost", level: 5 }], upgrades)).toBe(0);
  });

  it("caps at the upgrade's known cost length", () => {
    expect(crystalsSpent([{ id: "core.credits", level: 10 }], upgrades)).toBe(2 + 6 + 10 + 14);
  });
});

describe("nextLevelCost", () => {
  const def: NovaUpgrade = { id: "x", tree: "CORE", name: "X", costs: [2, 6, 10] };

  it("returns the cost of going from current level to the next", () => {
    expect(nextLevelCost(def, 0)).toBe(2);
    expect(nextLevelCost(def, 2)).toBe(10);
  });

  it("returns null when there's no further known level", () => {
    expect(nextLevelCost(def, 3)).toBe(null);
  });
});

describe("computeBalance", () => {
  it("subtracts spent from earned", () => {
    expect(computeBalance(100, 30)).toEqual({ earned: 100, spent: 30, balance: 70 });
  });
});
