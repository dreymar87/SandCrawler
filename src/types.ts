/**
 * Core type contracts. Everything else in the app depends on these.
 *
 * Tier names mirror the in-game labels (uppercase): DEFAULT → BESKAR.
 * Higher tiers satisfy lower-tier requirements (substitution rule).
 */

/**
 * Upgrade tiers. DEFAULT → BESKAR is the upgrade path; FLAWLESS is a
 * separate 1/1000 spawn variant tracked as a 6th tier slot in the
 * Droidex. Tier substitution still uses the rank index — a FLAWLESS
 * card outranks BESKAR for requirement coverage.
 */
export type Tier = "DEFAULT" | "GOLD" | "DIAMOND" | "RAINBOW" | "BESKAR" | "FLAWLESS";

/** In-game droid "type" (the squad it belongs to). UNKNOWN is for user-added droids. */
export type DroidClass = "WORKER" | "ASTROMECH" | "BATTLE" | "UNKNOWN";

/**
 * Collection rarity, low → high.
 *
 * MYTHIC and ICONIC are distinct top rarities: MYTHIC droids (SNOW MOUSE,
 * MO-TRAK, …) upgrade normally (DEFAULT→BESKAR + FLAWLESS) and have chip
 * costs; ICONIC droids (BB8, R2-D2, …) are event-locked, DEFAULT-only, and
 * give a percentage income boost. (Historically we briefly used "MYTHIC"
 * for what are now ICONIC droids — migration v3→v4 rewrote those labels.)
 */
export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC" | "ICONIC";

/**
 * Standard Rebirth requirements cycle through 4 tables. Cycle =
 * (superRebirthCount mod 4) + 1, with an optional manual override.
 */
export type RebirthCycle = 1 | 2 | 3 | 4;

export interface DroidDef {
  /** Canonical in-game name, ALL-CAPS (e.g. "MONO-WALKER"). */
  canonical: string;
  /** Community / guide spellings that should resolve to this droid. */
  aliases?: string[];
  /** In-game type / squad. */
  class: DroidClass;
  rarity: Rarity;
  /** Tiers this droid can spawn at. ICONIC event droids skip upgrade tiers. */
  tiers: Tier[];
  /** Event-locked droids can't be upgraded past DEFAULT. */
  eventLocked?: boolean;
  /** Not yet released (e.g. CB-23 today). */
  comingSoon?: boolean;
  /**
   * Unique companion effect granted while this droid is deployed
   * (currently only populated for ICONIC droids — non-ICONIC droids get
   * per-rarity companion buffs that are shared across every droid of
   * that rarity/class, tracked separately). Free-text label; UI just
   * renders it as a hint.
   */
  companionEffect?: string;
  tags?: string[];
}

/**
 * A single Droidex card = a droid at a specific tier. You can own the
 * same droid at multiple tiers as distinct cards (matches the in-game
 * Droidex).
 *
 * Cards are stored sparsely: an entry exists only when owned or deployed
 * anywhere (working > 0 or lounge > 0).
 */
export interface CollectionCard {
  /** Canonical droid name. */
  name: string;
  tier: Tier;
  /** Collected in your Droidex at all. Auto-true when working+lounge > 0. */
  owned: boolean;
  /** How many are on production duty (Worker/Astromech/Battle) — mines credits. */
  working: number;
  /** How many are parked in the Lounge (rebirth-eligible, but no credits). */
  lounge: number;
  notes?: string;
}

/** Where the player currently is. Powers squad capacity + next-unlock filtering. */
export interface Profile {
  /** Optional name for the player's base, shown on Home / Profile. */
  baseName?: string;
  /** Current Standard Rebirth level (0–23). */
  standardRebirth: number;
  /**
   * Total Super Rebirths completed. The active rebirth cycle is
   * `(superRebirthCount % 4) + 1` unless `cycleOverride` is set.
   */
  superRebirthCount: number;
  /** Manual pin if the user wants to lock a cycle instead of deriving it. */
  cycleOverride: RebirthCycle | null;
  /** Current credit balance, free-text ("1.2M"). Moved from ui in v6. */
  currentCredits: string;
  /** Total Nova Crystals the player has earned across their account. */
  novaEarned: number;
  /** Total Nova Crystals spent (in the shop or elsewhere). */
  novaSpent: number;
  /** Optional current Upgrade Chip balance. */
  upgradeChips?: number;
}

export interface RebirthReq {
  /** Canonical name as it appears in the seed dictionary. */
  name: string;
  tier: Tier;
}

export type SquadType = "COMPANION" | "LOUNGE" | "WORKER" | "ASTROMECH" | "BATTLE";

