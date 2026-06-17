import { REBIRTH_CYCLES } from "../data/rebirthCycles.seed";
import type { NovaUpgrade, NovaUpgradeState } from "../types";

/**
 * Per-level Nova Crystals lookup, derived from cycle 1's rewards (the
 * reward table is constant across cycles).
 */
const CRYSTALS_BY_LEVEL: ReadonlyMap<number, number> = (() => {
  const m = new Map<number, number>();
  for (const row of REBIRTH_CYCLES) {
    if (row.cycle !== 1) continue;
    m.set(row.level, row.rewards.novaCrystals);
  }
  return m;
})();

/**
 * Total Nova Crystals you'd have earned passing every Standard Rebirth
 * level up to and including `level`. Used as a sanity check / auto-derived
 * "earned" baseline on the Profile tab.
 */
export function crystalsEarnedThrough(level: number): number {
  let total = 0;
  for (const [lvl, crystals] of CRYSTALS_BY_LEVEL) {
    if (lvl <= level) total += crystals;
  }
  return total;
}

/** Sum the crystals spent on the upgrade levels the player has reached. */
export function crystalsSpent(
  states: readonly NovaUpgradeState[],
  upgrades: readonly NovaUpgrade[],
): number {
  let total = 0;
  const byId = new Map(upgrades.map((u) => [u.id, u]));
  for (const s of states) {
    const def = byId.get(s.id);
    if (!def) continue;
    for (let i = 0; i < Math.min(s.level, def.costs.length); i++) {
      total += def.costs[i] ?? 0;
    }
  }
  return total;
}

/** Cost of going from current `level` to `level + 1`, or null if unknown / capped. */
export function nextLevelCost(def: NovaUpgrade, currentLevel: number): number | null {
  if (currentLevel >= def.costs.length) return null;
  return def.costs[currentLevel] ?? null;
}

export interface NovaBalance {
  earned: number;
  spent: number;
  balance: number;
}

export function computeBalance(earned: number, spent: number): NovaBalance {
  return { earned, spent, balance: earned - spent };
}
