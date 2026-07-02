import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SCHEMA_VERSION } from "../data/version";
import { idbStorage } from "../lib/idbStorage";
import { defaultProfile, emptyState, migrate } from "../lib/migrate";
import { normalizeTier } from "../lib/tiers";
import type {
  CollectionCard,
  CosmeticState,
  DroidDef,
  NovaUpgradeState,
  PersistedState,
  RebirthCycle,
  StandardRebirth,
  TabKey,
  Tier,
} from "../types";

const STORAGE_KEY = "sandcrawler:v6";

function bootstrapState(): PersistedState {
  return emptyState();
}

interface Actions {
  // ── Droidex collection ────────────────────────────────────────────────
  setCardCounts(
    name: string,
    tier: Tier,
    patch: Partial<Pick<CollectionCard, "owned" | "working" | "lounge" | "notes">>,
  ): void;
  /** Bump this card's Working count by 1 (used by "I have it" shortcuts). */
  bumpWorking(name: string, tier: Tier): void;
  addCustomDroid(def: DroidDef): void;

  // ── Profile ───────────────────────────────────────────────────────────
  setBaseName(name: string): void;
  setStandardRebirth(level: number): void;
  setSuperRebirthCount(n: number): void;
  setCycleOverride(c: RebirthCycle | null): void;
  setCreditsCurrent(value: string): void;
  setUpgradeChips(n: number | undefined): void;
  setNovaEarned(n: number): void;
  setNovaSpent(n: number): void;
  addNovaEarned(delta: number): void;
  addNovaSpent(delta: number): void;

  // ── Cosmetics ─────────────────────────────────────────────────────────
  setCosmeticOwned(id: string, owned: boolean): void;

  // ── Nova Shop ─────────────────────────────────────────────────────────
  setNovaUpgradeLevel(id: string, level: number): void;
  setIconicPurchased(droidName: string, purchased: boolean): void;

  // ── Standard Rebirth (user overrides on top of the seed table) ────────
  upsertStandardOverride(rb: StandardRebirth): void;
  removeStandardOverride(level: number, cycle: RebirthCycle): void;

  // ── UI ─────────────────────────────────────────────────────────────────
  setActiveTab(tab: TabKey): void;
  setUiPref<K extends keyof PersistedState["ui"]>(key: K, value: PersistedState["ui"][K]): void;
  dismissOnboarding(): void;

  // ── Bulk ──────────────────────────────────────────────────────────────
  replaceAll(state: PersistedState): void;
  resetAll(): void;
}

