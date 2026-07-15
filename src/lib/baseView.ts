import { SQUAD_DEFS } from "../data/squads.seed";
import { getMaxSlots } from "./squads";
import { isDroidSafeToSell } from "./cycleStrategy";
import { parseCredits, formatCredits } from "./credits";
import { normalizeName } from "./normalize";
import type {
  CollectionCard,
  DroidDef,
  DroidStats,
  Rarity,
  RebirthCycle,
  Tier,
} from "../types";

/** Standard Rebirth levels that unlock an extra credit-bought Lounge slot. */
export const LOUNGE_RB_UNLOCKS: readonly number[] = [17, 18]; // 19/20 unconfirmed
/** Base credit-bought Lounge slots available immediately (for a credit cost). */
export const LOUNGE_BASE_SLOTS = 5;

/** How many RB-gated credit Lounge slots are available at `rb`. */
export function loungeRbUnlocksAt(rb: number): number {
  return LOUNGE_RB_UNLOCKS.filter((lvl) => rb >= lvl).length;
}

/** Max credit-bought Lounge slots you could own at `rb` (base + RB unlocks). */
export function maxLoungeCreditSlots(rb: number): number {
  return LOUNGE_BASE_SLOTS + loungeRbUnlocksAt(rb);
}

/** Total Lounge capacity = credit-bought slots + persistent Nova-Shop slots. */
export function loungeCapacity(creditSlots: number, novaSlots: number): number {
  return creditSlots + novaSlots;
}

/** The next RB level that unlocks a Lounge credit slot, or null if none left. */
export function nextLoungeUnlock(rb: number): number | null {
  for (const lvl of LOUNGE_RB_UNLOCKS) if (lvl > rb) return lvl;
  return null;
}

export interface DeployedDroid {
  name: string;
  tier: Tier;
  count: number;
}

/** The three production classes that map 1:1 to a squad. */
export type ProductionClass = "WORKER" | "ASTROMECH" | "BATTLE";

export interface SquadFill {
  type: ProductionClass;
  label: string;
  accent: string;
  deployed: number;
  capacity: number;
  droids: DeployedDroid[];
}

export interface LoungeFill {
  deployed: number;
  creditSlots: number;
  novaSlots: number;
  maxCreditSlots: number;
  capacity: number;
  nextUnlock: number | null;
  droids: DeployedDroid[];
}

export interface SellCandidate {
  name: string;
  tier: Tier;
  rarity: Rarity;
  /** Sell/value label from the stats table, or null when unknown. */
  value: string | null;
}

export interface BaseView {
  squads: SquadFill[];
  lounge: LoungeFill;
  sellCandidates: SellCandidate[];
  /** Formatted sum of sell-candidate values, e.g. "1.24B". */
  sellTotal: string;
}

const PRODUCTION_CLASSES: readonly ProductionClass[] = ["WORKER", "ASTROMECH", "BATTLE"];

export interface BuildBaseViewArgs {
  cards: readonly CollectionCard[];
  dict: readonly DroidDef[];
  stats: DroidStats;
  standardRebirth: number;
  loungeCreditSlots: number;
  novaLoungeSlots: number;
  cycle: RebirthCycle;
}

/**
 * Derive the Base tab view from the player's cards + profile. Pure so
 * it can be unit-tested. Squad fill sums `working` counts by the droid's
 * class; Lounge sums `lounge` across all cards. Sell candidates are
 * owned droids no future rebirth in `cycle` needs.
 */
export function buildBaseView({
  cards,
  dict,
  stats,
  standardRebirth,
  loungeCreditSlots,
  novaLoungeSlots,
  cycle,
}: BuildBaseViewArgs): BaseView {
  const byKey = new Map<string, DroidDef>();
  for (const d of dict) {
    byKey.set(normalizeName(d.canonical), d);
    for (const a of d.aliases ?? []) byKey.set(normalizeName(a), d);
  }
  const resolve = (name: string): DroidDef | undefined => byKey.get(normalizeName(name));

  // Squad fill for the three production classes.
  const squads: SquadFill[] = PRODUCTION_CLASSES.map((cls) => {
    const def = SQUAD_DEFS[cls];
    const droids: DeployedDroid[] = [];
    let deployed = 0;
    for (const c of cards) {
      if (c.working <= 0) continue;
      if (resolve(c.name)?.class !== cls) continue;
      deployed += c.working;
      droids.push({ name: c.name, tier: c.tier, count: c.working });
    }
    droids.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return {
      type: cls,
      label: def.label,
      accent: def.accent,
      deployed,
      capacity: getMaxSlots(cls, standardRebirth),
      droids,
    };
  });

  // Lounge: sum `lounge` across every card, regardless of class.
  const loungeDroids: DeployedDroid[] = [];
  let loungeDeployed = 0;
  for (const c of cards) {
    if (c.lounge <= 0) continue;
    loungeDeployed += c.lounge;
    loungeDroids.push({ name: c.name, tier: c.tier, count: c.lounge });
  }
  loungeDroids.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const lounge: LoungeFill = {
    deployed: loungeDeployed,
    creditSlots: loungeCreditSlots,
    novaSlots: novaLoungeSlots,
    maxCreditSlots: maxLoungeCreditSlots(standardRebirth),
    capacity: loungeCapacity(loungeCreditSlots, novaLoungeSlots),
    nextUnlock: nextLoungeUnlock(standardRebirth),
    droids: loungeDroids,
  };

  // Sell candidates: owned cards whose droid isn't needed later this cycle.
  const sellCandidates: SellCandidate[] = [];
  let sellTotalCredits = 0n;
  for (const c of cards) {
    if (!c.owned) continue;
    if (!isDroidSafeToSell(c.name, cycle, standardRebirth)) continue;
    const def = resolve(c.name);
    const value = stats[def?.canonical ?? c.name]?.[c.tier]?.value ?? null;
    if (value) sellTotalCredits += parseCredits(value);
    sellCandidates.push({
      name: c.name,
      tier: c.tier,
      rarity: def?.rarity ?? "COMMON",
      value,
    });
  }
  sellCandidates.sort((a, b) => a.name.localeCompare(b.name));

  return {
    squads,
    lounge,
    sellCandidates,
    sellTotal: formatCredits(sellTotalCredits),
  };
}
