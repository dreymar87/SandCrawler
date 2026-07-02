import { DROID_DICT } from "../data/droids.seed";
import { SCHEMA_VERSION } from "../data/version";
import type {
  CollectionCard,
  CosmeticState,
  NovaUpgradeState,
  PersistedState,
  Profile,
  RebirthCycle,
  StandardRebirth,
  TabKey,
} from "../types";
import { buildDroidIndex } from "./autocomplete";
import { normalizeTier } from "./tiers";

/**
 * Forward-migrates any historical payload into the current PersistedState.
 *
 * v0 — prototype's flat-array export (an array of rank-like records).
 * v1 — `{ superRebirths, roster }` shape from the migration brief (§4).
 * v2 — `owned`/`active` split, `customDroids`, `standardOverrides`, `ui`.
 * v3 — Card-based collection, `profile` slice, droid names uppercased.
 * v4 — Rebirth cycles, FLAWLESS tier, ICONIC rarity, cosmetics, Nova Shop.
 *      Drops the manual `superRebirths` slice; Profile gains
 *      `superRebirthCount`, `cycleOverride`, `novaEarned/Spent`.
 */
export function migrate(raw: unknown): PersistedState {
  if (Array.isArray(raw)) {
    return v4FromIntermediate(v1FromV0(raw));
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.app === "sandcrawler" && obj.payload && typeof obj.payload === "object") {
      return migrate(obj.payload);
    }
    return v4FromIntermediate(obj);
  }

  return emptyState();
}

export function emptyState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    cards: [],
    profile: defaultProfile(),
    customDroids: [],
    standardOverrides: [],
    cosmetics: [],
    novaUpgrades: [],
    novaIconicOwned: [],
    ui: { activeTab: "home" },
  };
}

export function defaultProfile(): Profile {
  return {
    standardRebirth: 0,
    superRebirthCount: 0,
    cycleOverride: null,
    currentCredits: "",
    novaEarned: 0,
    novaSpent: 0,
  };
}

// ── v0 → v1 lift (unchanged from v3) ─────────────────────────────────────
function v1FromV0(arr: unknown[]): Record<string, unknown> {
  return {
    superRebirths: [
      {
        id: makeId(),
        level: "1",
        ranks: arr.map((entry, i) => {
          const e = (entry ?? {}) as Record<string, unknown>;
          return {
            id: makeId(),
            rank: String(i + 1),
            credits: (e.credits as string) ?? "",
            creditsReady: !!e.creditsReady,
            droids: ((e.droids as unknown[]) ?? []).map((d) => {
              const dd = d as Record<string, unknown>;
              return {
                name: (dd?.name as string) ?? "",
                tier: normalizeTier(dd?.tier as string | undefined),
              };
            }),
            gain: {},
            notes: (e.notes as string) ?? "",
          };
        }),
      },
    ],
    roster: [],
  };
}

/**
 * Accepts any v1/v2/v3/v4-shaped object and returns a v4 PersistedState.
 *
 * Key v4 changes:
 *  - `superRebirths` is dropped (no longer rendered; cycle-aware data
 *    replaces it). Anything the user logged there is intentionally
 *    discarded — the cycle data is authoritative now.
 *  - `cards` keep their Tier strings, but `MYTHIC` rarity on custom
 *    droids → `ICONIC`.
 *  - Profile gains `superRebirthCount`, `cycleOverride`, `novaEarned`,
 *    `novaSpent`. Old `profile.superRebirth.level` (a string) is best-
 *    effort parsed into `superRebirthCount`.
 *  - Cosmetics and Nova upgrades default to empty arrays.
 */