export interface StandardRebirth {
  /** 1-indexed; the in-game label is "Rebirth N". */
  level: number;
  /** Which rebirth cycle this row belongs to. */
  cycle: RebirthCycle;
  /** Free-text credit cost as the game shows it: "10K", "21B", "6T". */
  credits: string;
  needs: RebirthReq[];
  /**
   * Safe-to-sell guidance for this cycle/level: canonical droid names,
   * or the special token "DO_NOT_SELL". Empty = nothing to sell at this step.
   */
  sellList: string[];
  /** Which squad gains a slot at this rebirth, or null. */
  slotUnlock: SquadType | null;
  /** "seed" = baked in from research; "user" = added/edited locally. */
  source?: "seed" | "user";
  notes?: string;
}

/**
 * One-time Super Rebirth bonus keyed by the RB level you SR'd from.
 * The workbook column reads "NOVA CRYSTALS/RB LEVEL". RB 12..23 only.
 */
export interface SuperRebirthBonus {
  rbLevel: number;
  crystals: number;
  /** Additive credit multiplier (0.22 = +22%). */
  creditMult: number;
  /** Additive XP multiplier (1.1 = +110%). */
  xpMult: number;
}

/**
 * A cosmetic collectible. Hats, Paints, and Droid Effects each have their
 * own kind so the UI can group them. The unlock condition is stored as
 * structured `requirementKind` + numeric value where applicable, plus the
 * free-text label players see in-game.
 */
export interface CosmeticItem {
  /** Stable slug derived from name. */
  id: string;
  kind: CosmeticKind;
  name: string;
  /** Verbatim unlock requirement from the source sheet. */
  requirement: string;
  /** Structured categorisation: lets the UI link rebirth/craft milestones to specific items. */
  requirementKind: CosmeticRequirementKind;
  /** Numeric component of the requirement (e.g. 100 for "CRAFT 100 DROIDS"). */
  requirementValue?: number;
}

export type CosmeticKind = "HAT" | "PAINT" | "EFFECT";
export type CosmeticRequirementKind =
  | "WORLD"
  | "REBIRTH"
  | "CRAFT"
  | "FLAWLESS_CRAFT"
  | "BESKAR_COLLECT"
  | "RINGS"
  | "EVENT"
  | "NOVA"
  | "NONE";

export interface CosmeticState {
  id: string;
  owned: boolean;
}

/** A Nova Shop upgrade. costs[i] is the crystals you pay to reach level i+1. */
export interface NovaUpgrade {
  id: string;
  tree: "CORE" | "WORKSHOP";
  name: string;
  /** Length = max known level. `null` entries are levels whose cost is unknown. */
  costs: (number | null)[];
}

export interface NovaUpgradeState {
  id: string;
  /** Current upgrade level (0 = not purchased). */
  level: number;
}

/**
 * One-shot ICONIC droid purchase from the Nova Shop. Buying the droid
 * makes it available in your Droidex (the in-game game grants the
 * spawn rights), but SandCrawler tracks the *purchase* separately from
 * collection ownership so the crystal-spent math is exact.
 */
export interface NovaIconicPurchase {
  /** Canonical droid name; matches DroidDef.canonical. */
  droid: string;
  crystals: number;
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
  /** User edits applied on top of the seed Standard Rebirth table. */
  standardOverrides: StandardRebirth[];
  /** Sparse: only owned cosmetics are stored. */
  cosmetics: CosmeticState[];
  /** Sparse: only purchased upgrades are stored (level > 0). */
  novaUpgrades: NovaUpgradeState[];
  /** Canonical names of ICONIC droids the user has purchased via the Nova Shop. */
  novaIconicOwned: string[];
  ui: UiPrefs;
}

export interface UiPrefs {
  activeTab: TabKey;
  tierFilter?: Tier | "ALL";
  classFilter?: DroidClass | "ALL";
  rarityFilter?: Rarity | "ALL";
  /** "ALL" | "OWNED" | "MISSING" — Droidex collected filter. */
  collectedFilter?: "ALL" | "OWNED" | "MISSING";
  /**
   * Droidex strategy filter (cycle-aware). KEEP: droids required later in
   * the active cycle. SELL: droids safe to sell now. ALL: no filter.
   */
  strategyFilter?: "ALL" | "KEEP" | "SELL";
  /** Set once the first-run intro has been dismissed. */
  hasOnboarded?: boolean;
}

/** The five primary bottom-nav destinations. */
export type TabKey = "home" | "droidex" | "rebirths" | "shop" | "profile";

/**
 * Export envelope. The "app" field is a guard against importing random JSON.
 */
export interface ExportEnvelope {
  app: "sandcrawler";
  schemaVersion: number;
  exportedAt: string;
  payload: PersistedState;
}
