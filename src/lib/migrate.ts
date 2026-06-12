import { SCHEMA_VERSION } from "../data/version";
import type { PersistedState, RebirthGain, RosterEntry, SuperRebirth, Tier } from "../types";
import { normalizeTier } from "./tiers";

/**
 * Forward-migrates any historical payload into the current PersistedState.
 *
 * v0 — prototype's flat-array export (an array of rank-like records).
 * v1 — `{ superRebirths, roster }` shape from the migration brief (§4).
 * v2 — current shape: `owned`/`active` split, `customDroids`, `ui` prefs,
 *      uppercase tiers, schemaVersion field on the payload.
 */
export function migrate(raw: unknown): PersistedState {
  // v0: an array at the root is the prototype's oldest export format.
  if (Array.isArray(raw)) {
    return v2FromV1(v1FromV0(raw));
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // ExportEnvelope unwrap.
    if (obj.app === "sandcrawler" && obj.payload && typeof obj.payload === "object") {
      return migrate(obj.payload);
    }
    const declaredVersion = typeof obj.schemaVersion === "number" ? obj.schemaVersion : null;
    if (declaredVersion === SCHEMA_VERSION) {
      return coerceV2(obj);
    }
    // Treat any object without a current version as v1-shaped (or close to it).
    return v2FromV1(obj);
  }

  return emptyState();
}

export function emptyState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    roster: [],
    customDroids: [],
    superRebirths: [],
    standardOverrides: [],
    ui: { activeTab: "collection", creditsCurrent: "" },
  };
}

function v1FromV0(arr: unknown[]): Record<string, unknown> {
  // Lift a flat array of rank-like records into a single Super Rebirth group.
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

function v2FromV1(obj: Record<string, unknown>): PersistedState {
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
                    name: (d.name as string) ?? "",
                    tier: normalizeTier(d.tier as string | undefined),
                  }))
                : [],
              gain: ((r.gain ?? {}) as RebirthGain) || {},
              notes: (r.notes as string) ?? "",
            }))
          : [],
      }))
    : [];

  // The v1 roster lacked an `owned`/`active` split. Map "Working"/"Lounge"
  // statuses to active=true; everything else to active=false (still owned).
  const roster: RosterEntry[] = Array.isArray(obj.roster)
    ? (obj.roster as Record<string, unknown>[]).map((d) => {
        const status = String(d.status ?? "Working");
        const explicitActive = typeof d.active === "boolean" ? (d.active as boolean) : null;
        const active = explicitActive ?? (status === "Working" || status === "Lounge");
        return {
          droidId: (d.name as string) ?? (d.droidId as string) ?? "",
          owned: typeof d.owned === "boolean" ? (d.owned as boolean) : true,
          active,
          tier: normalizeTier(d.tier as string | undefined) as Tier,
          notes: (d.notes as string) ?? undefined,
        };
      })
    : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    roster,
    customDroids: Array.isArray(obj.customDroids) ? (obj.customDroids as PersistedState["customDroids"]) : [],
    superRebirths,
    standardOverrides: Array.isArray(obj.standardOverrides)
      ? (obj.standardOverrides as PersistedState["standardOverrides"])
      : [],
    ui:
      obj.ui && typeof obj.ui === "object"
        ? {
            ...(obj.ui as PersistedState["ui"]),
            activeTab: ((obj.ui as Record<string, unknown>).activeTab as PersistedState["ui"]["activeTab"]) ?? "collection",
            creditsCurrent: ((obj.ui as Record<string, unknown>).creditsCurrent as string) ?? "",
          }
        : { activeTab: "collection", creditsCurrent: "" },
  };
}

/** Re-run the v1→v2 path even on already-v2 data so any tier strings get re-normalised. */
function coerceV2(obj: Record<string, unknown>): PersistedState {
  return v2FromV1(obj);
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
