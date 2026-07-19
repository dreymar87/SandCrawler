/**
 * Upgrade-chip costs per droid rarity, plus cantina-upgrade odds.
 * Source: starscurse's Rebirth Cycles workbook, Information tab.
 * Game facts, not copyrightable. ICONIC droids don't upgrade — no row.
 */
import type { Rarity } from "../types";

export interface ChipCostRow {
  rarity: Exclude<Rarity, "ICONIC">;
  /**
   * Sequential upgrade costs: DEFAULT→GOLD, GOLD→DIAMOND, DIAMOND→RAINBOW,
   * RAINBOW→BESKAR, BESKAR→GALACTIC. `null` = step exists but cost unknown.
   */
  steps: readonly [number, number, number, number, number | null];
  total: number;
  /** Cantina daily-upgrade chance for this rarity (percentage). */
  cantinaOdds: number;
}

// Base DEFAULT→BESKAR values are the app's existing verified numbers (kept
// as-is per user); the BESKAR→GALACTIC 5th step is from the community sheet.
export const CHIP_COSTS: readonly ChipCostRow[] = [
  { rarity: "COMMON", steps: [10, 25, 40, 80, 120], total: 275, cantinaOdds: 30 },
  { rarity: "RARE", steps: [30, 60, 100, 250, 400], total: 840, cantinaOdds: 16 },
  { rarity: "EPIC", steps: [120, 180, 240, 5000, 9000], total: 14540, cantinaOdds: 8 },
  { rarity: "LEGENDARY", steps: [400, 1200, 4000, 12000, 35000], total: 52600, cantinaOdds: 4 },
  // MYTHIC droids are sandcrawler-only (not in the cantina daily rotation).
  { rarity: "MYTHIC", steps: [8000, 15000, 40000, 80000, 120000], total: 263000, cantinaOdds: 0 },
];
