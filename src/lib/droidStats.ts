import { DROID_STATS } from "../data/droidStats.seed";
import { DROID_DICT } from "../data/droids.seed";
import { buildDroidIndex } from "./autocomplete";
import type { DroidDef, DroidStats, DroidTierStat, Tier } from "../types";

const INDEX = buildDroidIndex(DROID_DICT);

/** Resolve a droid name to its seed definition (canonical or alias). */
export function resolveDroid(name: string): DroidDef | null {
  return INDEX.resolve(name);
}

/**
 * Look up a droid's per-tier stats in a stats table. Tries the resolved
 * droid's canonical name first, then each alias, then the raw name.
 *
 * Some `droidStats.json` keys use abbreviated spellings that only appear
 * in a droid's aliases (e.g. key `"MONO-WLKR"` for canonical
 * `"MONO-WALKER"`, `"OPTI-STRK"` for `"OPTI-STRIKE"`), so a plain
 * `table[canonical]` lookup misses them — this reconciles both.
 */
export function statsFromTable(
  table: DroidStats,
  def: DroidDef | undefined | null,
  rawName?: string,
): Partial<Record<Tier, DroidTierStat>> | undefined {
  if (def) {
    const hit = table[def.canonical];
    if (hit) return hit;
    for (const alias of def.aliases ?? []) {
      const aliasHit = table[alias];
      if (aliasHit) return aliasHit;
    }
  }
  if (rawName && table[rawName]) return table[rawName];
  return undefined;
}

/** Convenience over the seed `DROID_STATS` — resolves name-or-def with alias fallback. */
export function tierStatsFor(
  nameOrDef: string | DroidDef,
): Partial<Record<Tier, DroidTierStat>> | undefined {
  if (typeof nameOrDef === "string") {
    return statsFromTable(DROID_STATS, INDEX.resolve(nameOrDef), nameOrDef);
  }
  return statsFromTable(DROID_STATS, nameOrDef, nameOrDef.canonical);
}
