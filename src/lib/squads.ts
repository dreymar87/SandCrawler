import { SQUAD_DEFS, type SquadType } from "../data/squads.seed";

/**
 * How many slots a squad has when you've reached `rebirthLevel`. Combines
 * the squad's base count with however many unlock thresholds you've passed.
 */
export function getMaxSlots(type: SquadType, rebirthLevel: number): number {
  const def = SQUAD_DEFS[type];
  if (def.unlocks.length === 0) return def.baseSlots;
  const unlocked = def.unlocks.filter((lvl) => rebirthLevel >= lvl).length;
  return def.baseSlots + unlocked;
}

/**
 * The next rebirth level at which `type` gains an additional slot — or null
 * if there are no more unlocks beyond `rebirthLevel`.
 */
export function nextSlotUnlock(type: SquadType, rebirthLevel: number): number | null {
  const def = SQUAD_DEFS[type];
  for (const lvl of def.unlocks) {
    if (lvl > rebirthLevel) return lvl;
  }
  return null;
}

/**
 * Total slot capacity across all squads (excludes Companion + Lounge by
 * default since those aren't "production" squads). Useful for headline
 * stats.
 */
export function totalProductionSlots(rebirthLevel: number): number {
  return getMaxSlots("WORKER", rebirthLevel) + getMaxSlots("ASTROMECH", rebirthLevel) + getMaxSlots("BATTLE", rebirthLevel);
}
