import { describe, expect, it } from "vitest";
import { chipsBetween } from "./chipCosts";
import { isDroidSafeToSell } from "./cycleStrategy";
import {
  deployedByClass,
  dexLeaderboard,
  incomeAt,
  upgradePayoffs,
} from "./incomeStrategy";
import type { CollectionCard } from "../types";

function card(partial: Partial<CollectionCard> & Pick<CollectionCard, "name" | "tier">): CollectionCard {
  return { owned: true, working: 0, lounge: 0, companion: 0, ...partial };
}

describe("incomeAt", () => {
  it("parses flat per-tier income", () => {
    expect(incomeAt("MOUSE", "DEFAULT")).toBe(2n);
    expect(incomeAt("MOUSE", "GOLD")).toBe(4n);
    expect(incomeAt("MOUSE", "DIAMOND")).toBe(8n);
  });

  it("returns null for %/s boosters (ICONIC)", () => {
    expect(incomeAt("BB8", "DEFAULT")).toBeNull();
  });

  it("returns null for a tier with no stats (MYTHIC lack GALACTIC)", () => {
    expect(incomeAt("SNOW MOUSE", "GALACTIC")).toBeNull();
  });
});

describe("deployedByClass", () => {
  it("ignores Droidex-owned droids that aren't actually deployed", () => {
    const cards = [card({ name: "MOUSE", tier: "GOLD", owned: true })]; // owned only, 0 deployed
    const r = deployedByClass({ cards, cycle: 1, currentLevel: 0, rebirthLevel: 17 });
    expect(r.WORKER).toHaveLength(0);
    expect(r.ASTROMECH).toHaveLength(0);
    expect(r.BATTLE).toHaveLength(0);
  });

  it("lists active droids under their class, ranked by income, with slot counts", () => {
    const cards = [
      card({ name: "MOUSE", tier: "GOLD", working: 2 }), // 4/s
      card({ name: "GROUNDMECH", tier: "GOLD", lounge: 1 }), // 240/s
    ];
    const r = deployedByClass({ cards, cycle: 1, currentLevel: 0, rebirthLevel: 17 });
    expect(r.WORKER.map((x) => x.name)).toEqual(["GROUNDMECH", "MOUSE"]); // 240 > 4
    const mouse = r.WORKER.find((x) => x.name === "MOUSE")!;
    expect(mouse.working).toBe(2);
    expect(mouse.income).toBe(4n);
    expect(r.WORKER.find((x) => x.name === "GROUNDMECH")!.lounge).toBe(1);
  });

  it("flags a lounge droid that would fill a free working slot", () => {
    const cards = [
      card({ name: "MOUSE", tier: "GOLD", working: 1 }),
      card({ name: "GROUNDMECH", tier: "GOLD", lounge: 1 }), // 240/s, WORKER has free slots
    ];
    const r = deployedByClass({ cards, cycle: 1, currentLevel: 0, rebirthLevel: 17 });
    expect(r.WORKER.find((x) => x.name === "GROUNDMECH")!.moveHint).toEqual({
      gain: 240n,
      swapWith: null,
    });
    expect(r.WORKER.find((x) => x.name === "MOUSE")!.moveHint).toBeNull();
  });

  it("suggests swapping out the weakest worker when the class is full", () => {
    const cards = [
      card({ name: "IMPERIAL PROBE", tier: "DEFAULT", working: 1 }), // 6/s
      card({ name: "B1 BATTLE", tier: "DEFAULT", working: 1 }), // 5/s (weakest)
      card({ name: "B1 SECURITY", tier: "DEFAULT", lounge: 1 }), // 66/s
    ];
    // BATTLE capacity at RB0 = 2 → full with the two workers.
    const r = deployedByClass({ cards, cycle: 1, currentLevel: 0, rebirthLevel: 0 });
    expect(r.BATTLE.find((x) => x.name === "B1 SECURITY")!.moveHint).toEqual({
      gain: 61n, // 66 − 5
      swapWith: "B1 BATTLE",
    });
  });

  it("gives no move hint when full and the lounge droid can't beat the weakest worker", () => {
    const cards = [
      card({ name: "B1 SECURITY", tier: "DEFAULT", working: 2 }), // fills BATTLE cap 2, 66/s
      card({ name: "IMPERIAL PROBE", tier: "DEFAULT", lounge: 1 }), // 6/s < 66
    ];
    const r = deployedByClass({ cards, cycle: 1, currentLevel: 0, rebirthLevel: 0 });
    expect(r.BATTLE.find((x) => x.name === "IMPERIAL PROBE")!.moveHint).toBeNull();
  });

  it("flags rebirth-needed droids consistent with isDroidSafeToSell", () => {
    const cards = [card({ name: "MOUSE", tier: "GOLD", working: 1 })];
    const r = deployedByClass({ cards, cycle: 1, currentLevel: 0, rebirthLevel: 17 });
    const mouse = r.WORKER.find((x) => x.name === "MOUSE")!;
    expect(mouse.needed).toBe(!isDroidSafeToSell("MOUSE", 1, 0));
  });
});

describe("dexLeaderboard", () => {
  it("ranks by income desc, flags active droids, excludes ICONIC", () => {
    const cards = [card({ name: "MOUSE", tier: "GOLD", working: 1 })];
    const lb = dexLeaderboard({ cards, cycle: 1, currentLevel: 0 });
    for (let i = 1; i < lb.length; i++) {
      expect(lb[i - 1]!.income >= lb[i]!.income).toBe(true);
    }
    expect(lb.find((e) => e.name === "MOUSE")!.active).toBe(true);
    expect(lb.find((e) => e.name === "SNOW MOUSE")!.active).toBe(false);
    expect(lb.find((e) => e.name === "BB8")).toBeUndefined(); // %/s booster excluded
  });
});

describe("upgradePayoffs", () => {
  it("computes per-copy and total gain + chip cost for working droids", () => {
    const cards = [card({ name: "MOUSE", tier: "GOLD", working: 2 })];
    const payoffs = upgradePayoffs({ cards, cycle: 1, currentLevel: 0 });
    const mouse = payoffs.find((p) => p.name === "MOUSE");
    expect(mouse).toBeTruthy();
    expect(mouse!.nextTier).toBe("DIAMOND");
    expect(mouse!.perCopyGain).toBe(4n); // 8 − 4
    expect(mouse!.totalGain).toBe(8n); // × 2 working
    expect(mouse!.chips).toBe(chipsBetween("COMMON", "GOLD", "DIAMOND"));
  });

  it("skips non-working, max-tier, and booster droids", () => {
    const cards = [
      card({ name: "MOUSE", tier: "GALACTIC", working: 1 }), // max tier → no next
      card({ name: "B-U4D", tier: "DEFAULT", working: 0 }), // not working
      card({ name: "BB8", tier: "DEFAULT", working: 1 }), // %/s booster
    ];
    expect(upgradePayoffs({ cards, cycle: 1, currentLevel: 0 })).toEqual([]);
  });
});
