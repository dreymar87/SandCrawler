import { describe, expect, it } from "vitest";
import {
  SCRAP_SWINGS_PER_SEC,
  SCRAP_TIERS,
  scrapSwingSeconds,
} from "../data/strategyTracks.seed";
import {
  creditsPerSecFromPile,
  perSwingMultiple,
  reconcileRate,
  scrapIncome,
} from "./scrapRate";

describe("creditsPerSecFromPile", () => {
  /**
   * A pile pays once, and the payout is a pure function of tier and your
   * generation — so the four tier readings a player gave at Scrap Value L3
   * (5M / 10M / 20M / 40M) must all invert to the same rate.
   *
   * Note this is about the PAYOUT ladder, which is well measured. How many
   * swings each tier costs is a separate, much weaker measurement, and it is
   * deliberately not part of this calculation.
   */
  it("derives one rate from all four of the tiers", () => {
    const readings = [
      { tier: "COMMON" as const, pileValue: "5M" },
      { tier: "GOLD" as const, pileValue: "10M" },
      { tier: "DIAMOND" as const, pileValue: "20M" },
      { tier: "RAINBOW" as const, pileValue: "40M" },
    ];
    const rates = readings.map((r) => creditsPerSecFromPile({ ...r, scrapValueLevel: 3 }));

    // 5,000,000 credits over 1.5 seconds of generation.
    const expected = 5_000_000 / scrapSwingSeconds(3);
    for (const rate of rates) expect(rate).toBeCloseTo(expected, 3);
  });

  it("scales with Scrap Value level, since a pile pays more seconds", () => {
    const at = (level: number) =>
      creditsPerSecFromPile({ pileValue: "5M", tier: "COMMON", scrapValueLevel: level })!;
    // Twice the seconds per pile means the same payout implies half the rate.
    expect(at(6)).toBeCloseTo(at(3) / 2, 3);
  });

  it("returns null rather than a wrong number on unusable input", () => {
    expect(
      creditsPerSecFromPile({ pileValue: "", tier: "COMMON", scrapValueLevel: 3 }),
    ).toBeNull();
    expect(
      creditsPerSecFromPile({ pileValue: "not credits", tier: "COMMON", scrapValueLevel: 3 }),
    ).toBeNull();
    // Scrap Value L0 means no scrap station income at all — nothing to invert.
    expect(
      creditsPerSecFromPile({ pileValue: "5M", tier: "COMMON", scrapValueLevel: 0 }),
    ).toBeNull();
  });
});

describe("scrapIncome", () => {
  const share = (scrapValueLevel: number, swingUptime: number) =>
    scrapIncome({ creditsPerSec: 1_000, scrapValueLevel, swingUptime }).scrapShare;

  // Derived from the same constants the code uses — a hardcoded 0.43 goes
  // stale the moment SCRAP_SWINGS_PER_SEC moves.
  const expectedShare = (level: number, uptime: number) => {
    const lev = scrapSwingSeconds(level) * SCRAP_SWINGS_PER_SEC * uptime;
    return lev / (1 + lev);
  };

  it("splits income by Scrap Value level and swing uptime", () => {
    expect(share(3, 1)).toBeCloseTo(expectedShare(3, 1), 6);
    expect(share(3, 0.5)).toBeCloseTo(expectedShare(3, 0.5), 6);
    expect(share(19, 1)).toBeCloseTo(expectedShare(19, 1), 6);
  });

  it("cannot reach the 95% that was once claimed", () => {
    // The share is bounded by Scrap Value's own ladder. A maxed L19 player
    // swinging non-stop tops out well short of 95%, which is how we know the
    // original 900K/s-vs-46.9K/s pair was comparing different units.
    expect(share(19, 1)).toBeLessThan(0.95);
    expect(share(19, 1)).toBeGreaterThan(0.8);
  });

  it("reports droid leverage — what one extra credit/s of droids is worth", () => {
    const income = scrapIncome({ creditsPerSec: 1_000, scrapValueLevel: 3, swingUptime: 1 });
    expect(income.droidLeverage).toBeCloseTo(income.total / income.droids, 6);
    expect(income.droidLeverage).toBeGreaterThan(1);
  });

  it("collapses to droids alone when you never swing", () => {
    const income = scrapIncome({ creditsPerSec: 1_000, scrapValueLevel: 19, swingUptime: 0 });
    expect(income.scrap).toBe(0);
    expect(income.total).toBe(1_000);
    expect(income.droidLeverage).toBe(1);
  });
});

describe("SCRAP_TIERS", () => {
  it("doubles the payout per tier", () => {
    expect(SCRAP_TIERS.map((t) => t.payoutMultiple)).toEqual([1, 2, 4, 8]);
  });
});

describe("perSwingMultiple", () => {
  /**
   * The finding that overturned the first version of this model. Payout climbs
   * 8x from common to rainbow, but swings to break only climb to "2 or 3,
   * usually" at pickaxe 10-11 — so tier really does raise your rate, and a
   * rainbow pile is worth walking to.
   */
  it("makes rainbow worth several common swings", () => {
    expect(perSwingMultiple("COMMON")).toBeCloseTo(1, 6);
    expect(perSwingMultiple("RAINBOW")).toBeGreaterThan(2.5);
  });

  it("takes an observed swing count over the seeded one", () => {
    // A better pickaxe breaks it faster, so the tier is worth more to you.
    expect(perSwingMultiple("RAINBOW", 2)).toBeCloseTo(4, 6);
    expect(perSwingMultiple("RAINBOW", 8)).toBeCloseTo(1, 6);
  });

  it("says nothing where nobody has counted swings", () => {
    // Gold and diamond are unmeasured — a guess here would silently reprice
    // Scrap Value, so they return null instead.
    expect(perSwingMultiple("GOLD")).toBeNull();
    expect(perSwingMultiple("DIAMOND")).toBeNull();
  });
});

describe("reconcileRate", () => {
  it("agrees when the two estimates are within an order of magnitude", () => {
    expect(reconcileRate(1_000, 900)?.agrees).toBe(true);
  });

  it("disagrees on the kind of gap a stale roster produces", () => {
    const out = reconcileRate(3_330_000, 130_000)!;
    expect(out.agrees).toBe(false);
    expect(out.ratio).toBeCloseTo(25.6, 1);
  });

  it("has nothing to say without both figures", () => {
    expect(reconcileRate(0, 100)).toBeNull();
    expect(reconcileRate(100, 0)).toBeNull();
  });
});
