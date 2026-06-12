import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SCHEMA_VERSION } from "../data/version";
import { SUPER_REBIRTHS_SEED } from "../data/superRebirths.seed";
import { idbStorage } from "../lib/idbStorage";
import { migrate, emptyState } from "../lib/migrate";
import { normalizeTier } from "../lib/tiers";
import type {
  DroidDef,
  PersistedState,
  Rank,
  RebirthGain,
  RebirthReq,
  RosterEntry,
  StandardRebirth,
  SuperRebirth,
  TabKey,
  Tier,
} from "../types";

const STORAGE_KEY = "sandcrawler:v2";

const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function bootstrapState(): PersistedState {
  return {
    ...emptyState(),
    // Hand the user the seed Super Rebirth so the UI isn't empty on first run.
    superRebirths: SUPER_REBIRTHS_SEED.map((g) => ({ ...g, ranks: g.ranks.map((r) => ({ ...r })) })),
  };
}

interface Actions {
  // ── Collection ─────────────────────────────────────────────────────────
  addOrUpdateDroid(entry: Omit<RosterEntry, "owned"> & Partial<Pick<RosterEntry, "owned">>): void;
  removeDroid(droidId: string): void;
  toggleActive(droidId: string): void;
  setTier(droidId: string, tier: Tier): void;
  addCustomDroid(def: DroidDef): void;

  // ── Super Rebirth ──────────────────────────────────────────────────────
  upsertSuperRank(input: {
    existingGroupId?: string;
    existingRankId?: string;
    level: string;
    rank: string;
    credits: string;
    creditsReady: boolean;
    droids: RebirthReq[];
    gain?: RebirthGain;
    notes?: string;
  }): void;
  deleteSuperRank(groupId: string, rankId: string): void;
  toggleRankCredits(groupId: string, rankId: string): void;

  // ── Standard Rebirth (user overrides on top of the seed table) ────────
  upsertStandardOverride(rb: StandardRebirth): void;
  removeStandardOverride(level: number): void;

  // ── UI ─────────────────────────────────────────────────────────────────
  setActiveTab(tab: TabKey): void;
  setCreditsCurrent(value: string): void;

  // ── Bulk ──────────────────────────────────────────────────────────────
  replaceAll(state: PersistedState): void;
  resetAll(): void;
}

export type AppStore = PersistedState & Actions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...bootstrapState(),

      addOrUpdateDroid(entry) {
        set((s) => {
          const idx = s.roster.findIndex(
            (d) => d.droidId.trim().toLowerCase() === entry.droidId.trim().toLowerCase(),
          );
          const next = [...s.roster];
          const owned = entry.owned ?? true;
          if (idx < 0) {
            next.push({
              droidId: entry.droidId.trim(),
              owned,
              active: entry.active,
              tier: normalizeTier(entry.tier),
              notes: entry.notes,
            });
          } else {
            next[idx] = {
              ...next[idx]!,
              owned,
              active: entry.active,
              tier: normalizeTier(entry.tier),
              notes: entry.notes ?? next[idx]!.notes,
            };
          }
          return { roster: next };
        });
      },

      removeDroid(droidId) {
        set((s) => ({ roster: s.roster.filter((d) => d.droidId !== droidId) }));
      },

      toggleActive(droidId) {
        set((s) => ({
          roster: s.roster.map((d) =>
            d.droidId === droidId ? { ...d, active: !d.active } : d,
          ),
        }));
      },

      setTier(droidId, tier) {
        set((s) => ({
          roster: s.roster.map((d) =>
            d.droidId === droidId ? { ...d, tier: normalizeTier(tier) } : d,
          ),
        }));
      },

      addCustomDroid(def) {
        set((s) => {
          const exists = s.customDroids.some(
            (d) => d.canonical.trim().toLowerCase() === def.canonical.trim().toLowerCase(),
          );
          if (exists) return {};
          return { customDroids: [...s.customDroids, def] };
        });
      },

      upsertSuperRank(input) {
        set((s) => {
          const groups = s.superRebirths.map((g) => ({ ...g, ranks: [...g.ranks] }));

          // Strip any existing rank from its old group (and prune empty groups).
          if (input.existingGroupId && input.existingRankId) {
            for (const g of groups) {
              if (g.id === input.existingGroupId) {
                g.ranks = g.ranks.filter((r) => r.id !== input.existingRankId);
              }
            }
          }

          let target = groups.find((g) => String(g.level) === String(input.level));
          if (!target) {
            target = { id: uid(), level: String(input.level), ranks: [] };
            groups.push(target);
          }

          const rank: Rank = {
            id: input.existingRankId ?? uid(),
            rank: input.rank,
            credits: input.credits,
            creditsReady: input.creditsReady,
            droids: input.droids.map((d) => ({ name: d.name.trim(), tier: normalizeTier(d.tier) })),
            gain: input.gain ?? {},
            notes: input.notes ?? "",
          };
          target.ranks.push(rank);

          return { superRebirths: groups.filter((g) => g.ranks.length > 0) };
        });
      },

      deleteSuperRank(groupId, rankId) {
        set((s) => {
          const next: SuperRebirth[] = s.superRebirths
            .map((g) =>
              g.id === groupId ? { ...g, ranks: g.ranks.filter((r) => r.id !== rankId) } : g,
            )
            .filter((g) => g.ranks.length > 0);
          return { superRebirths: next };
        });
      },

      toggleRankCredits(groupId, rankId) {
        set((s) => ({
          superRebirths: s.superRebirths.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  ranks: g.ranks.map((r) =>
                    r.id === rankId ? { ...r, creditsReady: !r.creditsReady } : r,
                  ),
                }
              : g,
          ),
        }));
      },

      upsertStandardOverride(rb) {
        set((s) => {
          const others = s.standardOverrides.filter((o) => o.level !== rb.level);
          return { standardOverrides: [...others, { ...rb, source: "user" }] };
        });
      },

      removeStandardOverride(level) {
        set((s) => ({
          standardOverrides: s.standardOverrides.filter((o) => o.level !== level),
        }));
      },

      setActiveTab(tab) {
        set((s) => ({ ui: { ...s.ui, activeTab: tab } }));
      },

      setCreditsCurrent(value) {
        set((s) => ({ ui: { ...s.ui, creditsCurrent: value } }));
      },

      replaceAll(state) {
        set(() => state);
      },

      resetAll() {
        set(() => bootstrapState());
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => idbStorage),
      version: SCHEMA_VERSION,
      // The persist middleware calls this with whatever shape was in storage.
      // We hand it to `migrate` which knows every legacy format.
      migrate: (persisted) => migrate(persisted) as Partial<AppStore>,
      // Don't persist function references; persist only the data slice.
      partialize: (state): PersistedState => ({
        schemaVersion: SCHEMA_VERSION,
        roster: state.roster,
        customDroids: state.customDroids,
        superRebirths: state.superRebirths,
        standardOverrides: state.standardOverrides,
        ui: state.ui,
      }),
    },
  ),
);
