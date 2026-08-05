import { describe, expect, it } from "vitest";
import { cumulativeValue, efficientOrder, marginalGain } from "./upgradeValue";
import {
  measuredEffectFor,
  MEASURED_EFFECTS,
  SCRAP_SWINGS_PER_SEC,
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

  // Scrap Value multiplies the SCRAP PILE's value, not your droid income. A
  // player at L3 reported 1.80M a swing against 46.9K/s of droids — the swing
  // base is ~26x their per-second rate, so the two have no common currency.
  it("Scrap Value is a scrap-pile multiplier, not a share of droid income", () => {
    const e = measuredEffectFor("workshop.scrap-value")!;
    expect(SCRAP_SWINGS_PER_SEC).toBe(0.5);
    expect(e.unit).toBe("SCRAP_SWING");
    expect(e.gainAt(3)).toBeCloseTo(1.5); // the multiplier the game displays
    expect(e.gainAt(1)).toBeCloseTo(0.5);
    expect(e.activeOnly).toBe(true);
    expect(e.whyNotRanked).toBeTruthy();
  });
});

describe("marginalGain", () => {
  it("is the difference between consecutive levels", () => {
    expect(marginalGain("core.credits", 7, 1)).toBeCloseTo(0.2);
  });

  it("returns null for anything not denominated in credits/s", () => {
    // Scrap Value, the crit pair and chips all measure different things.
    for (const id of [
      "workshop.scrap-value",
      "featured.critical-chance",
      "workshop.upgrade-chip-scrap",
    ]) {
      expect(marginalGain(id, 1, 1), id).toBeNull();
    }
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
  // Only Credits is currently denominated in credits/s, so it is the whole
  // ranking. Everything else is measured but in an incompatible unit — the
  // section is honest about being thin rather than padded with wrong maths.
  it("ranks only the credit-denominated upgrades", () => {
    const order = efficientOrder({ upgrades: [], swingUptime: 1, limit: 40 });
    expect(order.length).toBeGreaterThan(0);
    expect(order.every((l) => l.id === "core.credits")).toBe(true);
    expect(order.slice(0, 3).map(key)).toEqual([
      "core.credits@1",
      "core.credits@2",
      "core.credits@3",
    ]);
  });

  it("skips levels already owned", () => {
    const order = efficientOrder({
      upgrades: [{ id: "core.credits", level: 5 }],
      swingUptime: 1,
      limit: 3,
    });
    expect(order.some((l) => l.level <= 5)).toBe(false);
    expect(key(order[0]!)).toBe("core.credits@6");
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
