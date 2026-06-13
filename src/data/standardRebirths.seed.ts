import type { StandardRebirth } from "../types";

/**
 * Complete Standard Rebirth requirements for levels 1 → 23.
 *
 * Re-derived from community sources (the open-source erikpeik/droidex
 * tracker, which mirrors community guides + in-game observation).
 * Game facts, not copyrightable. Each entry corresponds to the "from N
 * to N+1" rebirth — we label by the level you're moving TO.
 *
 * If the game adds higher rebirths or revises the table, edit this file
 * and bump SEED_VERSION in version.ts.
 */
export const STANDARD_REBIRTHS: readonly StandardRebirth[] = [
  {
    level: 1,
    credits: "10K",
    needs: [
      { name: "CB", tier: "DEFAULT" },
      { name: "PIT", tier: "DEFAULT" },
      { name: "DRK-1 PROBE", tier: "DEFAULT" },
    ],
    source: "seed",
  },
  {
    level: 2,
    credits: "150K",
    needs: [
      { name: "BDX EXPLORER", tier: "DEFAULT" },
      { name: "2BB", tier: "DEFAULT" },
      { name: "BAL-CORE", tier: "DEFAULT" },
    ],
    source: "seed",
  },
  {
    level: 3,
    credits: "975K",
    needs: [
      { name: "A-LT", tier: "DEFAULT" },
      { name: "BU-4D", tier: "DEFAULT" },
      { name: "R9", tier: "GOLD" },
    ],
    source: "seed",
  },
  {
    level: 4,
    credits: "2.95M",
    needs: [
      { name: "ARG", tier: "GOLD" },
      { name: "B1 SECURITY", tier: "GOLD" },
      { name: "GROUNDMECH", tier: "DEFAULT" },
    ],
    source: "seed",
  },
  {
    level: 5,
    credits: "5.35M",
    needs: [
      { name: "BU-4D", tier: "GOLD" },
      { name: "HOV-R", tier: "GOLD" },
      { name: "R9", tier: "DIAMOND" },
    ],
    source: "seed",
  },
  {
    level: 6,
    credits: "9.85M",
    needs: [
      { name: "GROUNDMECH", tier: "GOLD" },
      { name: "ARG", tier: "DIAMOND" },
      { name: "A-LT", tier: "DIAMOND" },
    ],
    source: "seed",
  },
  {
    level: 7,
    credits: "14.5M",
    needs: [
      { name: "BB", tier: "GOLD" },
      { name: "B1 SECURITY", tier: "DIAMOND" },
      { name: "BU-4D", tier: "DIAMOND" },
    ],
    source: "seed",
  },
  {
    level: 8,
    credits: "36M",
    needs: [
      { name: "UTIL-TEC", tier: "GOLD" },
      { name: "LO", tier: "GOLD" },
      { name: "HOV-R", tier: "DIAMOND" },
    ],
    source: "seed",
  },
  {
    level: 9,
    credits: "89M",
    needs: [
      { name: "GROUNDMECH", tier: "RAINBOW" },
      { name: "R6", tier: "GOLD" },
      { name: "TRAK-R", tier: "GOLD" },
    ],
    source: "seed",
  },
  {
    level: 10,
    credits: "220M",
    needs: [
      { name: "LO", tier: "RAINBOW" },
      { name: "HAUL-R", tier: "RAINBOW" },
      { name: "STRIKE-ORB", tier: "GOLD" },
    ],
    source: "seed",
  },
  {
    level: 11,
    credits: "550M",
    needs: [
      { name: "AMP WALKER", tier: "RAINBOW" },
      { name: "B1 HEAVY", tier: "RAINBOW" },
      { name: "BB9", tier: "DEFAULT" },
    ],
    source: "seed",
  },
  {
    level: 12,
    credits: "1.36B",
    needs: [
      { name: "PROTO-ROLLER", tier: "GOLD" },
      { name: "MECHA-DROID", tier: "DEFAULT" },
      { name: "MONO-WALKER", tier: "DEFAULT" },
    ],
    source: "seed",
  },
  {
    level: 13,
    credits: "3.40B",
    needs: [
      { name: "R7", tier: "DEFAULT" },
      { name: "CYCLO-GRAV", tier: "DEFAULT" },
      { name: "B2-RP", tier: "DEFAULT" },
    ],
    source: "seed",
  },
  {
    level: 14,
    credits: "8.45B",
    needs: [
      { name: "OPTI-STRIKE", tier: "DEFAULT" },
      { name: "MONO-WALKER", tier: "GOLD" },
      { name: "MECHA-DROID", tier: "GOLD" },
    ],
    source: "seed",
  },
  {
    level: 15,
    credits: "21B",
    needs: [
      { name: "B2-RP", tier: "GOLD" },
      { name: "BB9", tier: "GOLD" },
      { name: "R7", tier: "GOLD" },
    ],
    source: "seed",
  },
  {
    level: 16,
    credits: "52B",
    needs: [
      { name: "OPTI-STRIKE", tier: "GOLD" },
      { name: "MONO-WALKER", tier: "DIAMOND" },
      { name: "PROTO-ROLLER", tier: "DIAMOND" },
    ],
    source: "seed",
  },
  {
    level: 17,
    credits: "130B",
    needs: [
      { name: "B2-RP", tier: "DIAMOND" },
      { name: "CYCLO-GRAV", tier: "DIAMOND" },
      { name: "MECHA-DROID", tier: "DIAMOND" },
    ],
    source: "seed",
  },
  {
    level: 18,
    credits: "325B",
    needs: [
      { name: "BB9", tier: "DIAMOND" },
      { name: "R7", tier: "DIAMOND" },
      { name: "MONO-WALKER", tier: "RAINBOW" },
    ],
    source: "seed",
  },
  {
    level: 19,
    credits: "810B",
    needs: [
      { name: "B2-RP", tier: "RAINBOW" },
      { name: "CYCLO-GRAV", tier: "RAINBOW" },
      { name: "PROTO-ROLLER", tier: "RAINBOW" },
    ],
    source: "seed",
  },
  {
    level: 20,
    credits: "2T",
    needs: [
      { name: "R7", tier: "RAINBOW" },
      { name: "OPTI-STRIKE", tier: "RAINBOW" },
      { name: "MECHA-DROID", tier: "RAINBOW" },
    ],
    source: "seed",
  },
  {
    level: 21,
    credits: "3T",
    needs: [
      { name: "BB", tier: "BESKAR" },
      { name: "ORB-WALKER", tier: "BESKAR" },
      { name: "GROUNDMECH", tier: "BESKAR" },
    ],
    source: "seed",
  },
  {
    level: 22,
    credits: "4.5T",
    needs: [
      { name: "AMP WALKER", tier: "BESKAR" },
      { name: "B1 HEAVY", tier: "BESKAR" },
      { name: "PROTO-ROLLER", tier: "BESKAR" },
    ],
    source: "seed",
  },
  {
    level: 23,
    credits: "6T",
    needs: [
      { name: "OPTI-STRIKE", tier: "BESKAR" },
      { name: "MONO-WALKER", tier: "BESKAR" },
      { name: "R7", tier: "BESKAR" },
    ],
    source: "seed",
  },
];
