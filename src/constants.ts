import type { DroidClass, Rarity, TabKey, Tier } from "./types";

/**
 * Tier ladder, low → high: DEFAULT → GOLD → DIAMOND → RAINBOW → BESKAR →
 * GALACTIC. All are reachable by spending upgrade chips. (FLAWLESS is a
 * cosmetic "shiny" spawn variant orthogonal to tier — not a tier — so it
 * isn't in this list.)
 */
export const TIERS = [
  "DEFAULT",
  "GOLD",
  "DIAMOND",
  "RAINBOW",
  "BESKAR",
  "GALACTIC",
] as const satisfies readonly Tier[];

/** Upgrade-progression tiers — same as TIERS now (every tier is an upgrade target). */
export const UPGRADE_TIERS = TIERS;

export const CLASSES = ["WORKER", "ASTROMECH", "BATTLE", "UNKNOWN"] as const satisfies readonly DroidClass[];

export const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "ICONIC"] as const satisfies readonly Rarity[];

/**
 * Text-color token per droid class — used to color droid names across the
 * Droidex, My base, and Safe-to-sell so classes pop at a glance.
 * Worker = green, Astromech = purple, Battle = red. (Astromech uses the
 * galactic/violet token, not tier-diamond which is blue.)
 */
export const CLASS_COLOR: Record<DroidClass, string> = {
  WORKER: "text-ok",
  ASTROMECH: "text-tier-galactic",
  BATTLE: "text-danger",
  UNKNOWN: "text-muted",
};

/** The highest Standard Rebirth level we track SRB bonuses for. */
export const MAX_STANDARD_REBIRTH = 30;

/**
 * Credit suffix multipliers. The game shows values like "10.00K", "1.36B";
 * the stats sheet uses lowercase ("3.8k", "112.50m"). Parsing is
 * case-insensitive. Kept as bigint so we don't lose precision past 2^53.
 */
export const CREDIT_SUFFIXES: Record<string, bigint> = {
  K: 1_000n,
  M: 1_000_000n,
  B: 1_000_000_000n,
  T: 1_000_000_000_000n,
  Q: 1_000_000_000_000_000n,
};

export const TAB_LABELS: Record<TabKey, string> = {
  base: "Base",
  droidex: "Droidex",
  rebirths: "Rebirths",
  shop: "Shop",
  profile: "Profile",
};

export const TAB_ORDER: TabKey[] = ["base", "droidex", "rebirths", "shop", "profile"];
