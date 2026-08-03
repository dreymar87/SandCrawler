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

// All five rows come from the Information tab of the Rebirth Cycles workbook,
// and each row's steps sum exactly to its stated total — the tab is internally
// consistent, and the tracker's reference sheet independently confirms the
// EPIC and LEGENDARY numbers. (The workbook's "RB 28+" tab shows a different
// MYTHIC table, but it lists only 4 steps for 5 tiers and matches no stated
// total, so the Information tab wins.)
export const CHIP_COSTS: readonly ChipCostRow[] = [
  { rarity: "COMMON", steps: [10, 25, 40, 80, 120], total: 275, cantinaOdds: 30 },
  { rarity: "RARE", steps: [30, 60, 100, 250, 400], total: 840, cantinaOdds: 16 },
  { rarity: "EPIC", steps: [120, 180, 240, 3000, 6000], total: 9540, cantinaOdds: 8 },
  { rarity: "LEGENDARY", steps: [400, 1200, 3000, 7500, 20000], total: 32100, cantinaOdds: 4 },
  // MYTHIC droids are sandcrawler-only (not in the cantina daily rotation).
  { rarity: "MYTHIC", steps: [4000, 8000, 20000, 40000, 70000], total: 142000, cantinaOdds: 0 },
];
