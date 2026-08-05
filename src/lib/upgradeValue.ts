import { NOVA_UPGRADES } from "../data/novaShop.seed";
import { MEASURED_EFFECTS, measuredEffectFor } from "../data/strategyTracks.seed";
import type { NovaUpgradeState } from "../types";

/**
 * Ranking Nova upgrades by measured value, for the few whose effect magnitude
 * is actually known.
 *
 * Everything is converted to one currency — **percent of your base credits/s
 * gained, per crystal spent** — so upgrades with completely different
 * mechanics become directly comparable. Where this can run, it replaces the
 * editorial ordering in strategyTracks.seed.ts with arithmetic.
 *
 * The one judgement call left is `swingUptime`: active-only upgrades (Scrap
 * Value) only pay while you're at the screen swinging, so their value scales
 * with the fraction of a run you actually spend doing that. At 100% Scrap
 * Value L1 is worth more per crystal than Credits L6; at 50% it drops below
 * Credits L11.
 */

export interface ValuedLevel {
  id: string;
  name: string;
  /** The level being bought (from `level - 1` to `level`). */
  level: number;
  cost: number;
  /** Base-credits/s fraction this single level adds, after uptime scaling. */
  gain: number;
  /** gain ÷ cost — the ranking key. Percent of base per crystal. */
  valuePerCrystal: number;
  activeOnly: boolean;
}

/** Marginal gain of going from `level - 1` to `level`, scaled for uptime. */
export function marginalGain(id: string, level: number, swingUptime: number): number | null {
  const effect = measuredEffectFor(id);
  if (!effect || effect.unit !== "CREDIT_RATE" || level < 1) return null;
  const raw = effect.gainAt(level) - effect.gainAt(level - 1);
  return effect.activeOnly ? raw * clampUptime(swingUptime) : raw;
}

const clampUptime = (u: number): number => (Number.isFinite(u) ? Math.min(1, Math.max(0, u)) : 1);

/**
 * Every unowned level of every measured upgrade, ranked by gain per crystal.
 *
 * This is a greedy ordering, which is exactly right here: the levels are
 * independent purchases and each one's value doesn't depend on what else you
 * bought, so taking the best remaining option each time IS the optimum.
 */
export function efficientOrder({
  upgrades,
  swingUptime = 1,
  limit = 20,
}: {
  upgrades: readonly NovaUpgradeState[];
  swingUptime?: number;
  limit?: number;
}): ValuedLevel[] {
  const byId = new Map(NOVA_UPGRADES.map((u) => [u.id, u]));
  const owned = new Map(upgrades.map((u) => [u.id, u.level]));
  const out: ValuedLevel[] = [];

  for (const effect of MEASURED_EFFECTS) {
    // Only credit-denominated effects share a currency. Chip upgrades are
    // measured too, but ranking them here would require an invented
    // chips-to-credits exchange rate.
    if (effect.unit !== "CREDIT_RATE") continue;
    const def = byId.get(effect.id);
    if (!def) continue;
    const have = owned.get(effect.id) ?? 0;
    for (let lvl = have + 1; lvl <= def.costs.length; lvl++) {
      const cost = def.costs[lvl - 1];
      if (cost === null || cost === undefined || cost <= 0) continue;
      const gain = marginalGain(effect.id, lvl, swingUptime);
      if (gain === null || gain <= 0) continue;
      out.push({
        id: effect.id,
        name: def.name,
        level: lvl,
        cost,
        gain,
        valuePerCrystal: gain / cost,
        activeOnly: effect.activeOnly,
      });
    }
  }

  out.sort((a, b) => b.valuePerCrystal - a.valuePerCrystal || a.cost - b.cost);
  return out.slice(0, limit);
}

/** Running totals over an ordered list — crystals spent and base multiple gained. */
export function cumulativeValue(levels: readonly ValuedLevel[]): {
  crystals: number;
  gain: number;
} {
  return levels.reduce(
    (acc, l) => ({ crystals: acc.crystals + l.cost, gain: acc.gain + l.gain }),
    { crystals: 0, gain: 0 },
  );
}
