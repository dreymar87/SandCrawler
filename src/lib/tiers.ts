import { TIERS } from "../constants";
import type { Tier } from "../types";

/**
 * Position of `t` within `TIERS`. Unknown values default to 0 (DEFAULT) so
 * legacy data with mislabeled tiers doesn't blow up readiness checks — it
 * just under-reports.
 */
export function tierRank(t: Tier | string): number {
  const i = (TIERS as readonly string[]).indexOf(t);
  return i < 0 ? 0 : i;
}

/** Higher tiers cover lower-tier requirements. */
export function satisfies(reqTier: Tier, ownedTier: Tier): boolean {
  return tierRank(ownedTier) >= tierRank(reqTier);
}

/**
 * Normalises stray casing / aliases from older data into canonical tier
 * strings. The prototype used Title-case ("Default"); the game uses uppercase
 * ("DEFAULT"). "Basic" is community shorthand for DEFAULT.
 */
export function normalizeTier(t: string | undefined): Tier {
  if (!t) return "DEFAULT";
  const up = String(t).trim().toUpperCase();
  if (up === "BASIC") return "DEFAULT";
  // FLAWLESS is no longer a tier (it's a cosmetic shiny). Legacy FLAWLESS
  // cards were the top tier at the time → coerce to BESKAR.
  if (up === "FLAWLESS") return "BESKAR";
  return (TIERS as readonly string[]).includes(up) ? (up as Tier) : "DEFAULT";
}

/**
 * Cost of bridging from owned tier up to required tier — used by next-unlock
 * scoring to prefer "I'm one upgrade away" over "I don't own this at all".
 */
export function tierGap(reqTier: Tier, ownedTier: Tier | null): number {
  if (ownedTier === null) return TIERS.length;
  return Math.max(0, tierRank(reqTier) - tierRank(ownedTier));
}
