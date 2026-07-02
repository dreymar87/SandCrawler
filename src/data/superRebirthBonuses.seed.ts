/**
 * Super Rebirth bonuses keyed by the Standard Rebirth level you SR'd from.
 *
 * Source: workbook header "NOVA CRYSTALS / RB LEVEL" in
 * Fortnite_Star_Wars_Droid_Tycoon_Tracker_TEMPLATE.xlsx (Cait/Omega).
 * These are one-time rewards granted at the moment you Super Rebirth —
 * not stacking per-rebirth rewards earned by passing each level. They
 * only apply when SR'ing from RB12 or higher.
 */
import type { SuperRebirthBonus } from "../types";

export const SUPER_REBIRTH_BONUSES: readonly SuperRebirthBonus[] = [
  { rbLevel: 12, crystals: 11, creditMult: 0.22, xpMult: 1.1 },
  { rbLevel: 13, crystals: 16, creditMult: 0.32, xpMult: 1.6 },
  { rbLevel: 14, crystals: 22, creditMult: 0.44, xpMult: 2.2 },
  { rbLevel: 15, crystals: 29, creditMult: 0.58, xpMult: 2.9 },
  { rbLevel: 16, crystals: 37, creditMult: 0.74, xpMult: 3.7 },
  { rbLevel: 17, crystals: 46, creditMult: 0.92, xpMult: 4.6 },
  { rbLevel: 18, crystals: 56, creditMult: 1.12, xpMult: 5.6 },
  { rbLevel: 19, crystals: 67, creditMult: 1.34, xpMult: 6.7 },
  { rbLevel: 20, crystals: 79, creditMult: 1.58, xpMult: 7.9 },
  { rbLevel: 21, crystals: 92, creditMult: 1.84, xpMult: 9.2 },
  { rbLevel: 22, crystals: 106, creditMult: 2.12, xpMult: 10.6 },
  { rbLevel: 23, crystals: 121, creditMult: 2.42, xpMult: 12.1 },
  { rbLevel: 24, crystals: 137, creditMult: 2.74, xpMult: 13.7 },
  { rbLevel: 25, crystals: 154, creditMult: 3.08, xpMult: 15.4 },
  { rbLevel: 26, crystals: 172, creditMult: 3.44, xpMult: 17.2 },
  { rbLevel: 27, crystals: 191, creditMult: 3.82, xpMult: 19.1 },
];
