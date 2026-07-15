import type { DroidClass, Rarity, TabKey, Tier } from "./types";

/**
 * Tier ordering: upgrade path (DEFAULT → BESKAR) plus FLAWLESS as a
 * 6th slot. FLAWLESS isn't reached by upgrading — it's a 1/1000 spawn
 * variant — but a FLAWLESS card outranks BESKAR for tier substitution.
 */
export const TIERS = [
  "DEFAULT",
  "GOLD",
  "DIAMOND",
  "RAINBOW",
  "BESKAR",
  "FLAWLESS",
] as const satisfies readonly Tier[];

/** Upgrade-progression tiers (FLAWLESS excluded). Used by stat tables and chip costs. */
export const UPGRADE_TIERS = ["DEFAULT", "GOLD", "DIAMOND", "RAINBOW", "BESKAR"] as const satisfies readonly Tier[];

export const CLASSES = ["WORKER", "ASTROMECH", "BATTLE", "UNKNOWN"] as const satisfies readonly DroidClass[];

export const RARITIES = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "ICONIC"] as const satisfies readonly Rarity[];

/** The highest Standard Rebirth level we have data for. */
export const MAX_STANDARD_REBIRTH = 27;

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
