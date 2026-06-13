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
 * Sums per-second income across active cards. Skipping inactive cards is
 * the whole reason `active` exists on a CollectionCard — only deployed
 * droids actually generate credits.
 *
 * Percentage boosters (MYTHIC events like BB8) aren't additive with flat
 * credits/sec, so they're returned as raw labels for the UI to render
 * separately.
 */
export function computeProduction(
  cards: readonly CollectionCard[],
  stats: DroidStats,
): ProductionTotals {
  let flat = 0n;
  const percentLabels: string[] = [];
  let contributors = 0;

  for (const card of cards) {
    if (!card.active) continue;
    const stat = stats[card.name]?.[card.tier];
    if (!stat) continue;
    const v = parseIncome(stat.income);
    if (v === null) {
      percentLabels.push(stat.income);
    } else if (v > 0n) {
      flat += v;
      contributors += 1;
    }
  }

  return { flat, percentLabels, contributors };
}

/** Convenience for the Profile panel: format the flat credits/sec total. */
export function formatPerSecond(n: bigint): string {
  return `${formatCredits(n)}/s`;
}
