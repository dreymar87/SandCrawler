import { describe, expect, it } from "vitest";
import { cumulativeValue, efficientOrder, marginalGain } from "./upgradeValue";
import {
  measuredEffectFor,
  MEASURED_EFFECTS,
  SCRAP_SWINGS_PER_SEC,
  SCRAP_TIERS,
} from "../data/strategyTracks.seed";

const key = (l: { id: string; level: number }) => `${l.id}@${l.level}`;

describe("measured effects", () => {
  it("Credits adds 20% of base per level, additively", () => {
    const e = measuredEffectFor("core.credits")!;
    expect(e.gainAt(1)).toBeCloseTo(0.2);
    expect(e.gainAt(5)).toBeCloseTo(1.0); // L5 doubles your base rate
    expect(e.gainAt(25)).toBeCloseTo(5.0);
    expect(e.activeOnly).toBe(false);
  });

  // The shop states it: L3 pays "credits based on 1.5 SECONDS of base credit
  // generation" per swing. So it shares a currency with Credits after all.
  it("Scrap Value is seconds of your own generation per swing", () => {
    const e = measuredEffectFor("workshop.scrap-value")!;
    expect(SCRAP_SWINGS_PER_SEC).toBe(0.5);
    expect(e.unit).toBe("CREDIT_RATE");
    // L3 = 1.5s a swing; at one swing / 2s that's +0.75x your rate per second.
    expect(e.gainAt(3)).toBeCloseTo(0.75);
    expect(e.gainAt(1)).toBeCloseTo(0.25);
    expect(e.activeOnly).toBe(true);
    expect(e.whyNotRanked).toBeUndefined();
  });

  /**
   * Guards a correction, not a calculation.
   *
   * Scrap piles come in four tiers worth 1x/2x/4x/8x, which reads as a reason
   * to multiply this effect by an expected tier value. It isn't: the tiers take
   * 1/2/4/8 swings to empty, so the per-swing payout is flat and the rate is
   * unchanged. Any plausible tier mix sits between 1x and 8x, so if someone
   * folds one in this assertion fails and points them at MECHANICS.md §6.
   */
  it("is NOT multiplied by scrap pile tier", () => {
    const e = measuredEffectFor("workshop.scrap-value")!;
    const perLevel = e.gainAt(1);
    expect(perLevel).toBeCloseTo(0.5 * SCRAP_SWINGS_PER_SEC);
    for (const tierMultiple of SCRAP_TIERS.map((t) => t.swingsPerPile)) {
      if (tierMultiple === 1) continue;
      expect(perLevel).not.toBeCloseTo(0.5 * SCRAP_SWINGS_PER_SEC * tierMultiple);
    }
  });
});

describe("marginalGain", () => {
  it("is the difference between consecutive levels", () => {
    expect(marginalGain("core.credits", 7, 1)).toBeCloseTo(0.2);
  });

  it("returns null for anything not denominated in credits/s", () => {
    // Crits buy build time; chip scrap pays in chips; Jawa pays per sale.
    for (const id of [
      "featured.critical-chance",
      "workshop.upgrade-chip-scrap",
      "core.jawa-bartering",
    ]) {
      expect(marginalGain(id, 1, 1), id).toBeNull();
    }
  });

  it("scales the active-only Scrap Value by swing uptime", () => {
    expect(marginalGain("workshop.scrap-value", 1, 1)).toBeCloseTo(0.25);
    expect(marginalGain("workshop.scrap-value", 1, 0.5)).toBeCloseTo(0.125);
    expect(marginalGain("workshop.scrap-value", 1, 0)).toBe(0);
  });

  it("leaves passive upgrades unaffected by swing uptime", () => {
    expect(marginalGain("core.credits", 1, 0)).toBeCloseTo(0.2);
    expect(marginalGain("core.credits", 1, 1)).toBeCloseTo(0.2);
  });

  it("returns null for upgrades with no measured effect", () => {
    expect(marginalGain("featured.critical-amount", 1, 1)).toBeNull();
  });
});