function v4FromIntermediate(obj: Record<string, unknown>): PersistedState {
  const idx = buildDroidIndex(DROID_DICT);
  const resolveName = (raw: string): string => idx.resolve(raw)?.canonical ?? raw.trim();

  // Cards: same paths as v3, but tier values now include FLAWLESS.
  let cards: CollectionCard[] = [];
  if (Array.isArray(obj.cards)) {
    cards = (obj.cards as Record<string, unknown>[]).map((c) => {
      // v7: prefer explicit working/lounge counts; fall back to legacy `active`.
      const explicitWorking = typeof c.working === "number" ? Math.max(0, Math.floor(c.working)) : null;
      const explicitLounge = typeof c.lounge === "number" ? Math.max(0, Math.floor(c.lounge)) : null;
      let working = explicitWorking ?? 0;
      let lounge = explicitLounge ?? 0;
      if (explicitWorking === null && explicitLounge === null) {
        // Legacy v6: `active: true` → assume 1 Working.
        if (c.active === true) working = 1;
      }
      return {
        name: resolveName(((c.name as string) ?? "")),
        tier: normalizeTier(c.tier as string | undefined),
        owned: c.owned !== false || working > 0 || lounge > 0,
        working,
        lounge,
        notes: (c.notes as string) ?? undefined,
      };
    });
  } else if (Array.isArray(obj.roster)) {
    cards = (obj.roster as Record<string, unknown>[]).map((d) => {
      const rawName = ((d.droidId as string) ?? (d.name as string) ?? "").toString();
      const status = String(d.status ?? "");
      const explicitActive = typeof d.active === "boolean" ? (d.active as boolean) : null;
      const active = explicitActive ?? (status === "Working" || status === "Lounge");
      const owned = typeof d.owned === "boolean" ? (d.owned as boolean) : true;
      // Legacy roster: map Working/Lounge status precisely when available.
      let working = 0;
      let lounge = 0;
      if (active) {
        if (status === "Lounge") lounge = 1;
        else working = 1;
      }
      return {
        name: resolveName(rawName),
        tier: normalizeTier(d.tier as string | undefined),
        owned: owned || working > 0 || lounge > 0,
        working,
        lounge,
        notes: (d.notes as string) ?? undefined,
      };
    });
  }
  // Dedupe by (name, tier)
  const cardKey = (c: CollectionCard) => `${c.name}::${c.tier}`;
  const cardMap = new Map<string, CollectionCard>();
  for (const c of cards) {
    if (!c.name) continue;
    const k = cardKey(c);
    const prev = cardMap.get(k);
    cardMap.set(k, prev ? mergeCards(prev, c) : c);
  }

  const uiRaw = (obj.ui && typeof obj.ui === "object" ? (obj.ui as Record<string, unknown>) : {}) as Record<string, unknown>;

  const profile: Profile =
    obj.profile && typeof obj.profile === "object"
      ? // v6: lift old ui.creditsCurrent into the profile if it isn't already there.
        coerceProfile(obj.profile as Record<string, unknown>, uiRaw.creditsCurrent as string | undefined)
      : { ...defaultProfile(), currentCredits: (uiRaw.creditsCurrent as string) ?? "" };

  const cosmetics: CosmeticState[] = Array.isArray(obj.cosmetics)
    ? (obj.cosmetics as Record<string, unknown>[])
        .filter((c) => typeof c.id === "string")
        .map((c) => ({ id: c.id as string, owned: !!c.owned }))
    : [];

  const novaUpgrades: NovaUpgradeState[] = Array.isArray(obj.novaUpgrades)
    ? (obj.novaUpgrades as Record<string, unknown>[])
        .filter((u) => typeof u.id === "string")
        .map((u) => ({ id: u.id as string, level: Math.max(0, Math.floor(Number(u.level) || 0)) }))
    : [];

  // customDroids: rename MYTHIC → ICONIC
  const customDroids = Array.isArray(obj.customDroids)
    ? (obj.customDroids as Record<string, unknown>[]).map((d) => {
        const rarity = String(d.rarity ?? "COMMON").toUpperCase();
        return { ...d, rarity: rarity === "MYTHIC" ? "ICONIC" : rarity } as PersistedState["customDroids"][number];
      })
    : [];

  // Remap old tab keys into the v6 five-tab set.
  const oldTab = String(uiRaw.activeTab ?? "home");
  const tabMap: Record<string, TabKey> = {
    home: "home",
    droidex: "droidex",
    profile: "profile",
    rebirths: "rebirths",
    standard: "rebirths",
    super: "rebirths",
    "next-unlock": "rebirths",
    cosmetics: "shop",
    nova: "shop",
    shop: "shop",
    data: "profile",
    collection: "droidex",
  };
  const activeTab = tabMap[oldTab] ?? "home";

  // v5: novaIconicOwned slice (ICONIC droid Nova Shop purchases)
  const novaIconicOwned: string[] = Array.isArray(obj.novaIconicOwned)
    ? (obj.novaIconicOwned as unknown[])
        .filter((n): n is string => typeof n === "string")
        .map((n) => n.trim())
        .filter((n) => n.length > 0)
    : [];

  // v5: lift StandardRebirth.rewards.slotUnlock to top-level, drop the rest.
  // v4 stored slot/crystals/mults nested under `rewards`; v5 keeps only
  // slotUnlock (the genuinely per-RB datum).
  const standardOverrides = liftStandardRebirthRewards(obj.standardOverrides);

  return {
    schemaVersion: SCHEMA_VERSION,
    cards: Array.from(cardMap.values()),
    profile,
    customDroids,
    standardOverrides,
    cosmetics,
    novaUpgrades,
    novaIconicOwned,
    ui: {
      // creditsCurrent intentionally dropped from uiRaw (moved to profile in v6).
      ...stripUiCredits(uiRaw),
      activeTab,
    } as PersistedState["ui"],
  };
}

