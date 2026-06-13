/**
 * Core type contracts. Everything else in the app depends on these.
 *
 * Tier names mirror the in-game labels (uppercase): DEFAULT → BESKAR.
 * Higher tiers satisfy lower-tier requirements (substitution rule).
 */

export type Tier = "DEFAULT" | "GOLD" | "DIAMOND" | "RAINBOW" | "BESKAR";

/** In-game droid "type" (the squad it belongs to). UNKNOWN is for user-added droids. */
export type DroidClass = "WORKER" | "ASTROMECH" | "BATTLE" | "UNKNOWN";

/** Collection rarity, low → high. */
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

export interface DroidDef {
  /** Canonical in-game name, ALL-CAPS (e.g. "MONO-WALKER"). */
  canonical: string;
  /** Community / guide spellings that should resolve to this droid. */
  aliases?: string[];
  /** In-game type / squad. */
  class: DroidClass;
  rarity: Rarity;
  /** Tiers this droid can reach. MYTHIC event droids are ["DEFAULT"] only. */
  tiers: Tier[];
  /** Event-locked droids can't be upgraded past DEFAULT. */
  eventLocked?: boolean;
  tags?: string[];
}

/**
 * A single Droidex card = a droid at a specific tier. Replaces the old
 * RosterEntry. You can own the same droid at multiple tiers as distinct
 * cards (matches the in-game Droidex).
 *
 * Cards are stored sparsely: an entry exists only when owned or active.
 */
export interface CollectionCard {
  /** Canonical droid name. */
  name: string;
  tier: Tier;
  /** Collected in your Droidex. */
  owned: boolean;
  /** Deployed (Working OR Lounge) — only active cards count toward rebirths. */
  active: boolean;
  notes?: string;
}

/** Where the player currently is. Powers squad capacity + next-unlock filtering. */
export interface Profile {
  /** Current Standard Rebirth level (0–23). */
  standardRebirth: number;
  /** Current Super Rebirth marker (free-text level + rank). */
  superRebirth: { level: string; rank: string };
}

export interface RebirthReq {
  /** Canonical name as it appears in the seed dictionary. */
  name: string;
  tier: Tier;
}

export interface StandardRebirth {
  /** 1-indexed; the in-game label is "Rebirth N". */
  level: number;
  /** Free-text credit cost as the game shows it: "10K", "21B", "6.00T". */
  credits: string;
  needs: RebirthReq[];
  /** "seed" = baked in from research; "user" = added/edited locally. */
  source?: "seed" | "user";
  notes?: string;
}

export interface Rank {
  id: string;
  /** Rank number as a string so users can type "1a" if the game ever surfaces sub-ranks. */
  rank: string;
  credits: string;
  /** User-set: do I currently have the credits? */
  creditsReady: boolean;
  droids: RebirthReq[];
  gain?: RebirthGain;
  notes?: string;
}

export interface RebirthGain {
  credits?: string;
  multiplier?: string;
  slot?: string;
  force?: string;
}

export interface SuperRebirth {
  id: string;
  /** Super Rebirth number, stored as string but sorted numerically. */
  level: string;
  ranks: Rank[];
}

/** Per-tier economy stats for a droid (from the community stats sheet). */
export interface DroidTierStat {
  /** Upgrade cost to reach this tier, free-text (null for event droids). */
  cost: string | null;
  /** Credits per second, e.g. "16/s", or "5%/s" for percentage boosters. */
  income: string;
  /** Sell/value, free-text (null for event droids). */
  value: string | null;
}

export type DroidStats = Record<string, Partial<Record<Tier, DroidTierStat>>>;

/**
 * The full persisted payload. Wrapped with a schemaVersion so exports from
 * older app versions (and the prototype's flat-array format) keep importing.
 */
export interface PersistedState {
  schemaVersion: number;
  /** Sparse: only owned and/or active cards are stored. */
  cards: CollectionCard[];
  profile: Profile;
  /** User-added droids the seed dictionary doesn't know about yet. */
  customDroids: DroidDef[];
  superRebirths: SuperRebirth[];
  /** User edits applied on top of the seed Standard Rebirth table. */
  standardOverrides: StandardRebirth[];
  ui: UiPrefs;
}

export interface UiPrefs {
  activeTab: TabKey;
  tierFilter?: Tier | "ALL";
  classFilter?: DroidClass | "ALL";
  rarityFilter?: Rarity | "ALL";
  /** "ALL" | "OWNED" | "MISSING" — Droidex collected filter. */
  collectedFilter?: "ALL" | "OWNED" | "MISSING";
  /** Free-text current credits, e.g. "1.2M". Used by next-unlock + progress. */
  creditsCurrent: string;
}

export type TabKey = "droidex" | "profile" | "standard" | "super" | "next-unlock" | "data";

/**
 * Export envelope. The "app" field is a guard against importing random JSON.
 */
export interface ExportEnvelope {
  app: "sandcrawler";
  schemaVersion: number;
  exportedAt: string;
  payload: PersistedState;
}
