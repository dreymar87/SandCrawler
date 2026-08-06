import {
  SCRAP_SWINGS_PER_SEC,
  SCRAP_TIERS,
  scrapPayoutMultiple,
  scrapSwingsToBreak,
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
 * Your droid generation, implied by what a scrap pile paid.
 *
 * The payout is a pure function of tier and your generation — swings to break
 * don't enter into it, because a pile pays once regardless of how long it took:
 *
 *     payout = 0.5 s × scrapValueLevel × creditsPerSec × payoutMultiple(tier)
 *
 * A common pile is the cleanest anchor (multiple of 1), which is why the UI
 * nudges toward one.
 */
export function creditsPerSecFromPile({
  pileValue,
  tier,
  scrapValueLevel,
}: {
  /** What the pile paid — accepts the app's usual "5M" notation. */
  pileValue: string;
  tier: ScrapTierKey;
  scrapValueLevel: number;
}): number | null {
  const total = Number(parseCredits(pileValue));
  const seconds = scrapSwingSeconds(scrapValueLevel);
  if (!Number.isFinite(total) || total <= 0 || seconds <= 0) return null;
  return total / scrapPayoutMultiple(tier) / seconds;
}

/**
 * Credits per swing from a tier, relative to a common pile, using an observed
 * swing count.
 *
 * This is where tier stops being cosmetic. Payout climbs 1/2/4/8 while swings
 * to break climb far more slowly — a player at pickaxe 10-11 one-shots common
 * and breaks rainbow in "2 or 3, usually", making a rainbow swing worth ~3.2
 * common ones. It scales with pickaxe, so it's per-player, not a constant.
 */
export function perSwingMultiple(tier: ScrapTierKey, observedSwings?: number | null): number | null {
  const swings = observedSwings && observedSwings > 0 ? observedSwings : scrapSwingsToBreak(tier);
  if (!swings || swings <= 0) return null;
  return scrapPayoutMultiple(tier) / swings;
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
 * Both halves scale with the same droid generation — the payout is a multiple
 * of it — so the split is a function of Scrap Value level and how much of a run
 * you spend swinging, rather than something to measure separately. An earlier
 * "95% of income comes from scrapping" reading turned out to be impossible
 * under this arithmetic.
 *
 * Computed on COMMON piles, so the scrap half is a floor: higher tiers pay more
 * per swing than a common pile does (see `perSwingMultiple`), and how much more
 * depends on unmeasured swing counts for gold and diamond.
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
