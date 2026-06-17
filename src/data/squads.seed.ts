/**
 * Squad slot mechanics — facts re-derived from in-game observation and
 * the erikpeik/droidex tracker. Squads decode the "Slot" reward field
 * that the prototype only labelled, never explained.
 *
 * Your base has five "squads"; each has a base slot count, with extra
 * slots unlocking at specific Standard Rebirth levels. COMPANION is a
 * single static slot. LOUNGE / WORKER / ASTROMECH / BATTLE expand.
 */
import type { SquadType, Tier } from "../types";

export type { SquadType };
export const SQUAD_TYPES: readonly SquadType[] = ["COMPANION", "LOUNGE", "WORKER", "ASTROMECH", "BATTLE"];

export interface SquadDef {
  type: SquadType;
  label: string;
  baseSlots: number;
  /** Rebirth level at which each slot beyond `baseSlots` unlocks. */
  unlocks: readonly number[];
  description: string;
  /** Tailwind text-color class for the accent. */
  accent: string;
}

export const SQUAD_DEFS: Record<SquadType, SquadDef> = {
  COMPANION: {
    type: "COMPANION",
    label: "Companion",
    baseSlots: 1,
    unlocks: [],
    description: "Your loyal companion droid.",
    accent: "text-holo",
  },
  WORKER: {
    type: "WORKER",
    label: "Worker",
    baseSlots: 4,
    unlocks: [1, 4, 7, 10, 12, 14, 16],
    description: "Droids generating credits.",
    accent: "text-ok",
  },
  ASTROMECH: {
    type: "ASTROMECH",
    label: "Astromech",
    baseSlots: 3,
    unlocks: [2, 5, 8, 11, 13, 15],
    description: "Tech / ship support droids.",
    accent: "text-tier-diamond",
  },
  BATTLE: {
    type: "BATTLE",
    label: "Battle",
    baseSlots: 2,
    unlocks: [3, 6, 9],
    description: "Combat droids.",
    accent: "text-danger",
  },
  LOUNGE: {
    type: "LOUNGE",
    label: "Lounge",
    baseSlots: 5,
    unlocks: [16, 17, 18, 19, 20],
    description: "Park droids you're saving for upcoming rebirths.",
    accent: "text-sun",
  },
};

/**
 * Which squad a droid lives in. WORKER/ASTROMECH/BATTLE map 1:1 from
 * `DroidDef.class`. COMPANION + LOUNGE aren't intrinsic to a droid; they
 * describe where it's slotted at runtime.
 */
export type DroidSquadType = Extract<SquadType, "WORKER" | "ASTROMECH" | "BATTLE">;

/** Tiers for which a droid contributes a *flat* credits/sec value to the base. */
export const FLAT_INCOME_TIERS: readonly Tier[] = ["DEFAULT", "GOLD", "DIAMOND", "RAINBOW", "BESKAR"];
