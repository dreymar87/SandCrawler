import { SUPER_REBIRTH_BONUSES } from "../data/superRebirthBonuses.seed";
import {
  highestSampledLevel,
  observedMultiplierStep,
  STEP_WINDOW_LEVELS,
} from "../data/rebirthMultipliers.seed";
import { parseCredits } from "./credits";
import { rebirthsForCycle } from "./sellGuidance";
import type { RebirthCycle } from "../types";

/**
 * When should you Super Rebirth?
 *
 * Super Rebirth is effectively the only source of Nova Crystals, so the
 * question "which RB level do I stop at" decides your whole crystal income.
 * The community answer ("RB19") is a single point on a curve — the real
 * optimum moves with how fast you earn credits.
 *
 * The model: reaching RB N from a fresh Super Rebirth costs the SUM of every
 * rebirth cost up to N (you pay each level on the way through). So one run
 * takes
 *
 *     runHours = setupHours + cumulativeCredits(N) / creditsPerSec / 3600
 *
 * and yields `crystals(N)` from the SRB table. Maximising crystals PER HOUR —
 * not per run — is what actually matters, and that trades the steeply rising
 * credit cost against the slowly rising crystal reward.
 *
 * `setupHours` is the fixed per-run overhead that ISN'T credit-bound:
 * re-crafting droids and grinding back through the early levels, whose credit
 * costs are rounding errors but whose wall-clock cost is real. It's the one
 * input the app can't measure, so the player estimates it.
 *
 * ── Known bias: this UNDER-estimates the best stopping level ──────────────
 * The model holds `creditsPerSec` constant across a run. In reality it climbs,
 * for two compounding reasons:
 *
 *   1. Passing rebirth levels grants credit/XP multipliers WITHIN a run, so
 *      the expensive late levels are earned at a higher rate than the early
 *      ones — the grind hours here are an overestimate at the top of the
 *      ladder specifically.
 *   2. Super Rebirth grants a permanent credit multiplier (see
 *      `SUPER_REBIRTH_BONUSES.creditMult`, +22% at RB12 rising to +508% at
 *      RB30) which raises the floor every FUTURE run starts from. Stopping
 *      higher therefore pays forward, and this single-run model can't see it.
 *
 * Both errors point the same way: the true optimum is somewhat HIGHER than
 * what this returns, and the gap widens the more runs you plan to do.
 * Modelling it properly needs the per-rebirth-level multiplier curve, which
 * no community sheet publishes yet. Until then, treat the recommendation as a
 * floor rather than a precise answer, and prefer the higher end of a tie.
 */

/**
 * How the in-game credit multiplier climbs as you pass rebirth levels.
 *
 * Supplying this replaces the flat-rate assumption with a level-by-level
 * integration: each rebirth's cost is earned at the multiplier you actually
 * hold when you start it, not at the one you finish the run with. That removes
 * bias (1) in the header — the flat model overstates grind time at the top of
 * the ladder, by 5% around RB12 and 25%+ by RB21.
 *
 * Derived from the player's own reading rather than a table, because the HUD
 * figure folds in Nova upgrades and Super Rebirth carry-over as well as
 * rebirth levels, so it isn't the same for two players at the same RB.
 */
export interface MultiplierCurve {
  /** The multiplier the player sees right now. */
  atCurrentLevel: number;
  /** The rebirth level they're on right now. */
  currentLevel: number;
  /**
   * How much the multiplier gains per rebirth level. Defaults to the step
   * observed NEAR `currentLevel`, because the step is level-dependent: about
   * +0.4 at RB0 rising to +0.7 by RB10. A single figure for the whole ladder
   * would be wrong at both ends.
   */
  perLevel?: number;
}

/**
 * Per-level multiplier step, derived from the recorded samples rather than
 * hardcoded, so it moves with the evidence as more are logged.
 *
 * It held at exactly +0.6 for RB6→10 and then went +0.7 at RB11, so a fixed
 * constant was already wrong. The end-to-end slope (~0.62) absorbs that
 * without over-fitting to a single reading, which matters because the values
 * are displayed to one decimal and rounding alone can shift a step by 0.1.
 */
export const OBSERVED_MULTIPLIER_STEP = observedMultiplierStep() ?? 0.6;

/** Highest rebirth level with a real observation behind it. */
export const HIGHEST_SAMPLED_LEVEL = highestSampledLevel();

/** One candidate Super Rebirth stopping point. */
export interface SrStop {
  /** The RB level you'd Super Rebirth from. */
  level: number;
  /** Crystals awarded for SR'ing here. */
  crystals: number;
  /** Permanent additive credit multiplier awarded (0.22 = +22%). */
  creditMult: number;
  /** Total credits to reach this level from a fresh SR (sum of RB1..N). */
  cumCredits: bigint;
  /** Crystals per 1 trillion credits of total spend — the efficiency ratio. */
  crystalsPerT: number;
  /**
   * What the step up from the previous SR-eligible level actually bought.
   * `null` on the first eligible level (nothing to compare against).
   */
  marginal: { credits: bigint; crystals: number; crystalsPerT: number } | null;
  /** Hours for one full run ending here, including setup. */
  runHours: number;
  /** The figure to maximise: crystals ÷ runHours. */
  crystalsPerHour: number;
  /**
   * How many rebirth levels past the player's current one this row projects
   * the multiplier curve. Only set when a curve is in use.
   *
   * Worth surfacing because the correction and the uncertainty grow together:
   * the climbing model helps most at the top of the ladder, which is exactly
   * where it's extrapolating furthest from anything observed. A row 16 levels
   * out is a straight-line guess, and players report the per-level step gets
   * less consistent at higher rebirths.
   */
  levelsProjected?: number;
}

