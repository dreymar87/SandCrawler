import { NOVA_UPGRADES } from "../data/novaShop.seed";
import { levelOf, measuredEffectFor, trackFor, type StrategyGoal } from "../data/strategyTracks.seed";
import type { NovaUpgradeState } from "../types";

/**
 * Turns a strategy track (the editorial ordering in strategyTracks.seed.ts)
 * into a concrete shopping list for THIS player: skip what they already own,
 * price each remaining level from the real cost ladder, and mark how far
 * their crystal balance reaches.
 */

/**
 * One block of levels to buy in a single upgrade — e.g. "Credits L0 → L5".
 *
 * Grouped rather than per-level on purpose: a track milestone like "Credits
 * through 5" is one decision, and emitting five rows repeated the same
 * rationale five times and buried the genuinely different upgrades below it.
 */
export interface PlanStep {
  /** Nova upgrade id. */
  id: string;
  name: string;
  /** Level the player is at now (the block starts here). */
  fromLevel: number;
  /** Level they'd reach by clearing the block. */
  toLevel: number;
  /** How many levels that is. */
  levels: number;
  /** Total crystals for the block (unpublished level costs count as 0). */
  cost: number;
  /** True when some level in the block has no published cost. */
  hasUnknownCost: boolean;
  /** Running total through the end of this block. */
  cumulative: number;
  /** True while `cumulative` is still within the player's balance. */
  affordable: boolean;
  /** Why this upgrade is on the list at all (from the track). */
  why: string;
  /**
   * A confirmed in-game effect magnitude, when one is known. Almost nothing
   * has one — that's the whole caveat on this feature — so a step that DOES
   * carry one is worth distinguishing from a step resting on argument alone.
   */
  knownEffect?: string;
}

export interface NovaPlan {
  goal: StrategyGoal;
  label: string;
  summary: string;
  steps: PlanStep[];
  /** Crystals needed to clear every step returned. */
  totalCost: number;
  /** How many of the leading steps the current balance covers. */
  affordableCount: number;
  /** Upgrades the track deliberately omits, with reasons — shown as "skip". */
  skip: { id: string; name: string; why: string }[];
}

/**
 * Build the next `limit` purchase blocks for `goal`.
 *
 * Each track milestone becomes at most one row, covering only the levels the
 * player doesn't already own. Milestones that are fully owned vanish silently.
 */
export function planNovaPurchases({
  upgrades,
  goal,
  balance = 0,
  limit = 8,
}: {
  upgrades: readonly NovaUpgradeState[];
  goal: StrategyGoal;
  balance?: number;
  limit?: number;
}): NovaPlan {
  const track = trackFor(goal);
  const byId = new Map(NOVA_UPGRADES.map((u) => [u.id, u]));
  const steps: PlanStep[] = [];
  let cumulative = 0;

  // A track may name the same upgrade twice ("Credits through 5", then
  // "through 10"). Remember the level each milestone reached so the later
  // entry picks up where the earlier one stopped instead of re-buying levels.
  const planned = new Map<string, number>();

  for (const step of track.steps) {
    if (steps.length >= limit) break;
    const def = byId.get(step.id);
    if (!def) continue; // track references an upgrade that left the seed
    const owned = levelOf(upgrades, step.id);
    const from = Math.max(owned, planned.get(step.id) ?? 0);
    const to = Math.min(step.throughLevel, def.costs.length);
    planned.set(step.id, Math.max(from, to));
    if (to <= from) continue; // already owned through this milestone

    let cost = 0;
    let hasUnknownCost = false;
    for (let lvl = from + 1; lvl <= to; lvl++) {
      const c = def.costs[lvl - 1];
      if (c === null || c === undefined) hasUnknownCost = true;
      else cost += c;
    }
    cumulative += cost;
    steps.push({
      id: step.id,
      name: def.name,
      fromLevel: from,
      toLevel: to,
      levels: to - from,
      cost,
      hasUnknownCost,
      cumulative,
      affordable: cumulative <= balance,
      why: step.why,
      knownEffect: measuredEffectFor(step.id)?.effect,
    });
  }

  return {
    goal,
    label: track.label,
    summary: track.summary,
    steps,
    totalCost: cumulative,
    affordableCount: steps.filter((s) => s.affordable).length,
    skip: track.skip
      .map((s) => ({ id: s.id, name: byId.get(s.id)?.name ?? s.id, why: s.why }))
      .filter((s) => s.name),
  };
}
