import { describe, expect, it } from "vitest";
import {
  bestSrStop,
  cumulativeCreditsTo,
  HIGHEST_SAMPLED_LEVEL,
  OBSERVED_MULTIPLIER_STEP,
  PROJECTION_WARN_LEVELS,
  srTimingTable,
} from "./srTiming";
import { observedMultiplierStep } from "../data/rebirthMultipliers.seed";
import { parseCredits } from "./credits";

const M = 1_000_000n;
const B = 1_000_000_000n;

const table = (creditsPerSec: bigint, setupHours: number) =>
  srTimingTable({ cycle: 1, creditsPerSec, setupHours });

const at = (rows: ReturnType<typeof table>, level: number) =>
  rows.find((r) => r.level === level)!;

describe("cumulativeCreditsTo", () => {
  it("sums every rebirth cost on the way up, not just the last one", () => {
    // Cycle 1: RB1 10K + RB2 150K + RB3 975K.
    expect(cumulativeCreditsTo(1, 3)).toBe(
      parseCredits("10K") + parseCredits("150K") + parseCredits("975K"),
    );
  });

  it("is monotonic across the whole cycle", () => {
    let prev = 0n;
    for (let lvl = 1; lvl <= 30; lvl++) {
      const cur = cumulativeCreditsTo(1, lvl);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });
});

describe("srTimingTable", () => {
  it("only offers SR-eligible levels (RB12+)", () => {
    const rows = table(100n * M, 1);
    expect(rows[0]!.level).toBe(12);
    expect(rows.every((r) => r.level >= 12)).toBe(true);
  });

  it("crystal efficiency falls at every single step", () => {
    const rows = table(100n * M, 1);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.crystalsPerT).toBeLessThan(rows[i - 1]!.crystalsPerT);
    }
  });

  // The headline finding: RB20 costs 2T for +12 crystals where RB19 costs
  // 810B for +11. Quoted in STRATEGY.md — pinned here so a sheet refresh
  // that moves the credit costs fails loudly instead of invalidating the prose.
  it("marginal return: RB19→20 is ~6.0 crystals per 1T, RB18→19 ~13.6", () => {
    const rows = table(100n * M, 1);
    expect(at(rows, 20).marginal!.crystalsPerT).toBeCloseTo(6.0, 1);
    expect(at(rows, 19).marginal!.crystalsPerT).toBeCloseTo(13.58, 1);
    expect(at(rows, 18).marginal!.crystalsPerT).toBeCloseTo(30.77, 1);
  });

  // RB20's 2T price makes it a bad stop for anyone below ~3B/s — which is
  // almost everyone — but it does eventually overtake RB19. Pinning both
  // sides of the crossover so the doc can state the caveat honestly.
  it("RB20 is worse than RB19 below ~3B/s, and better above it", () => {
    for (const rate of [10n * M, 100n * M, 500n * M, B, 2n * B]) {
      const rows = table(rate, 1);
      expect(at(rows, 20).crystalsPerHour).toBeLessThan(at(rows, 19).crystalsPerHour);
    }
    for (const rate of [3n * B, 5n * B, 10n * B]) {
      const rows = table(rate, 1);
      expect(at(rows, 20).crystalsPerHour).toBeGreaterThan(at(rows, 19).crystalsPerHour);
    }
  });

  it("handles a zero credit rate without producing NaN", () => {
    const rows = table(0n, 1);
    expect(rows.every((r) => Number.isFinite(r.crystalsPerT))).toBe(true);
    expect(rows.every((r) => r.crystalsPerHour === 0)).toBe(true);
    expect(bestSrStop(rows)).toBeNull();
  });

  it("more setup time pushes the optimum to a higher level", () => {
    // Fixed overhead is amortised better over a longer run.
    const quick = bestSrStop(table(500n * M, 0.5))!;
    const slow = bestSrStop(table(500n * M, 2))!;
    expect(slow.level).toBeGreaterThan(quick.level);
  });
});

describe("bestSrStop", () => {
  // These are the numbers quoted to the user and in STRATEGY.md.
  it("recommends RB16 at 100M/s with 1h of setup", () => {
    const best = bestSrStop(table(100n * M, 1))!;
    expect(best.level).toBe(16);
    expect(best.crystalsPerHour).toBeCloseTo(29.8, 0);
  });

  it("recommends RB19 only once you're pushing ~1B/s", () => {
    expect(bestSrStop(table(B, 1))!.level).toBe(19);
    // ...and a mid-game player should stop well short of it.
    expect(bestSrStop(table(10n * M, 1))!.level).toBe(14);
  });

  // Reaching RB12 costs ~2.3B credits — seconds of grinding — so the early
  // game is droid acquisition, and a realistic setup estimate is ~2h, not 1.
  // At that setting the community's "SR at RB19" is correct from ~500M/s,
  // which is the reconciliation the doc leans on.
  it("at a realistic 2h setup, RB19 is right from ~500M/s", () => {
    expect(bestSrStop(table(500n * M, 2))!.level).toBe(19);
    expect(bestSrStop(table(B, 2))!.level).toBe(19);
    // ...but a mid-game player still stops well short.
    expect(bestSrStop(table(50n * M, 2))!.level).toBe(16);
  });

  it("getting back to RB12 is negligible in credits", () => {
    // Under 3B total — the early game is a droid problem, not a credit one.
    expect(Number(cumulativeCreditsTo(1, 12))).toBeLessThan(3e9);
  });

  it("a faster credit rate never lowers the recommended level", () => {
    let prev = 0;
    for (const rate of [1n * M, 10n * M, 100n * M, B, 5n * B]) {
      const lvl = bestSrStop(table(rate, 1))!.level;
      expect(lvl).toBeGreaterThanOrEqual(prev);
      prev = lvl;
    }
  });
});

