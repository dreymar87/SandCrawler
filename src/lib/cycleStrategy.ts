import { DROID_DICT } from "../data/droids.seed";
import { RARITIES } from "../constants";
import { buildDroidIndex } from "./autocomplete";
import { rebirthsForCycle } from "./sellGuidance";
import { chipsFromDefaultTo } from "./chipCosts";
import { tierRank } from "./tiers";
import { normalizeName } from "./normalize";
import type { Rarity, RebirthCycle, Tier } from "../types";

export interface KeeperEntry {
  /** Canonical droid name as it appears in the dict / requirements. */
  name: string;
  rarity: Rarity;
  /** Max tier this droid is required at across every RB in the cycle. */
  targetTier: Tier;
  /** Sorted RB levels where this droid appears in `needs`. */
  appearsAt: number[];
  firstNeeded: number;
  lastNeeded: number;
  /** Chips to upgrade DEFAULT → targetTier. null for ICONIC / FLAWLESS / unknown. */
  chipCost: number | null;
}

export interface CycleStrategy {
  cycle: RebirthCycle;
  /** Sorted by rarity rank DESC, then chip cost DESC (heavy investments first). */
  keepers: KeeperEntry[];
  /** Totals per rarity (only rarities that actually appear in the keeper list). */
  chipTotals: Partial<Record<Exclude<Rarity, "ICONIC">, number>>;
}

const INDEX = buildDroidIndex(DROID_DICT);

/**
 * Compute the union of droid requirements across all 27 RBs of `cycle`.
 * Each unique droid gets rolled up to its MAX required tier and the
 * list of RB levels where it appears.
 */
export function computeCycleStrategy(cycle: RebirthCycle): CycleStrategy {
  const rows = rebirthsForCycle(cycle);
  const byName = new Map<string, { rarity: Rarity; maxTier: Tier; appearsAt: Set<number> }>();

  for (const rb of rows) {
    for (const req of rb.needs) {
      const def = INDEX.resolve(req.name);
      const canonical = def?.canonical ?? req.name.trim();
      const rarity: Rarity = def?.rarity ?? "COMMON";
      const cur = byName.get(canonical) ?? { rarity, maxTier: "DEFAULT" as Tier, appearsAt: new Set<number>() };
      if (tierRank(req.tier) > tierRank(cur.maxTier)) cur.maxTier = req.tier;
      cur.appearsAt.add(rb.level);
      byName.set(canonical, cur);
    }
  }

  const keepers: KeeperEntry[] = [...byName.entries()].map(([name, v]) => {
    const levels = [...v.appearsAt].sort((a, b) => a - b);
    return {
      name,
      rarity: v.rarity,
      targetTier: v.maxTier,
      appearsAt: levels,
      firstNeeded: levels[0]!,
      lastNeeded: levels[levels.length - 1]!,
      chipCost: chipsFromDefaultTo(v.rarity, v.maxTier),
    };
  });

  // Sort: rarity rank ASC (COMMON → MYTHIC), then by the earliest RB level
  // where the droid is needed. Matches the natural progression of play —
  // you'll want your low-rarity RB1-RB5 keepers before your MYTHIC RB25s.
  keepers.sort((a, b) => {
    const dr = rarityRank(a.rarity) - rarityRank(b.rarity);
    if (dr !== 0) return dr;
    return a.firstNeeded - b.firstNeeded;
  });

  const chipTotals: Partial<Record<Exclude<Rarity, "ICONIC">, number>> = {};
  for (const k of keepers) {
    if (k.rarity === "ICONIC" || k.chipCost === null) continue;
    const key = k.rarity as Exclude<Rarity, "ICONIC">;
    chipTotals[key] = (chipTotals[key] ?? 0) + k.chipCost;
  }

  return { cycle, keepers, chipTotals };
}

/**
 * True iff no RB level greater than `currentLevel` in `cycle` names
 * this droid — so its cards are safe to sell without breaking a future
 * rebirth in this cycle. Case-insensitive on the input name.
 *
 * Intentionally ignores tier substitution: if a droid is needed later
 * at ANY tier, we say "keep" even when the player owns a higher tier
 * that would substitute. Aggressive "sell" recommendations that turn
 * out wrong are much worse UX than conservative ones.
 */
export function isDroidSafeToSell(
  canonicalName: string,
  cycle: RebirthCycle,
  currentLevel: number,
): boolean {
  const target = normalizeName(canonicalName);
  const rows = rebirthsForCycle(cycle);
  let lastNeeded = -1;
  for (const rb of rows) {
    for (const req of rb.needs) {
      if (normalizeName(req.name) === target) {
        if (rb.level > lastNeeded) lastNeeded = rb.level;
      }
    }
  }
  if (lastNeeded < 0) return true; // never needed in this cycle
  return currentLevel >= lastNeeded;
}

function rarityRank(r: Rarity): number {
  return RARITIES.indexOf(r);
}
