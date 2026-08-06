import {
  SCRAP_SWINGS_PER_SEC,
  SCRAP_TIERS,
  scrapPileSwings,
  scrapSwingSeconds,
  type ScrapTierKey,
} from "../data/strategyTracks.seed";
import type { UiPrefs } from "../types";
import { parseCredits } from "./credits";

/**
 * Turning a scrap pile you can read off the screen into the credits/s the
 * strategy model needs.
 *
 * The game never displays a credits-per-second figure, so the Strategy tab has
 * been asking for a number nobody can actually produce — and falling back on
 * Droidex income, which misses the scrap station entirely and understated one
 * player's real rate by orders of magnitude.
 *
 * A scrap pile solves it, because the shop tells us what a swing is worth in
 * terms of the rate: at Scrap Value L3 a swing pays "1.5 seconds of base credit
 * generation". Invert that and the pile becomes a meter.
 */

export interface ScrapReading {
  tier: ScrapTierKey;
  pileValue: string;
  /** Empty means "the tier's expected count" rather than zero swings. */
  swings: number | null;
}

const DEFAULT_READING: ScrapReading = { tier: "COMMON", pileValue: "", swings: null };

/**
 * Read the stored scrap reading defensively.
 *
 * Every other persisted UI pref is a scalar that survives a bad value harmlessly;
 * this one is an object, so a hand-edited or partially-written backup could
 * otherwise reach the component as `{ tier: 42 }`. Normalising here means the
 * UI can treat the shape as guaranteed without a schema bump.
 */
export function scrapReadingFrom(ui: UiPrefs | undefined): ScrapReading {
  const raw = ui?.scrapReading;
  if (!raw || typeof raw !== "object") return DEFAULT_READING;
  const tier = SCRAP_TIERS.find((t) => t.key === raw.tier)?.key ?? DEFAULT_READING.tier;
  const pileValue = typeof raw.pileValue === "string" ? raw.pileValue : "";
  const swings =
    typeof raw.swings === "number" && Number.isFinite(raw.swings) && raw.swings > 0
      ? Math.round(raw.swings)
      : null;
  return { tier, pileValue, swings };
}

/**
 * Credits/s implied by a scrap pile, or null when the inputs can't support one.
 *
 * `swings` defaults to the tier's expected count. Override it when your pickaxe
 * level is below the pile's — the pile is worth the same but costs extra swings,
 * so the per-swing payout (and therefore the implied rate) is lower.
 */
export function creditsPerSecFromPile({
  pileValue,
  tier,
  scrapValueLevel,
  swings,
}: {
  /** What the pile paid — accepts the app's usual "5M" notation. */
  pileValue: string;
  tier: ScrapTierKey;
  scrapValueLevel: number;
  swings?: number;
}): number | null {
  const total = Number(parseCredits(pileValue));
  const seconds = scrapSwingSeconds(scrapValueLevel);
  const hits = swings && swings > 0 ? swings : scrapPileSwings(tier);
  if (!Number.isFinite(total) || total <= 0 || seconds <= 0) return null;
  return total / hits / seconds;
}

export interface ScrapIncome {
  /** Passive droid generation — the rate everything else is a multiple of. */
  droids: number;
  /** Scrap-station credits/s, after uptime scaling. */
  scrap: number;
  total: number;
  /** Fraction of total income coming from swinging (0..1). */
  scrapShare: number;
  /**
   * What one extra credit/s of DROID income is actually worth to you, once the
   * swing multiplies it. This is the number that makes the case for fixing your
   * roster ahead of buying scrap upgrades.
   */
  droidLeverage: number;
}

/**
 * Split a credit rate into its passive and active halves.
 *
 * Both halves scale with the same droid generation — the swing pays a multiple
 * of it — so the split is a pure function of Scrap Value level and how much of
 * a run you spend swinging. It is NOT something to measure separately, and an
 * earlier "95% of income comes from scrapping" reading turned out to be
 * impossible under this arithmetic: the share is bounded by Scrap Value's own
 * ladder, at 83% for a maxed L19 player swinging constantly.
 */
export function scrapIncome({
  creditsPerSec,
  scrapValueLevel,
  swingUptime,
}: {
  creditsPerSec: number;
  scrapValueLevel: number;
  swingUptime: number;
}): ScrapIncome {
  const droids = Math.max(0, creditsPerSec);
  const uptime = Number.isFinite(swingUptime) ? Math.min(1, Math.max(0, swingUptime)) : 1;
  // seconds-of-generation per swing x swings per second x share of time at it
  const leverage = scrapSwingSeconds(scrapValueLevel) * SCRAP_SWINGS_PER_SEC * uptime;
  const scrap = droids * leverage;
  const total = droids + scrap;
  return {
    droids,
    scrap,
    total,
    scrapShare: total > 0 ? scrap / total : 0,
    droidLeverage: 1 + leverage,
  };
}

/**
 * How a scrap-derived rate compares with what the Droidex can see.
 *
 * `estimated` should already include the player's credit multiplier. A large
 * gap almost always means the recorded roster no longer matches the base rather
 * than anything wrong with the model — it's been sitting unexplained in
 * MECHANICS.md §1 as a "~25x discrepancy" with nowhere to surface.
 */
export const RECONCILE_WARN_RATIO = 3;

export function reconcileRate(
  derived: number,
  estimated: number,
): { ratio: number; agrees: boolean } | null {
  if (!(derived > 0) || !(estimated > 0)) return null;
  const ratio = derived / estimated;
  return { ratio, agrees: ratio <= RECONCILE_WARN_RATIO && ratio >= 1 / RECONCILE_WARN_RATIO };
}
