import { DROID_STATS } from "../data/droidStats.seed";
import { CRAFTING_TIMES } from "../data/craftingTimes.seed";
import { DROID_DICT } from "../data/droids.seed";
import { TIERS } from "../constants";
import { buildDroidIndex } from "./autocomplete";
import type { DroidDef, DroidStats, DroidTierStat, StatOverrides, Tier } from "../types";

const INDEX = buildDroidIndex(DROID_DICT);

/**
 * User stat edits, kept in sync with the persisted `statOverrides` slice by
 * the store (see useAppStore.ts). Merged inside `statsFromTable` so EVERY stat
 * consumer — income strategy, sell values, base income — picks them up without
 * threading a table around. Keyed by canonical droid name.
 */
let overrides: StatOverrides = {};
export function setStatOverrides(next: StatOverrides): void {
  overrides = next ?? {};
}

/** Resolve a droid name to its seed definition (canonical or alias). */
export function resolveDroid(name: string): DroidDef | null {
  return INDEX.resolve(name);
}

/**
 * Look up a droid's per-tier stats in a stats table, with user `statOverrides`
 * merged over the seed (per tier, per field). Tries the resolved droid's
 * canonical name first, then each alias, then the raw name.
 *
 * Some `droidStats.json` keys use abbreviated spellings that only appear
 * in a droid's aliases (e.g. key `"MONO-WLKR"` for canonical
 * `"MONO-WALKER"`, `"OPTI-STRK"` for `"OPTI-STRIKE"`), so a plain
 * `table[canonical]` lookup misses them — this reconciles both.
 */
function lookupRaw(
  table: DroidStats,
  def: DroidDef | undefined | null,
  rawName?: string,
): { seed: Partial<Record<Tier, DroidTierStat>> | undefined; key: string | undefined } {
  if (def) {
    let seed = table[def.canonical];
    if (!seed) {
      for (const alias of def.aliases ?? []) {
        if (table[alias]) {
          seed = table[alias];
          break;
        }
      }
    }
    return { seed, key: def.canonical };
  }
  if (rawName) return { seed: table[rawName], key: rawName };
  return { seed: undefined, key: undefined };
}

/**
 * The seed stats for a droid with NO user overrides applied. Used by the
 * migration that prunes overrides which merely duplicate the seed — comparing
 * through `statsFromTable` there would merge in the very overrides being
 * pruned and make every one of them look redundant.
 */
export function seedStatsFor(
  nameOrDef: string | DroidDef,
): Partial<Record<Tier, DroidTierStat>> | undefined {
  if (typeof nameOrDef === "string") {
    return lookupRaw(DROID_STATS, INDEX.resolve(nameOrDef), nameOrDef).seed;
  }
  return lookupRaw(DROID_STATS, nameOrDef, nameOrDef.canonical).seed;
}

export function statsFromTable(
  table: DroidStats,
  def: DroidDef | undefined | null,
  rawName?: string,
): Partial<Record<Tier, DroidTierStat>> | undefined {
  const { seed, key: overrideKey } = lookupRaw(table, def, rawName);
  const ov = overrideKey ? overrides[overrideKey] : undefined;
  if (!ov) return seed; // no override → seed passthrough (unchanged)

  // Merge per tier/field; include tiers present in seed OR the override.
  const merged: Partial<Record<Tier, DroidTierStat>> = {};
  for (const tier of TIERS) {
    const s = seed?.[tier];
    const o = ov[tier];
    if (!s && !o) continue;
    merged[tier] = {
      cost: o?.cost ?? s?.cost ?? null,
      income: o?.income ?? s?.income ?? "",
      value: o?.value ?? s?.value ?? null,
    };
  }
  return merged;
}

/**
 * Build time for a droid at a tier ("1:08:41"), or null when unknown. ICONIC
 * event droids aren't craftable, so they have no times. Alias-aware, mirroring
 * `tierStatsFor`.
 */
export function craftTimeFor(nameOrDef: string | DroidDef, tier: Tier): string | null {
  const def = typeof nameOrDef === "string" ? INDEX.resolve(nameOrDef) : nameOrDef;
  const raw = typeof nameOrDef === "string" ? nameOrDef : nameOrDef.canonical;
  const row = (def && CRAFTING_TIMES[def.canonical]) ?? CRAFTING_TIMES[raw];
  return row?.[tier] ?? null;
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
