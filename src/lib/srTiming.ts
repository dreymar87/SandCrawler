import { SUPER_REBIRTH_BONUSES } from "../data/superRebirthBonuses.seed";
import {
  highestSampledLevel,
  observedMultiplierStep,
  observedStepAtLevel,
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
 * ── The two biases, both now measured ─────────────────────────────────────
 * This model once held `creditsPerSec` flat across a run and warned that the
 * answer was therefore a floor. Both sources of that bias have since been
 * quantified from player samples:
 *
 *   1. WITHIN a run, passing rebirth levels raises the multiplier. Handled:
 *      pass a `MultiplierCurve` and the grind is integrated level by level
 *      against the observed per-level step (+0.4 at RB0 rising to +0.7 by
 *      RB10). Worth 6% around RB12 and 25%+ by RB21.
 *   2. ACROSS runs, Super Rebirth adds `SUPER_REBIRTH_BONUSES.creditMult`
 *      directly to the multiplier, permanently. Confirmed by two parallel
 *      cycles offset by exactly the granted 0.32.
 *
 * (2) is deliberately NOT folded into the score. It would reward stopping
 * higher, but checked against real numbers it doesn't change the answer:
 * ranking stops by multiplier-gained-per-hour picks the same level as ranking
 * by crystals-per-hour, because the run length grows faster than the bonus.
 * A caveat that doesn't move a decision is noise, so the old "treat this as a
 * floor" warning is retired rather than restated.
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
   * Force a single step for every level. Normally omitted: the step is
   * level-dependent (+0.4 at RB0 rising to +0.7 by RB10) and the default walks
   * the observed per-level table instead, so no one figure has to serve the
   * whole ladder.
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
  //
  // The step is level-dependent, so walk it level by level from the player's
  // anchor rather than multiplying by one figure. Both sampled cycles agree on
  // the step at a given level, which is what makes the pooled table usable.
  const stepAt = (lvl: number): number =>
    multiplier?.perLevel ?? observedStepAtLevel(lvl) ?? OBSERVED_MULTIPLIER_STEP;
  const multAt = (lvl: number): number => {
    if (!multiplier) return 1;
    let m = multiplier.atCurrentLevel;
    for (let k = multiplier.currentLevel; k < lvl; k++) m += stepAt(k);
    for (let k = lvl; k < multiplier.currentLevel; k++) m -= stepAt(k);
    return m;
  };
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