describe("climbing multiplier curve", () => {
  // Samples: RB6 = 18.1x, RB7 = 18.7x, RB8 = 19.3x -> a constant +0.6 step.
  const curve = { atCurrentLevel: 19.3, currentLevel: 8, perLevel: 0.6 };
  const withCurve = (rate: bigint) =>
    srTimingTable({ cycle: 1, creditsPerSec: rate, setupHours: 2, multiplier: curve });
  const flat = (rate: bigint) => srTimingTable({ cycle: 1, creditsPerSec: rate, setupHours: 2 });

  it("shortens the grind everywhere, because the rate climbs as you go", () => {
    const c = withCurve(947_000n);
    const f = flat(947_000n);
    for (const row of c) {
      const same = f.find((r) => r.level === row.level)!;
      expect(row.runHours, `RB${row.level}`).toBeLessThan(same.runHours);
    }
  });

  it("corrects more at the top of the ladder than the bottom", () => {
    const c = withCurve(947_000n);
    const f = flat(947_000n);
    const saving = (lvl: number) => {
      const a = f.find((r) => r.level === lvl)!.runHours - 2;
      const b = c.find((r) => r.level === lvl)!.runHours - 2;
      return (a - b) / a;
    };
    // ~5% around RB12 rising past 20% by RB21 — the flat model's bias.
    expect(saving(12)).toBeGreaterThan(0.02);
    expect(saving(21)).toBeGreaterThan(saving(12) * 3);
  });

  it("treats creditsPerSec as the rate AT the current level", () => {
    // One level of grinding from RB8 should use ~the quoted rate, not a
    // back-projected base — a sanity check on the multiplier bookkeeping.
    const c = withCurve(947_000n);
    const rb12 = c.find((r) => r.level === 12)!;
    expect(rb12.runHours - 2).toBeGreaterThan(0.5);
    expect(rb12.runHours - 2).toBeLessThan(0.8);
  });

  it("falls back to the flat model when no curve is supplied", () => {
    const a = flat(947_000n);
    const b = srTimingTable({ cycle: 1, creditsPerSec: 947_000n, setupHours: 2 });
    expect(a.map((r) => r.runHours)).toEqual(b.map((r) => r.runHours));
  });

  it("still handles a zero rate without NaN", () => {
    const rows = withCurve(0n);
    expect(rows.every((r) => r.crystalsPerHour === 0)).toBe(true);
  });
});

describe("projection distance", () => {
  const curve = { atCurrentLevel: 19.9, currentLevel: 9, perLevel: 0.6 };
  const rows = srTimingTable({
    cycle: 1,
    creditsPerSec: 947_000n,
    setupHours: 2,
    multiplier: curve,
  });

  it("reports how far past the player each row projects", () => {
    expect(rows.find((r) => r.level === 12)!.levelsProjected).toBe(3);
    expect(rows.find((r) => r.level === 25)!.levelsProjected).toBe(16);
  });

  it("is unset on the flat model, which projects nothing", () => {
    const flat = srTimingTable({ cycle: 1, creditsPerSec: 947_000n, setupHours: 2 });
    expect(flat.every((r) => r.levelsProjected === undefined)).toBe(true);
  });

  // The correction and the uncertainty grow together: the rows the climbing
  // model helps most are the ones furthest from anything observed.
  it("flags the far rows, where the correction is largest", () => {
    const far = rows.filter((r) => (r.levelsProjected ?? 0) > PROJECTION_WARN_LEVELS);
    expect(far.length).toBeGreaterThan(0);
    expect(Math.min(...far.map((r) => r.level))).toBeGreaterThan(curve.currentLevel);
  });
});

describe("derived multiplier step", () => {
  it("comes from the recorded samples, not a constant", () => {
    // RB6 = 18.1x through RB11 = 21.2x -> 3.1 over 5 levels.
    expect(OBSERVED_MULTIPLIER_STEP).toBeCloseTo(0.62, 2);
    expect(HIGHEST_SAMPLED_LEVEL).toBe(11);
  });

  it("uses the end-to-end slope so one rounded reading can't skew it", () => {
    // Steps are 0.6,0.6,0.6,0.6,0.7 — a mean-of-steps gives the same answer
    // here, but end-to-end stays stable if a middle sample rounds oddly.
    const s = observedMultiplierStep([
      { rbLevel: 5, creditMultiplier: 10, superRebirthCount: 1 },
      { rbLevel: 6, creditMultiplier: 99, superRebirthCount: 1 }, // bogus middle
      { rbLevel: 15, creditMultiplier: 20, superRebirthCount: 1 },
    ]);
    expect(s).toBeCloseTo(1.0); // (20-10)/(15-5), unaffected by the outlier
  });

  it("returns null when there aren't enough samples to derive anything", () => {
    expect(observedMultiplierStep([])).toBeNull();
    expect(
      observedMultiplierStep([{ rbLevel: 6, creditMultiplier: 18.1, superRebirthCount: 2 }]),
    ).toBeNull();
  });
});
