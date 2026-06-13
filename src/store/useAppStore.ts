import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SCHEMA_VERSION } from "../data/version";
import { SUPER_REBIRTHS_SEED } from "../data/superRebirths.seed";
import { idbStorage } from "../lib/idbStorage";
import { defaultProfile, emptyState, migrate } from "../lib/migrate";
import { normalizeTier } from "../lib/tiers";
import type {
  CollectionCard,
  DroidDef,
  PersistedState,
  Rank,
  RebirthGain,
  RebirthReq,
  StandardRebirth,
  SuperRebirth,
  TabKey,
  Tier,
} from "../types";

const STORAGE_KEY = "sandcrawler:v3";

const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function bootstrapState(): PersistedState {
  return {
    ...emptyState(),
    // Hand the user the seed Super Rebirth so the UI isn't empty on first run.
    superRebirths: SUPER_REBIRTHS_SEED.map((g) => ({ ...g, ranks: g.ranks.map((r) => ({ ...r })) })),
  };
}

/** Bumps cards through the three-state cycle used by the Droidex grid. */
function cycleCardState(c: CollectionCard | undefined): { owned: boolean; active: boolean } | "remove" {
  // missing → owned (inactive) → active → missing
  if (!c) return { owned: true, active: false };
  if (c.owned && !c.active) return { owned: true, active: true };
  return "remove";
}

interface Actions {
  // ── Droidex collection ────────────────────────────────────────────────
  setCardState(name: string, tier: Tier, patch: Partial<Pick<CollectionCard, "owned" | "active" | "notes">>): void;
  cycleCard(name: string, tier: Tier): void;
  addCustomDroid(def: DroidDef): void;

  // ── Profile ───────────────────────────────────────────────────────────
  setStandardRebirth(level: number): void;
  setSuperRebirthMarker(level: string, rank: string): void;

  // ── Super Rebirth ─────────────────────────────────────────────────────
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

  // ── Standard Rebirth (user overrides on top of the seed table) ───────
  upsertStandardOverride(rb: StandardRebirth): void;
  removeStandardOverride(level: number): void;

  // ── UI ────────────────────────────────────────────────────────────────
  setActiveTab(tab: TabKey): void;
  setCreditsCurrent(value: string): void;
  setUiPref<K extends keyof PersistedState["ui"]>(key: K, value: PersistedState["ui"][K]): void;

  // ── Bulk ─────────────────────────────────────────────────────────────
  replaceAll(state: PersistedState): void;
  resetAll(): void;
}

export type AppStore = PersistedState & Actions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...bootstrapState(),

      setCardState(name, tier, patch) {
        set((s) => {
          const idx = s.cards.findIndex(
            (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.tier === tier,
          );
          const next = [...s.cards];
          if (idx < 0) {
            // Don't create empty cards — only persist when something is true.
            if (!patch.owned && !patch.active) return {};
            next.push({
              name: name.trim(),
              tier: normalizeTier(tier),
              owned: patch.owned ?? true,
              active: patch.active ?? false,
              notes: patch.notes,
            });
          } else {
            const merged: CollectionCard = { ...next[idx]!, ...patch };
            // If both flags are off, drop the entry to keep storage sparse.
            if (!merged.owned && !merged.active) {
              next.splice(idx, 1);
            } else {
              next[idx] = merged;
            }
          }
          return { cards: next };
        });
      },

      cycleCard(name, tier) {
        set((s) => {
          const idx = s.cards.findIndex(
            (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.tier === tier,
          );
          const current = idx >= 0 ? s.cards[idx] : undefined;
          const next = cycleCardState(current);
          const list = [...s.cards];
          if (next === "remove") {
            if (idx >= 0) list.splice(idx, 1);
          } else if (idx < 0) {
            list.push({ name: name.trim(), tier: normalizeTier(tier), owned: next.owned, active: next.active });
          } else {
            list[idx] = { ...current!, ...next };
          }
          return { cards: list };
        });
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

      setStandardRebirth(level) {
        set((s) => ({
          profile: { ...s.profile, standardRebirth: Math.max(0, Math.floor(level)) },
        }));
      },

      setSuperRebirthMarker(level, rank) {
        set((s) => ({
          profile: { ...s.profile, superRebirth: { level, rank } },
        }));
      },

      upsertSuperRank(input) {
        set((s) => {
          const groups = s.superRebirths.map((g) => ({ ...g, ranks: [...g.ranks] }));

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

      setUiPref(key, value) {
        set((s) => ({ ui: { ...s.ui, [key]: value } }));
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
      migrate: (persisted) => migrate(persisted) as Partial<AppStore>,
      partialize: (state): PersistedState => ({
        schemaVersion: SCHEMA_VERSION,
        cards: state.cards,
        profile: state.profile ?? defaultProfile(),
        customDroids: state.customDroids,
        superRebirths: state.superRebirths,
        standardOverrides: state.standardOverrides,
        ui: state.ui,
      }),
    },
  ),
);

export { defaultProfile };
