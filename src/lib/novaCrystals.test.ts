import { describe, expect, it } from "vitest";
import type { NovaUpgrade, NovaUpgradeState } from "../types";
import { NOVA_UPGRADES } from "../data/novaShop.seed";
import {
  computeBalance,
  crystalsSpent,
  earnedForAvailable,
  iconicCostFor,
  nextLevelCost,
  srbBonusAt,
} from "./novaCrystals";

describe("srbBonusAt", () => {
  it("returns null below RB12 (no SRB bonus is granted)", () => {
    expect(srbBonusAt(0)).toBe(null);
    expect(srbBonusAt(11)).toBe(null);
  });

  it("returns the workbook's bonus row for RB12", () => {
    expect(srbBonusAt(12)).toEqual({ rbLevel: 12, crystals: 11, creditMult: 0.22, xpMult: 1.1 });
  });

  it("returns the workbook's bonus rows through RB27", () => {
    expect(srbBonusAt(23)).toEqual({ rbLevel: 23, crystals: 121, creditMult: 2.42, xpMult: 12.1 });
    expect(srbBonusAt(24)).toEqual({ rbLevel: 24, crystals: 137, creditMult: 2.74, xpMult: 13.7 });
    expect(srbBonusAt(27)).toEqual({ rbLevel: 27, crystals: 191, creditMult: 3.82, xpMult: 19.1 });
  });

  it("returns null above RB27 (no data)", () => {
    expect(srbBonusAt(28)).toBe(null);
  });
});

describe("iconicCostFor", () => {
  it("returns 30 crystals for the standard ICONIC droids", () => {
    expect(iconicCostFor("BB8")).toBe(30);
    expect(iconicCostFor("MISTER BONES")).toBe(30);
    expect(iconicCostFor("IG-11 MARSHAL")).toBe(30);
    expect(iconicCostFor("DJ-R3X")).toBe(30);
  });

  it("returns 75 crystals for CB-23", () => {
    expect(iconicCostFor("CB-23")).toBe(75);
  });

  it("is case-insensitive and whitespace-tolerant", () => {
    expect(iconicCostFor("  bb8 ")).toBe(30);
    expect(iconicCostFor("cb-23")).toBe(75);
  });

  it("returns null for non-ICONIC names", () => {
    expect(iconicCostFor("MOUSE")).toBe(null);
    expect(iconicCostFor("")).toBe(null);
  });
});

describe("crystalsSpent", () => {
  const upgrades: NovaUpgrade[] = [
    { id: "core.credits", tree: "CORE", name: "Credits", costs: [2, 6, 10, 14] },
    {
      id: "core.pickaxe-mastery",
      tree: "CORE",
      name: "Pickaxe Mastery",
      costs: [5, 10, 15, null, 20, 25, 30, null, null, null, null],
    },
  ];

  it("sums the costs you paid to reach each upgrade's current level", () => {
    const states: NovaUpgradeState[] = [
      { id: "core.credits", level: 3 }, // 2 + 6 + 10 = 18
    ];
    expect(crystalsSpent(states, upgrades)).toBe(18);
  });

  it("treats unknown-cost levels as 0 contribution", () => {
    // Pickaxe Mastery L4 has unknown cost (null) — skip without crashing.
    expect(crystalsSpent([{ id: "core.pickaxe-mastery", level: 7 }], upgrades)).toBe(
      5 + 10 + 15 + 0 + 20 + 25 + 30,
    );
  });

  it("adds ICONIC purchase costs when provided", () => {
    expect(
      crystalsSpent(
        [{ id: "core.credits", level: 1 }], // 2
        upgrades,
        ["BB8", "CB-23"], // 30 + 75
      ),
    ).toBe(2 + 30 + 75);
  });

  it("ignores unknown upgrade ids and unknown ICONIC names", () => {
    expect(crystalsSpent([{ id: "ghost", level: 5 }], upgrades, ["GHOST DROID"])).toBe(0);
  });
});

describe("nextLevelCost", () => {
  const def: NovaUpgrade = {
    id: "x",
    tree: "CORE",
    name: "X",
    costs: [5, 10, null, 20],
  };

  it("returns a known cost when the next level's price is published", () => {
    expect(nextLevelCost(def, 0)).toEqual({ kind: "known", cost: 5 });
    expect(nextLevelCost(def, 3)).toEqual({ kind: "known", cost: 20 });
  });

  it("returns 'unknown' when the level exists but the cost isn't published", () => {
    expect(nextLevelCost(def, 2)).toEqual({ kind: "unknown" });
  });

  it("returns 'max' once the player is past every known level", () => {
    expect(nextLevelCost(def, 4)).toEqual({ kind: "max" });
  });
});

describe("computeBalance", () => {
  it("subtracts spent from earned", () => {
    expect(computeBalance(100, 30)).toEqual({ earned: 100, spent: 30, balance: 70 });
  });
});

describe("earnedForAvailable", () => {
  it("returns the available amount when nothing is spent", () => {
    expect(earnedForAvailable(500, [], [])).toBe(500);
  });

  it("adds computed spent so balance back-computes to available", () => {
    // core.max-health costs [1,6,13,...]; level 2 spends 1 + 6 = 7.
    const states: NovaUpgradeState[] = [{ id: "core.max-health", level: 2 }];
    const earned = earnedForAvailable(500, states, []);
    // balance = earned - spent must equal the available we asked for.
    expect(earned - crystalsSpentFromSeed(states)).toBe(500);
    expect(earned).toBe(507);
  });
});

/** Helper mirroring the module's spent computation against the real seed. */
function crystalsSpentFromSeed(states: NovaUpgradeState[]): number {
  // Re-import through crystalsSpent + the real NOVA_UPGRADES seed.
  return crystalsSpent(states, NOVA_UPGRADES);
}
