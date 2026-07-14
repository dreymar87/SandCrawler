import { CHIP_COSTS } from "../data/chipCosts.seed";
import { UPGRADE_TIERS } from "../constants";
import type { Rarity, Tier } from "../types";

/**
 * Chip cost to upgrade a droid of `rarity` from DEFAULT to `target`.
 * Returns null when there is no chip path: ICONIC droids don't upgrade,
 * FLAWLESS is a rare drop rather than an upgrade target, and unknown
 * rarities have no seed row.
 */
export function chipsFromDefaultTo(rarity: Rarity | undefined, target: Tier): number | null {
  return chipsBetween(rarity, "DEFAULT", target);
}

/**
 * Chip cost to upgrade from `from` to `to` (inclusive of every step in
 * between). `to` at or below `from` returns 0. Returns null for the
 * same no-path conditions as `chipsFromDefaultTo`.
 */
export function chipsBetween(rarity: Rarity | undefined, from: Tier, to: Tier): number | null {
  if (!rarity || rarity === "ICONIC") return null;
  if (to === "FLAWLESS") return null;
  const row = CHIP_COSTS.find((r) => r.rarity === rarity);
  if (!row) return null;
  const fromIdx = UPGRADE_TIERS.indexOf(from as (typeof UPGRADE_TIERS)[number]);
  const toIdx = UPGRADE_TIERS.indexOf(to as (typeof UPGRADE_TIERS)[number]);
  if (fromIdx < 0 || toIdx < 0) return null;
  if (toIdx <= fromIdx) return 0;
  // steps[i] = cost to go from UPGRADE_TIERS[i] → UPGRADE_TIERS[i+1].
  let total = 0;
  for (let i = fromIdx; i < toIdx; i++) total += row.steps[i]!;
  return total;
}

/** Format a chip count with thousands separators; "—" when null. */
export function formatChipCost(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US");
}
