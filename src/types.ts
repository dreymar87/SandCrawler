/**
 * Core type contracts. Everything else in the app depends on these.
 *
 * Tier names mirror the in-game labels (uppercase): DEFAULT → BESKAR.
 * Higher tiers satisfy lower-tier requirements (substitution rule).
 */

export type Tier = "DEFAULT" | "GOLD" | "DIAMOND" | "RAINBOW" | "BESKAR";

export type DroidClass = "WORKER" | "ASTROMECH" | "BATTLE" | "UNKNOWN";

export interface DroidDef {
  canonical: string;
  aliases?: string[];
  class: DroidClass;
  tags?: string[];
}

export interface RosterEntry {
  /** Canonical droid name; used to look up the DroidDef. */
  droidId: string;
  /** Logged in your Droidex at all. */
  owned: boolean;
  /** Currently active (Working OR Lounge). Only active droids count toward rebirths. */
  active: boolean;
  tier: Tier;
  notes?: string;
}

export interface RebirthReq {
  /** Canonical name as it appears in the seed dictionary. */
  name: string;
  tier: Tier;
}

export interface StandardRebirth {
  /** 1-indexed; the in-game label is "Rebirth N". */
  level: number;
  /** Free-text credit cost as the game shows it: "10K", "21B", "810B". */
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

/**
 * The full persisted payload. Wrapped with a schemaVersion so exports from
 * older app versions (and the prototype's flat-array format) keep importing.
 */
export interface PersistedState {
  schemaVersion: number;
  roster: RosterEntry[];
  /** User-added droids the seed dictionary doesn't know about yet. */
  customDroids: DroidDef[];
  superRebirths: SuperRebirth[];
  /** User edits applied on top of the seed Standard Rebirth table. */
  standardOverrides: StandardRebirth[];
  ui: UiPrefs;
}

export interface UiPrefs {
  activeTab: TabKey;
  tierFilter?: Tier;
  classFilter?: DroidClass;
  /** Free-text current credits, e.g. "1.2M". Used by "next unlock" scoring. */
  creditsCurrent: string;
}

export type TabKey =
  | "collection"
  | "standard"
  | "super"
  | "next-unlock"
  | "data";

/**
 * Export envelope. The "app" field is a guard against importing random JSON.
 */
export interface ExportEnvelope {
  app: "sandcrawler";
  schemaVersion: number;
  exportedAt: string;
  payload: PersistedState;
}
