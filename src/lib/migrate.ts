import { DROID_DICT } from "../data/droids.seed";
import { SCHEMA_VERSION } from "../data/version";
import type {
  CollectionCard,
  PersistedState,
  Profile,
  RebirthGain,
  SuperRebirth,
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
 *      (Pass-1 SandCrawler exports look like this.)
 * v3 — Card-based collection (`cards` replaces `roster`), `profile` slice,
 *      droid names uppercased + alias-resolved against the seed dict.
 */
export function migrate(raw: unknown): PersistedState {
  // v0: an array at the root is the prototype's oldest export format.
  if (Array.isArray(raw)) {
    return v3FromIntermediate(v1FromV0(raw));
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // ExportEnvelope unwrap.
    if (obj.app === "sandcrawler" && obj.payload && typeof obj.payload === "object") {
      return migrate(obj.payload);
    }
    // Everything below feeds through the same upgrade path; the function
    // accepts both v1 and v2 shapes and is idempotent on v3.
    return v3FromIntermediate(obj);
  }

  return emptyState();
}

export function emptyState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    cards: [],
    profile: defaultProfile(),
    customDroids: [],
    superRebirths: [],
    standardOverrides: [],
    ui: { activeTab: "droidex", creditsCurrent: "" },
  };
}

export function defaultProfile(): Profile {
  return { standardRebirth: 0, superRebirth: { level: "", rank: "" } };
}

// ── v0 → v1 lift ─────────────────────────────────────────────────────────
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
 * Accepts any v1/v2/v3-shaped object and returns a v3 PersistedState. Idempotent.
 *
 * Key transformations:
 *  - v1's `{name,tier,status}` roster entries → v2's `{droidId,tier,owned,active}` → v3's cards
 *  - v2's `{droidId,tier,owned,active}` roster → v3's `{name,tier,owned,active}` cards
 *  - Droid names canonicalised against the seed dict (handles "Mouse" → "MOUSE", aliases)
 *  - Tier strings re-uppercased
 *  - `profile` populated with defaults if missing
 *  - `activeTab` defaults to "droidex"
 */
function v3FromIntermediate(obj: Record<string, unknown>): PersistedState {
  const idx = buildDroidIndex(DROID_DICT);
  const resolveName = (raw: string): string => idx.resolve(raw)?.canonical ?? raw.trim();

  const superRebirths: SuperRebirth[] = Array.isArray(obj.superRebirths)
    ? (obj.superRebirths as Record<string, unknown>[]).map((g) => ({
        id: (g.id as string) || makeId(),
        level: String(g.level ?? ""),
        ranks: Array.isArray(g.ranks)
          ? (g.ranks as Record<string, unknown>[]).map((r) => ({
              id: (r.id as string) || makeId(),
              rank: String(r.rank ?? ""),
              credits: (r.credits as string) ?? "",
              creditsReady: !!r.creditsReady,
              droids: Array.isArray(r.droids)
                ? (r.droids as Record<string, unknown>[]).map((d) => ({
                    name: resolveName(((d.name as string) ?? "")),
                    tier: normalizeTier(d.tier as string | undefined),
                  }))
                : [],
              gain: ((r.gain ?? {}) as RebirthGain) || {},
              notes: (r.notes as string) ?? "",
            }))
          : [],
      }))
    : [];

  // Cards can arrive in three shapes:
  //   v3:  obj.cards: [{name,tier,owned,active,notes}]
  //   v2:  obj.roster: [{droidId,tier,owned,active}]
  //   v1:  obj.roster: [{name,tier,status: "Working"|"Lounge"}]
  let cards: CollectionCard[] = [];
  if (Array.isArray(obj.cards)) {
    cards = (obj.cards as Record<string, unknown>[]).map((c) => ({
      name: resolveName(((c.name as string) ?? "")),
      tier: normalizeTier(c.tier as string | undefined),
      owned: c.owned !== false,
      active: !!c.active,
      notes: (c.notes as string) ?? undefined,
    }));
  } else if (Array.isArray(obj.roster)) {
    cards = (obj.roster as Record<string, unknown>[]).map((d) => {
      const rawName = ((d.droidId as string) ?? (d.name as string) ?? "").toString();
      const status = String(d.status ?? "");
      const explicitActive = typeof d.active === "boolean" ? (d.active as boolean) : null;
      const active = explicitActive ?? (status === "Working" || status === "Lounge");
      const owned = typeof d.owned === "boolean" ? (d.owned as boolean) : true;
      return {
        name: resolveName(rawName),
        tier: normalizeTier(d.tier as string | undefined),
        owned,
        active,
        notes: (d.notes as string) ?? undefined,
      };
    });
  }
  // Dedupe by (name, tier) — old data could conceivably have duplicates.
  const cardKey = (c: CollectionCard) => `${c.name}::${c.tier}`;
  const cardMap = new Map<string, CollectionCard>();
  for (const c of cards) {
    if (!c.name) continue;
    const k = cardKey(c);
    const prev = cardMap.get(k);
    cardMap.set(k, prev ? mergeCards(prev, c) : c);
  }

  const profile: Profile =
    obj.profile && typeof obj.profile === "object"
      ? coerceProfile(obj.profile as Record<string, unknown>)
      : defaultProfile();

  const uiRaw = (obj.ui && typeof obj.ui === "object" ? (obj.ui as Record<string, unknown>) : {}) as Record<string, unknown>;

  return {
    schemaVersion: SCHEMA_VERSION,
    cards: Array.from(cardMap.values()),
    profile,
    customDroids: Array.isArray(obj.customDroids) ? (obj.customDroids as PersistedState["customDroids"]) : [],
    superRebirths,
    standardOverrides: Array.isArray(obj.standardOverrides)
      ? (obj.standardOverrides as PersistedState["standardOverrides"])
      : [],
    ui: {
      ...uiRaw,
      activeTab: (uiRaw.activeTab as TabKey) || "droidex",
      creditsCurrent: (uiRaw.creditsCurrent as string) ?? "",
    } as PersistedState["ui"],
  };
}

function mergeCards(a: CollectionCard, b: CollectionCard): CollectionCard {
  return {
    name: a.name,
    tier: a.tier,
    owned: a.owned || b.owned,
    active: a.active || b.active,
    notes: a.notes ?? b.notes,
  };
}

function coerceProfile(p: Record<string, unknown>): Profile {
  const std = typeof p.standardRebirth === "number" ? p.standardRebirth : 0;
  const sr = (p.superRebirth as Record<string, unknown>) ?? {};
  return {
    standardRebirth: Math.max(0, Math.floor(std)),
    superRebirth: {
      level: String(sr.level ?? ""),
      rank: String(sr.rank ?? ""),
    },
  };
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
