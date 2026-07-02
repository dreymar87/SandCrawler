/**
 * Upgrade-chip costs per droid rarity, plus cantina-upgrade odds.
 * Source: starscurse's Rebirth Cycles workbook, Information tab.
 * Game facts, not copyrightable. ICONIC droids don't upgrade — no row.
 */
import type { Rarity } from "../types";

export interface ChipCostRow {
  rarity: Exclude<Rarity, "ICONIC">;
  /** Sequential upgrade costs: DEFAULT→GOLD, GOLD→DIAMOND, DIAMOND→RAINBOW, RAINBOW→BESKAR. */
  steps: readonly [number, number, number, number];
  total: number;
  /** Cantina daily-upgrade chance for this rarity (percentage). */
  cantinaOdds: number;
}

export const CHIP_COSTS: readonly ChipCostRow[] = [
  { rarity: "COMMON", steps: [10, 25, 40, 80], total: 155, cantinaOdds: 30 },
  { rarity: "RARE", steps: [30, 60, 100, 250], total: 440, cantinaOdds: 16 },
  { rarity: "EPIC", steps: [120, 180, 240, 5000], total: 5540, cantinaOdds: 8 },
  { rarity: "LEGENDARY", steps: [400, 1200, 4000, 12000], total: 17600, cantinaOdds: 4 },
  // MYTHIC droids are sandcrawler-only (not in the cantina daily rotation).
  { rarity: "MYTHIC", steps: [8000, 15000, 40000, 80000], total: 143000, cantinaOdds: 0 },
];