export type AppStore = PersistedState & Actions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...bootstrapState(),

      setCardCounts(name, tier, patch) {
        set((s) => {
          const idx = s.cards.findIndex(
            (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.tier === tier,
          );
          const clean = (n: unknown): number => Math.max(0, Math.floor(Number(n) || 0));
          const list = [...s.cards];
          const current = idx >= 0 ? list[idx]! : null;
          const working = patch.working !== undefined ? clean(patch.working) : (current?.working ?? 0);
          const lounge = patch.lounge !== undefined ? clean(patch.lounge) : (current?.lounge ?? 0);
          // Owned auto-true whenever a copy is deployed; otherwise honor the patch or existing state.
          const deployed = working + lounge > 0;
          const owned = deployed
            ? true
            : patch.owned !== undefined
              ? !!patch.owned
              : (current?.owned ?? true);
          const notes = patch.notes !== undefined ? patch.notes : current?.notes;
          if (!owned && working === 0 && lounge === 0) {
            if (idx >= 0) list.splice(idx, 1);
            return { cards: list };
          }
          const next: CollectionCard = {
            name: (current?.name ?? name.trim()),
            tier: normalizeTier(tier),
            owned,
            working,
            lounge,
            notes,
          };
          if (idx < 0) list.push(next);
          else list[idx] = next;
          return { cards: list };
        });
      },

      bumpWorking(name, tier) {
        set((s) => {
          const idx = s.cards.findIndex(
            (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.tier === tier,
          );
          const list = [...s.cards];
          if (idx < 0) {
            list.push({
              name: name.trim(),
              tier: normalizeTier(tier),
              owned: true,
              working: 1,
              lounge: 0,
            });
          } else {
            const c = list[idx]!;
            list[idx] = { ...c, working: c.working + 1, owned: true };
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

      setBaseName(name) {
        set((s) => ({ profile: { ...s.profile, baseName: name.trim() || undefined } }));
      },

      setStandardRebirth(level) {
        set((s) => ({
          profile: { ...s.profile, standardRebirth: Math.max(0, Math.floor(level)) },
        }));
      },

      setSuperRebirthCount(n) {
        set((s) => ({
          profile: { ...s.profile, superRebirthCount: Math.max(0, Math.floor(n)) },
        }));
      },

      setCycleOverride(c) {
        set((s) => ({ profile: { ...s.profile, cycleOverride: c } }));
      },

      setCreditsCurrent(value) {
        set((s) => ({ profile: { ...s.profile, currentCredits: value } }));
      },

      setUpgradeChips(n) {
        set((s) => ({
          profile: {
            ...s.profile,
            upgradeChips: n === undefined || n <= 0 ? undefined : Math.floor(n),
          },
        }));
      },

      setNovaEarned(n) {
        set((s) => ({ profile: { ...s.profile, novaEarned: Math.max(0, Math.floor(n)) } }));
      },

      setNovaSpent(n) {
        set((s) => ({ profile: { ...s.profile, novaSpent: Math.max(0, Math.floor(n)) } }));
      },

      addNovaEarned(delta) {
        set((s) => ({
          profile: { ...s.profile, novaEarned: Math.max(0, s.profile.novaEarned + Math.floor(delta)) },
        }));
      },

      addNovaSpent(delta) {
        set((s) => ({
          profile: { ...s.profile, novaSpent: Math.max(0, s.profile.novaSpent + Math.floor(delta)) },
        }));
      },

      setCosmeticOwned(id, owned) {
        set((s) => {
          const idx = s.cosmetics.findIndex((c) => c.id === id);
          if (idx < 0) {
            if (!owned) return {};
            const next: CosmeticState[] = [...s.cosmetics, { id, owned: true }];
            return { cosmetics: next };
          }
          if (!owned) {
            const next = s.cosmetics.filter((c) => c.id !== id);
            return { cosmetics: next };
          }
          const next = s.cosmetics.map((c) => (c.id === id ? { ...c, owned: true } : c));
          return { cosmetics: next };
        });
      },

      setIconicPurchased(droidName, purchased) {
        set((s) => {
          const key = droidName.trim().toUpperCase();
          const existing = s.novaIconicOwned.some((n) => n.trim().toUpperCase() === key);
          if (purchased && !existing) {
            return { novaIconicOwned: [...s.novaIconicOwned, droidName.trim()] };
          }
          if (!purchased && existing) {
            return {
              novaIconicOwned: s.novaIconicOwned.filter((n) => n.trim().toUpperCase() !== key),
            };
          }
          return {};
        });
      },

      setNovaUpgradeLevel(id, level) {
        set((s) => {
          const safe = Math.max(0, Math.floor(level));
          const idx = s.novaUpgrades.findIndex((u) => u.id === id);
          if (safe === 0) {
            // Drop the entry — sparse storage.
            return { novaUpgrades: s.novaUpgrades.filter((u) => u.id !== id) };
          }
          if (idx < 0) {
            const next: NovaUpgradeState[] = [...s.novaUpgrades, { id, level: safe }];
            return { novaUpgrades: next };
          }
          const next = s.novaUpgrades.map((u) => (u.id === id ? { ...u, level: safe } : u));
          return { novaUpgrades: next };
        });
      },

      upsertStandardOverride(rb) {
        set((s) => {
          const others = s.standardOverrides.filter(
            (o) => !(o.level === rb.level && o.cycle === rb.cycle),
          );
          return { standardOverrides: [...others, { ...rb, source: "user" }] };
        });
      },

      removeStandardOverride(level, cycle) {
        set((s) => ({
          standardOverrides: s.standardOverrides.filter(
            (o) => !(o.level === level && o.cycle === cycle),
          ),
        }));
      },

      setActiveTab(tab) {
        set((s) => ({ ui: { ...s.ui, activeTab: tab } }));
      },

      setUiPref(key, value) {
        set((s) => ({ ui: { ...s.ui, [key]: value } }));
      },

      dismissOnboarding() {
        set((s) => ({ ui: { ...s.ui, hasOnboarded: true } }));
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
        standardOverrides: state.standardOverrides,
        cosmetics: state.cosmetics,
        novaUpgrades: state.novaUpgrades,
        novaIconicOwned: state.novaIconicOwned ?? [],
        ui: state.ui,
      }),
    },
  ),
);

export { defaultProfile };