/**
 * Beyond this many levels past the player's current one, a projected
 * multiplier is far enough from observation to be worth flagging in the UI.
 */
export const PROJECTION_WARN_LEVELS = 6;

const TRILLION = 1e12;

/**
 * Cumulative credits needed to reach `level` in `cycle`, starting from a
 * fresh Super Rebirth. Sums every rebirth cost from RB1 through `level`
 * because you pay each one on the way up.
 */
export function cumulativeCreditsTo(cycle: RebirthCycle, level: number): bigint {
  let total = 0n;
  for (const rb of rebirthsForCycle(cycle)) {
    if (rb.level > level) break;
    total += parseCredits(rb.credits);
  }
  return total;
}

/** bigint → number for ratio math. Credit totals are far inside 2^53. */
const toNum = (n: bigint): number => Number(n);

/**
 * Every Super-Rebirth-eligible stopping point, scored for this player.
 *
 * `creditsPerSec` of 0 (or less) means we can't estimate run time, so
 * `runHours`/`crystalsPerHour` come back as `Infinity`/`0` and the efficiency
 * columns still work — the table stays useful before any droids are deployed.
 */
export function srTimingTable({
  cycle,
  creditsPerSec,
  setupHours,
  multiplier,
}: {
  cycle: RebirthCycle;
  creditsPerSec: bigint;
  setupHours: number;
  /** Optional. Without it the rate is held flat — see the header's bias note. */
  multiplier?: MultiplierCurve;
}): SrStop[] {
  const rate = toNum(creditsPerSec);
  const setup = Math.max(0, setupHours);
  const rows: SrStop[] = [];

  // With a curve, `creditsPerSec` is the rate at `currentLevel`; back out the
  // pre-multiplier base so each level can be earned at its own multiplier.
  const step =
    multiplier?.perLevel ??
    (multiplier
      ? (observedMultiplierStep(undefined, STEP_WINDOW_LEVELS, multiplier.currentLevel) ??
        OBSERVED_MULTIPLIER_STEP)
      : OBSERVED_MULTIPLIER_STEP);
  const multAt = (lvl: number): number =>
    multiplier ? multiplier.atCurrentLevel + step * (lvl - multiplier.currentLevel) : 1;
  const baseRate =
    multiplier && multAt(multiplier.currentLevel) > 0 ? rate / multAt(multiplier.currentLevel) : rate;

  /**
   * Hours of grinding to reach `level`. Each rebirth's cost is earned at the
   * multiplier held while working toward it — i.e. the PREVIOUS level's — so
   * a climbing curve shortens the expensive top of the ladder.
   */
  const grindHoursTo = (level: number): number => {
    if (rate <= 0) return Infinity;
    if (!multiplier) return toNum(cumulativeCreditsTo(cycle, level)) / rate / 3600;
    let seconds = 0;
    for (const rb of rebirthsForCycle(cycle)) {
      if (rb.level > level) break;
      const m = Math.max(multAt(rb.level - 1), 0.0001); // never divide by ~0
      seconds += toNum(parseCredits(rb.credits)) / (baseRate * m);
    }
    return seconds / 3600;
  };

  let prev: { cumCredits: bigint; crystals: number } | null = null;
  for (const bonus of [...SUPER_REBIRTH_BONUSES].sort((a, b) => a.rbLevel - b.rbLevel)) {
    const cumCredits = cumulativeCreditsTo(cycle, bonus.rbLevel);
    // A cycle that doesn't reach this level yet can't be stopped at.
    if (cumCredits <= 0n) continue;

    const runHours = setup + grindHoursTo(bonus.rbLevel);

    let marginal: SrStop["marginal"] = null;
    if (prev) {
      const dCredits = cumCredits - prev.cumCredits;
      const dCrystals = bonus.crystals - prev.crystals;
      marginal = {
        credits: dCredits,
        crystals: dCrystals,
        crystalsPerT: dCredits > 0n ? dCrystals / (toNum(dCredits) / TRILLION) : 0,
      };
    }

    rows.push({
      level: bonus.rbLevel,
      crystals: bonus.crystals,
      creditMult: bonus.creditMult,
      cumCredits,
      crystalsPerT: bonus.crystals / (toNum(cumCredits) / TRILLION),
      marginal,
      runHours,
      crystalsPerHour: Number.isFinite(runHours) && runHours > 0 ? bonus.crystals / runHours : 0,
      levelsProjected: multiplier
        ? Math.max(0, bonus.rbLevel - multiplier.currentLevel)
        : undefined,
    });
    prev = { cumCredits, crystals: bonus.crystals };
  }
  return rows;
}

/**
 * The stop with the highest crystals/hour. Ties break toward the LOWER level:
 * shorter runs carry less risk of a session ending mid-run, and reaching a
 * lower level is strictly easier.
 */
export function bestSrStop(rows: readonly SrStop[]): SrStop | null {
  let best: SrStop | null = null;
  for (const r of rows) {
    if (r.crystalsPerHour <= 0) continue;
    if (!best || r.crystalsPerHour > best.crystalsPerHour) best = r;
  }
  return best;
}