function stripUiCredits(ui: Record<string, unknown>): Record<string, unknown> {
  const { creditsCurrent: _drop, ...rest } = ui;
  return rest;
}

function liftStandardRebirthRewards(raw: unknown): StandardRebirth[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Record<string, unknown>[]).map((row) => {
    const r = row as Record<string, unknown>;
    const rewards = (r.rewards ?? {}) as Record<string, unknown>;
    // Prefer a top-level slotUnlock (v5 shape); fall back to nested (v4).
    const slotUnlock = (r.slotUnlock as StandardRebirth["slotUnlock"]) ??
      (rewards.slotUnlock as StandardRebirth["slotUnlock"]) ??
      null;
    const { rewards: _drop, ...rest } = r;
    return {
      ...(rest as unknown as StandardRebirth),
      slotUnlock,
    };
  });
}

function mergeCards(a: CollectionCard, b: CollectionCard): CollectionCard {
  const working = Math.max(a.working, b.working);
  const lounge = Math.max(a.lounge, b.lounge);
  return {
    name: a.name,
    tier: a.tier,
    owned: a.owned || b.owned || working > 0 || lounge > 0,
    working,
    lounge,
    notes: a.notes ?? b.notes,
  };
}

function coerceProfile(p: Record<string, unknown>, uiCreditsFallback?: string): Profile {
  const std = typeof p.standardRebirth === "number" ? p.standardRebirth : 0;
  // v3 had profile.superRebirth = { level: string, rank: string }; treat level as the SRB count if numeric.
  const srOld = (p.superRebirth as Record<string, unknown>) ?? {};
  const inferredCount = Number(srOld.level);
  const count =
    typeof p.superRebirthCount === "number"
      ? p.superRebirthCount
      : Number.isFinite(inferredCount)
        ? inferredCount
        : 0;
  const cycleOverride =
    typeof p.cycleOverride === "number" && p.cycleOverride >= 1 && p.cycleOverride <= 4
      ? (p.cycleOverride as RebirthCycle)
      : null;
  // v6: currentCredits lives on profile; fall back to the old ui.creditsCurrent.
  const currentCredits =
    typeof p.currentCredits === "string" ? p.currentCredits : (uiCreditsFallback ?? "");
  const chips = Number(p.upgradeChips);
  return {
    baseName: typeof p.baseName === "string" ? p.baseName : undefined,
    standardRebirth: Math.max(0, Math.floor(std)),
    superRebirthCount: Math.max(0, Math.floor(count)),
    cycleOverride,
    currentCredits,
    novaEarned: Math.max(0, Math.floor(Number(p.novaEarned) || 0)),
    novaSpent: Math.max(0, Math.floor(Number(p.novaSpent) || 0)),
    upgradeChips: Number.isFinite(chips) && chips > 0 ? Math.floor(chips) : undefined,
  };
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
