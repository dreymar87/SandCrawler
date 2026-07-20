import { describe, expect, it } from "vitest";
import { chipsBetween } from "./chipCosts";
import { isDroidSafeToSell } from "./cycleStrategy";
import {
  bestOwnedTier2,
  incomeAt,
  rankIncome,
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

describe("bestOwnedTier2", () => {
  it("returns the highest OWNED tier", () => {
    const cards = [
      card({ name: "MOUSE", tier: "GOLD" }),
      card({ name: "MOUSE", tier: "DIAMOND" }),
      card({ name: "MOUSE", tier: "RAINBOW", owned: false }), // not owned → ignored
    ];
    expect(bestOwnedTier2("MOUSE", cards)).toBe("DIAMOND");
  });

  it("returns null when unowned", () => {
    expect(bestOwnedTier2("MOUSE", [])).toBeNull();
  });
});

describe("rankIncome", () => {
  const cards = [
    card({ name: "MOUSE", tier: "GOLD", working: 1 }), // 4/s
    card({ name: "B-U4D", tier: "DEFAULT" }), // 58/s
  ];

  it("ranks owned droids by income desc within a class", () => {
    const ranked = rankIncome({ cards, cycle: 1, currentLevel: 0, includeAll: false });
    const worker = ranked.WORKER.map((r) => r.name);
    expect(worker).toEqual(["B-U4D", "MOUSE"]); // 58 > 4
    expect(ranked.WORKER[0]!.income).toBe(58n);
    expect(ranked.WORKER[1]!.tier).toBe("GOLD"); // MOUSE shown at best-owned tier
    expect(ranked.WORKER[1]!.working).toBe(1);
  });

  it("excludes unowned droids unless includeAll", () => {
    const ownedOnly = rankIncome({ cards, cycle: 1, currentLevel: 0, includeAll: false });
    const all = rankIncome({ cards, cycle: 1, currentLevel: 0, includeAll: true });
    expect(all.WORKER.length).toBeGreaterThan(ownedOnly.WORKER.length);
    // The whole-dex list surfaces high MYTHIC earners not owned here.
    const snow = all.WORKER.find((r) => r.name === "SNOW MOUSE");
    expect(snow).toBeTruthy();
    expect(snow!.owned).toBe(false);
    expect(snow!.tier).toBe("BESKAR"); // max flat-income tier (no GALACTIC data)
  });

  it("flags rebirth-needed droids consistent with isDroidSafeToSell", () => {
    const ranked = rankIncome({ cards, cycle: 1, currentLevel: 0, includeAll: true });
    for (const r of ranked.WORKER) {
      expect(r.needed).toBe(!isDroidSafeToSell(r.name, 1, 0));
    }
  });

  it("excludes ICONIC (%/s) from the flat ranking", () => {
    const all = rankIncome({ cards, cycle: 1, currentLevel: 0, includeAll: true });
    const iconic = [...all.WORKER, ...all.ASTROMECH, ...all.BATTLE].find((r) => r.name === "BB8");
    expect(iconic).toBeUndefined();
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
