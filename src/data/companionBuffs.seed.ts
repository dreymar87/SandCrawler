/**
 * Companion-slot buffs. A droid placed in the Companion slot grants a
 * passive buff that depends on its CLASS (what kind of buff), RARITY, and
 * TIER (how strong). ICONIC droids instead grant their unique
 * `companionEffect` (seeded on the droid dict), so they're not here.
 *
 * Source: Cait/Omega's Tracker workbook, "Droid Crafting Times +
 * Companion Buffs" tab. Game facts, not copyrightable.
 *
 * - WORKER    → crafting-speed % (fraction: 0.8 = +80%)
 * - ASTROMECH → pickaxe-level bonus (+N)
 * - BATTLE    → max-health bonus (+N)
 *
 * Rows are per rarity; columns map to tiers DEFAULT..GALACTIC (6).
 */
import type { Rarity, Tier } from "../types";
import { UPGRADE_TIERS } from "../constants";

export type CompanionBuffKind = "CRAFTING_SPEED" | "PICKAXE_LEVEL" | "MAX_HEALTH";

/** Per-rarity buff values indexed to UPGRADE_TIERS (DEFAULT..GALACTIC). */
type BuffTable = Partial<Record<Exclude<Rarity, "ICONIC">, readonly number[]>>;

const WORKER_CRAFTING_SPEED: BuffTable = {
  COMMON: [0.2, 0.4, 0.6, 0.8, 1.0, 1.0],
  RARE: [0.4, 0.6, 0.8, 1.0, 1.2, 1.2],
  EPIC: [0.6, 0.8, 1.0, 1.2, 1.4, 1.4],
  LEGENDARY: [0.8, 1.0, 1.2, 1.4, 1.6, 1.6],
  MYTHIC: [1.0, 1.2, 1.4, 1.6, 1.8, 1.8],
};

const ASTROMECH_PICKAXE_LEVEL: BuffTable = {
  COMMON: [1, 2, 3, 4, 5, 6],
  RARE: [2, 3, 4, 5, 6, 7],
  EPIC: [3, 4, 5, 6, 7, 8],
  LEGENDARY: [4, 5, 6, 7, 8, 9],
  MYTHIC: [5, 6, 7, 8, 9, 10],
};

const BATTLE_MAX_HEALTH: BuffTable = {
  COMMON: [20, 60, 100, 140, 180, 220],
  RARE: [40, 80, 120, 160, 200, 240],
  EPIC: [60, 100, 140, 180, 220, 260],
  LEGENDARY: [80, 120, 160, 200, 240, 280],
  MYTHIC: [100, 140, 180, 220, 260, 300],
};

function tierIdx(tier: Tier): number {
  const i = (UPGRADE_TIERS as readonly string[]).indexOf(tier);
  return i < 0 ? 0 : i;
}

/**
 * Human-readable companion buff for a non-ICONIC droid of `cls`/`rarity`
 * at `tier`. Returns null when there's no table entry (e.g. UNKNOWN class
 * or a rarity with no data).
 */
export function companionBuffLabel(
  cls: "WORKER" | "ASTROMECH" | "BATTLE" | "UNKNOWN",
  rarity: Rarity,
  tier: Tier,
): string | null {
  if (rarity === "ICONIC") return null; // handled via DroidDef.companionEffect
  const key = rarity as Exclude<Rarity, "ICONIC">;
  const i = tierIdx(tier);
  switch (cls) {
    case "WORKER": {
      const v = WORKER_CRAFTING_SPEED[key]?.[i];
      return v === undefined ? null : `+${Math.round(v * 100)}% crafting speed`;
    }
    case "ASTROMECH": {
      const v = ASTROMECH_PICKAXE_LEVEL[key]?.[i];
      return v === undefined ? null : `+${v} pickaxe level`;
    }
    case "BATTLE": {
      const v = BATTLE_MAX_HEALTH[key]?.[i];
      return v === undefined ? null : `+${v} max health`;
    }
    default:
      return null;
  }
}
