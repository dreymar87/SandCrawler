import { describe, expect, it } from "vitest";
import { cumulativeValue, efficientOrder, marginalGain } from "./upgradeValue";
import { measuredEffectFor, SCRAP_SWINGS_PER_SEC } from "../data/strategyTracks.seed";

const key = (l: { id: string; level: number }) => `${l.id}@${l.level}`;

describe("measured effects", () => {
  it("Credits adds 20% of base per level, additively", () => {
    const e = measuredEffectFor("core.credits")!;
    expect(e.gainAt(1)).toBeCloseTo(0.2);
    expect(e.gainAt(5)).toBeCloseTo(1.0); // L5 doubles your base rate
    expect(e.gainAt(25)).toBeCloseTo(5.0);
    expect(e.activeOnly).toBe(false);
  });

  it("Scrap Value is 0.5x base per swing per level, capped at one swing / 2s", () => {
    const e = measuredEffectFor("workshop.scrap-value")!;
    expect(SCRAP_SWINGS_PER_SEC).toBe(0.5);
    // L3 = 1.5x per swing, which at 0.5 swings/s is +0.75x base per second.
    expect(e.gainAt(3)).toBeCloseTo(0.75);
    expect(e.gainAt(1)).toBeCloseTo(0.25);
    expect(e.activeOnly).toBe(true);
  });
});

describe("marginalGain", () => {
  it("is the difference between consecutive levels", () => {
    expect(marginalGain("core.credits", 7, 1)).toBeCloseTo(0.2);
    expect(marginalGain("workshop.scrap-value", 4, 1)).toBeCloseTo(0.25);
  });

  it("scales active-only upgrades by swing uptime, and passive ones not at all", () => {
    expect(marginalGain("workshop.scrap-value", 1, 0.5)).toBeCloseTo(0.125);
    expect(marginalGain("workshop.scrap-value", 1, 0)).toBe(0);
    expect(marginalGain("core.credits", 1, 0)).toBeCloseTo(0.2); // passive, unaffected
  });

  it("returns null for upgrades with no measured effect", () => {
    expect(marginalGain("featured.critical-amount", 1, 1)).toBeNull();
  });
});

describe("efficientOrder", () => {
  it("leads with Credits L1-5 before any Scrap Value, even at perfect uptime", () => {
    const order = efficientOrder({ upgrades: [], swingUptime: 1, limit: 6 });
    expect(order.slice(0, 5).map(key)).toEqual([
      "core.credits@1",
      "core.credits@2",
      "core.credits@3",
      "core.credits@4",
      "core.credits@5",
    ]);
    // Scrap L1 slots in 6th — it interleaves, it doesn't lead.
    expect(key(order[5]!)).toBe("workshop.scrap-value@1");
  });

  it("interleaves Scrap L2 after Credits L11 at perfect uptime", () => {
    const order = efficientOrder({ upgrades: [], swingUptime: 1, limit: 13 });
    expect(key(order[11]!)).toBe("core.credits@11");
    expect(key(order[12]!)).toBe("workshop.scrap-value@2");
  });

  it("pushes Scrap Value later as swing uptime drops", () => {
    const rank = (uptime: number) =>
      efficientOrder({ upgrades: [], swingUptime: uptime, limit: 40 }).findIndex(
        (l) => l.id === "workshop.scrap-value",
      );
    const full = rank(1);
    const half = rank(0.5);
    const quarter = rank(0.25);
    expect(half).toBeGreaterThan(full);
    expect(quarter).toBeGreaterThan(half);
  });

  it("drops Scrap Value entirely when you never swing", () => {
    const order = efficientOrder({ upgrades: [], swingUptime: 0, limit: 40 });
    expect(order.some((l) => l.id === "workshop.scrap-value")).toBe(false);
    expect(order.every((l) => l.id === "core.credits")).toBe(true);
  });

  it("skips levels already owned", () => {
    const order = efficientOrder({
      upgrades: [{ id: "core.credits", level: 5 }],
      swingUptime: 1,
      limit: 3,
    });
    expect(order.some((l) => l.id === "core.credits" && l.level <= 5)).toBe(false);
    // With Credits L1-5 gone, Scrap L1 is now the best remaining buy.
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
