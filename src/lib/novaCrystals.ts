import { NOVA_ICONIC_PURCHASES } from "../data/novaShop.seed";
import { SUPER_REBIRTH_BONUSES } from "../data/superRebirthBonuses.seed";
import type { NovaUpgrade, NovaUpgradeState, SuperRebirthBonus } from "../types";

/**
 * The Super Rebirth bonus you'd receive if you SR'd from `rbLevel`.
 * Returns `null` below RB12 (no bonus given at lower levels).
 */
export function srbBonusAt(rbLevel: number): SuperRebirthBonus | null {
  return SUPER_REBIRTH_BONUSES.find((b) => b.rbLevel === rbLevel) ?? null;
}

/** Crystal cost of an ICONIC droid in the Nova Shop, or null if not purchasable. */
export function iconicCostFor(droidName: string): number | null {
  const key = droidName.trim().toUpperCase();
  return NOVA_ICONIC_PURCHASES.find((p) => p.droid.toUpperCase() === key)?.crystals ?? null;
}

/**
 * Total crystals spent across (a) Nova Shop upgrade levels reached and
 * (b) ICONIC droid purchases. Unknown costs (`null` entries) contribute 0
 * to the sum so the math doesn't lie when a player is past a known level.
 */
export function crystalsSpent(
  upgradeStates: readonly NovaUpgradeState[],
  upgrades: readonly NovaUpgrade[],
  iconicOwned: readonly string[] = [],
): number {
  let total = 0;
  const byId = new Map(upgrades.map((u) => [u.id, u]));
  for (const s of upgradeStates) {
    const def = byId.get(s.id);
    if (!def) continue;
    for (let i = 0; i < Math.min(s.level, def.costs.length); i++) {
      total += def.costs[i] ?? 0;
    }
  }
  for (const name of iconicOwned) {
    total += iconicCostFor(name) ?? 0;
  }
  return total;
}

/** Cost of going from current `level` to `level + 1`. */
export function nextLevelCost(
  def: NovaUpgrade,
  currentLevel: number,
): { kind: "known"; cost: number } | { kind: "unknown" } | { kind: "max" } {
  if (currentLevel >= def.costs.length) return { kind: "max" };
  const c = def.costs[currentLevel];
  if (c === null || c === undefined) return { kind: "unknown" };
  return { kind: "known", cost: c };
}

export interface NovaBalance {
  earned: number;
  spent: number;
  balance: number;
}

export function computeBalance(earned: number, spent: number): NovaBalance {
  return { earned, spent, balance: earned - spent };
}