describe("efficientOrder", () => {
  // Credits L1-5 are cheap enough to beat everything; Scrap L1 then slots in
  // ahead of Credits L6. It interleaves rather than leading.
  it("leads with Credits L1-5, then interleaves Scrap Value", () => {
    const order = efficientOrder({ upgrades: [], swingUptime: 1, limit: 7 });
    expect(order.slice(0, 5).map(key)).toEqual([
      "core.credits@1",
      "core.credits@2",
      "core.credits@3",
      "core.credits@4",
      "core.credits@5",
    ]);
    expect(key(order[5]!)).toBe("workshop.scrap-value@1");
    expect(key(order[6]!)).toBe("core.credits@6");
  });

  it("pushes Scrap Value later as swing uptime drops, and out entirely at zero", () => {
    const rank = (u: number) =>
      efficientOrder({ upgrades: [], swingUptime: u, limit: 40 }).findIndex(
        (l) => l.id === "workshop.scrap-value",
      );
    expect(rank(0.5)).toBeGreaterThan(rank(1));
    expect(rank(0)).toBe(-1);
  });

  it("skips levels already owned", () => {
    const order = efficientOrder({
      upgrades: [{ id: "core.credits", level: 5 }],
      swingUptime: 1,
      limit: 3,
    });
    expect(order.some((l) => l.id === "core.credits" && l.level <= 5)).toBe(false);
    // Credits L1-5 gone, so Scrap L1 is the best remaining buy.
    expect(key(order[0]!)).toBe("workshop.scrap-value@1");
  });

  it("is sorted by value per crystal, descending", () => {
    const order = efficientOrder({ upgrades: [], swingUptime: 1, limit: 25 });
    for (let i = 1; i < order.length; i++) {
      expect(order[i]!.valuePerCrystal).toBeLessThanOrEqual(order[i - 1]!.valuePerCrystal);
    }
  });

  it("cumulativeValue totals crystals and base multiple", () => {
    // Credits L1-5 costs 2+6+10+14+18 = 50 and yields +100% of base.
    const order = efficientOrder({ upgrades: [], swingUptime: 1, limit: 5 });
    const { crystals, gain } = cumulativeValue(order);
    expect(crystals).toBe(50);
    expect(gain).toBeCloseTo(1.0);
  });
});

describe("non-credit effects", () => {
  it("every non-credit effect explains why it can't be ranked", () => {
    for (const e of MEASURED_EFFECTS) {
      if (e.unit === "CREDIT_RATE") expect(e.whyNotRanked, e.id).toBeUndefined();
      else expect(e.whyNotRanked, e.id).toBeTruthy();
    }
  });

  it("records the shop's stated per-level effects", () => {
    // Straight from the in-game upgrade panels.
    expect(measuredEffectFor("featured.critical-chance")!.gainAt(1)).toBeCloseTo(0.05);
    expect(measuredEffectFor("featured.critical-chance")!.gainAt(2)).toBeCloseTo(0.10);
    expect(measuredEffectFor("featured.critical-amount")!.gainAt(1)).toBeCloseTo(0.10);
    expect(measuredEffectFor("workshop.crafting-speed")!.gainAt(2)).toBeCloseTo(0.2);
    expect(measuredEffectFor("core.jawa-bartering")!.gainAt(2)).toBeCloseTo(0.10);
  });

  it("keeps every non-credit upgrade out of the ranking", () => {
    const order = efficientOrder({ upgrades: [], swingUptime: 1, limit: 80 });
    const ranked = new Set(order.map((l) => l.id));
    for (const e of MEASURED_EFFECTS) {
      if (e.unit !== "CREDIT_RATE") expect(ranked.has(e.id), e.id).toBe(false);
    }
  });

  it("records Upgrade Chip Scrap as +5 chips per level, capping at +50", () => {
    const e = measuredEffectFor("workshop.upgrade-chip-scrap")!;
    expect(e.unit).toBe("CHIPS");
    expect(e.gainAt(1)).toBe(5);
    expect(e.gainAt(10)).toBe(50);
    expect(e.gainAt(11)).toBe(50); // capped, not extrapolated
  });

  it("keeps chip upgrades out of the credit ranking rather than inventing a rate", () => {
    const order = efficientOrder({ upgrades: [], swingUptime: 1, limit: 60 });
    expect(order.some((l) => l.id === "workshop.upgrade-chip-scrap")).toBe(false);
    expect(marginalGain("workshop.upgrade-chip-scrap", 1, 1)).toBeNull();
  });
});
