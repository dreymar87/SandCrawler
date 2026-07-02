import type { CollectionCard, DroidStats } from "../types";
import { parseIncome, formatCredits } from "./credits";

export interface ProductionTotals {
  /** Flat credits per second from all active, non-MYTHIC cards. */
  flat: bigint;
  /** Percentage boosters' raw labels, e.g. ["5%/s", "5%/s"]. UI displays them
   *  alongside flat income since they multiply rather than add. */
  percentLabels: string[];
  /** Count of active cards that contributed to `flat`. */
  contributors: number;
}

/**
 * Sums per-second income across Working cards. Lounge droids are
 * rebirth-eligible but produce zero credits, so they don't count here.
 * Each card's income multiplies by `card.working` — duplicates work.
 *
 * Percentage boosters (ICONIC events like BB8, R2-D2) aren't additive
 * with flat credits/sec, so they're returned as raw labels for the UI
 * to render separately. They contribute once per active copy.
 */
export function computeProduction(
  cards: readonly CollectionCard[],
  stats: DroidStats,
): ProductionTotals {
  let flat = 0n;
  const percentLabels: string[] = [];
  let contributors = 0;

  for (const card of cards) {
    if (card.working <= 0) continue;
    const stat = stats[card.name]?.[card.tier];
    if (!stat) continue;
    const v = parseIncome(stat.income);
    if (v === null) {
      // Percentage boosters — one label per working copy so the multiplicative
      // effect is visible ("+ 15%/s + 15%/s" for two working BB8s).
      for (let i = 0; i < card.working; i++) percentLabels.push(stat.income);
    } else if (v > 0n) {
      flat += v * BigInt(card.working);
      contributors += card.working;
    }
  }

  return { flat, percentLabels, contributors };
}

/** Convenience for the Profile panel: format the flat credits/sec total. */
export function formatPerSecond(n: bigint): string {
  return `${formatCredits(n)}/s`;
}
