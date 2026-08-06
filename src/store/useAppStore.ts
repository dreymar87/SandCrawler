import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SCHEMA_VERSION } from "../data/version";
import { idbStorage } from "../lib/idbStorage";
import { companionCapacity, NOVA_COMPANION_SLOT_ID } from "../lib/baseView";
import { pickaxeLevelsKept } from "../data/strategyTracks.seed";
import { setStatOverrides } from "../lib/droidStats";
import { defaultProfile, emptyState, migrate } from "../lib/migrate";
import { srbBonusAt } from "../lib/novaCrystals";
import { normalizeTier } from "../lib/tiers";
import { TIERS } from "../constants";
import type {
  ChipRates,
  CollectionCard,
  CosmeticState,
  DroidDef,
  DroidTierStat,
  NovaUpgradeState,
  PersistedState,
  RebirthCycle,
  StandardRebirth,
  StationSlotState,
  StationType,
  TabKey,
  Tier,
} from "../types";

const STORAGE_KEY = "sandcrawler:v6";

/** Companion capacity implied by the player's Nova Shop purchases. */
const companionCapacityOf = (upgrades: readonly NovaUpgradeState[]): number =>
  companionCapacity(upgrades.find((u) => u.id === NOVA_COMPANION_SLOT_ID)?.level ?? 0);

function bootstrapState(): PersistedState {
  return emptyState();
}

/** A deployment slot for a droid card. */
export type Slot = "working" | "lounge" | "companion";

interface Actions {
  // ── Droidex collection ────────────────────────────────────────────────
  setCardCounts(
    name: string,
    tier: Tier,
    patch: Partial<Pick<CollectionCard, "owned" | "working" | "lounge" | "companion" | "notes">>,
  ): void;
  /** Bump this card's Working count by 1 (used by "I have it" shortcuts). */
  bumpWorking(name: string, tier: Tier): void;
  addCustomDroid(def: DroidDef): void;

  // ── Base-tab deployment actions (operate on exactly ONE copy) ─────────
  /** Move 1 copy of (name, tier) from slot `from` to slot `to`. */
  moveDeployed(name: string, tier: Tier, from: Slot, to: Slot): void;
  /** Remove 1 copy of (name, tier) from slot `from` (card stays owned). */
  removeDeployed(name: string, tier: Tier, from: Slot): void;
  /**
   * Upgrade 1 copy of (name, fromTier) in slot `from` to the next tier,
   * redeployed into slot `to` — or `null` to leave it out (owned only).
   * No-op at the top tier.
   */
  upgradeDeployed(name: string, fromTier: Tier, from: Slot, to: Slot | null): void;
  /** Add 1 copy of (name, tier) to a slot, creating the card if needed. */
  addDeployed(name: string, tier: Tier, slot: Slot): void;
  /**
   * Install (name, tier) as the single Companion, swapping out whoever is
   * currently set (their card stays owned). `from` decrements that slot;
   * `null` just marks it companion (used by "add").
   */
  moveToCompanion(name: string, tier: Tier, from: Slot | null): void;

  // ── Profile ───────────────────────────────────────────────────────────
  setBaseName(name: string): void;
  setStandardRebirth(level: number): void;
  setSuperRebirthCount(n: number): void;
  setCycleOverride(c: RebirthCycle | null): void;
  setCreditsCurrent(value: string): void;
  setUpgradeChips(n: number | undefined): void;
  setLoungeCreditSlots(n: number): void;
  setNovaEarned(n: number): void;
  setNovaSpent(n: number): void;
  addNovaEarned(delta: number): void;
  addNovaSpent(delta: number): void;

  // ── Cosmetics ─────────────────────────────────────────────────────────
  setCosmeticOwned(id: string, owned: boolean): void;

  // ── Nova Shop ─────────────────────────────────────────────────────────
  setNovaUpgradeLevel(id: string, level: number): void;
  setIconicPurchased(droidName: string, purchased: boolean): void;
  /** Toggle an unlocked ICONIC droid as bought this cycle from the Merchant. */
  setIconicMerchantBought(droidName: string, bought: boolean): void;

  // ── Crafting stations (single slot each) ──────────────────────────────
  /** Occupy an empty station with a new in-progress craft. No-op if occupied. */
  startCraft(station: StationType, name: string, tier: Tier): void;
  /** Flip an occupant's state between "crafting" and "ready". */
  setStationState(station: StationType, state: StationSlotState): void;
  /**
   * Grab a station's droid → empty the slot. With a `target` slot the droid is
   * deployed there (owned + working/lounge/companion); with null/omitted it's
   * just marked owned in the Droidex.
   */
  grabStation(station: StationType, target?: Slot | null): void;
  /** Empty a station without granting ownership (cancel / eject). */
  clearStation(station: StationType): void;

  /**
   * Set the current pickaxe level. Raises `pickaxePeak` when it exceeds it;
   * never lowers the peak, since that's the figure Pickaxe Mastery should be
   * bought up to and the level itself is wiped every Super Rebirth.
   */
  setPickaxeLevel(level: number): void;

  // ── Upgrade Chip Station (Nova unlock, one slot) ──────────────────────
  /** Assign the chip station's single occupant (replaces any current one). */
  setChipStationDroid(name: string, tier: Tier): void;
  /** Empty the chip station. */
  clearChipStation(): void;
  /**
   * Record the observed chips/min for a droid at a tier. `null` (or a
   * non-positive value) clears it. Kept per (droid, tier) so swapping a droid
   * out and back restores its rate.
   */
  setChipRate(name: string, tier: Tier, perMin: number | null): void;
  /**
   * On a "ready" slot: the finished droid becomes your Companion (owned;
   * clears any prior companion) and your prior companion parks into the
   * station as "ready". If no prior companion, the station just empties.
   */
  swapCompanionIntoStation(station: StationType): void;

  // ── Standard Rebirth (user overrides on top of the seed table) ────────
  upsertStandardOverride(rb: StandardRebirth): void;
  removeStandardOverride(level: number, cycle: RebirthCycle): void;

  // ── Droid stat overrides (fill in / correct per-tier economy stats) ───
  /** Merge a per-field patch for (name, tier). An empty/blank field clears it (falls back to seed). */
  setStatOverride(name: string, tier: Tier, patch: Partial<DroidTierStat>): void;
  /** Drop all stat overrides for a droid (reset it to seed). */
  clearStatOverrides(name: string): void;

  // ── UI ─────────────────────────────────────────────────────────────────
  setActiveTab(tab: TabKey): void;
  setUiPref<K extends keyof PersistedState["ui"]>(key: K, value: PersistedState["ui"][K]): void;
  dismissOnboarding(): void;
  resetOnboarding(): void;

  // ── Bulk ──────────────────────────────────────────────────────────────
  replaceAll(state: PersistedState): void;
  resetAll(): void;
  /**
   * Apply the effects of Super Rebirthing:
   *   - award SRB crystals for the current RB level (if ≥12)
   *   - zero every card's working + lounge counts (keep owned)
   *   - reset standardRebirth to 0, increment superRebirthCount
   *   - clear currentCredits and upgradeChips
   */
  performSuperRebirth(): { crystalsAwarded: number; newSrbCount: number };
}

export type AppStore = PersistedState & Actions;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
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
          const companionCap = companionCapacityOf(s.novaUpgrades);
          const companion =
            patch.companion !== undefined
              ? Math.min(companionCap, clean(patch.companion))
              : (current?.companion ?? 0);
          // Owned auto-true whenever a copy is deployed; otherwise honor the patch or existing state.
          const deployed = working + lounge + companion > 0;
          const owned = deployed
            ? true
            : patch.owned !== undefined
              ? !!patch.owned
              : (current?.owned ?? true);
          const notes = patch.notes !== undefined ? patch.notes : current?.notes;
          if (!owned && working === 0 && lounge === 0 && companion === 0) {
            if (idx >= 0) list.splice(idx, 1);
            return { cards: list };
          }
          const next: CollectionCard = {
            name: (current?.name ?? name.trim()),
            tier: normalizeTier(tier),
            owned,
            working,
            lounge,
            companion,
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
              companion: 0,
            });
          } else {
            const c = list[idx]!;
            list[idx] = { ...c, working: c.working + 1, owned: true };
          }
          return { cards: list };
        });
      },

      moveDeployed(name, tier, from, to) {
        if (from === to) return;
        const card = get().cards.find(
          (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.tier === tier,
        );
        if (!card || card[from] <= 0) return;
        get().setCardCounts(name, tier, {
          [from]: card[from] - 1,
          [to]: (card[to] ?? 0) + 1,
        });
      },

      removeDeployed(name, tier, from) {
        const card = get().cards.find(
          (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.tier === tier,
        );
        if (!card || card[from] <= 0) return;
        get().setCardCounts(name, tier, { [from]: card[from] - 1 });
      },

      upgradeDeployed(name, fromTier, from, to) {
        const s = get();
        const card = s.cards.find(
          (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.tier === fromTier,
        );
        if (!card || card[from] <= 0) return;
        const fromIdx = (TIERS as readonly string[]).indexOf(fromTier);
        if (fromIdx < 0 || fromIdx >= TIERS.length - 1) return; // already top tier
        const nextTier = TIERS[fromIdx + 1]!;
        // Remove 1 from the old tier's slot.
        s.setCardCounts(name, fromTier, { [from]: card[from] - 1 });
        // Add 1 to the new tier — into a slot, or just mark owned ("leave out").
        const nextCard = get().cards.find(
          (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.tier === nextTier,
        );
        if (to) {
          get().setCardCounts(name, nextTier, { [to]: (nextCard?.[to] ?? 0) + 1 });
        } else {
          get().setCardCounts(name, nextTier, { owned: true });
        }
      },

      addDeployed(name, tier, slot) {
        // Companion adds route through moveToCompanion so capacity is respected.
        if (slot === "companion") {
          get().moveToCompanion(name, tier, null);
          return;
        }
        const card = get().cards.find(
          (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase() && c.tier === tier,
        );
        get().setCardCounts(name, tier, { [slot]: (card?.[slot] ?? 0) + 1 });
      },

      moveToCompanion(name, tier, from) {
        const key = name.trim().toLowerCase();
        const match = (c: CollectionCard) => c.name.trim().toLowerCase() === key && c.tier === tier;
        const card = get().cards.find(match);
        // Guard before mutating anything (no-op if the source slot is empty).
        if (from && (!card || card[from] <= 0)) return;

        // Evict existing companions ONLY when there's no free slot. With the
        // Nova "Companion Slot" upgrade bought, a second companion coexists
        // instead of displacing the first.
        const capacity = companionCapacityOf(get().novaUpgrades);
        const needed = (card?.companion ?? 0) > 0 ? 0 : 1;
        const others = get().cards.filter((c) => c.companion > 0 && !match(c));
        let used = others.reduce((n, c) => n + c.companion, 0);
        for (const c of others) {
          if (used + needed <= capacity) break;
          used -= c.companion;
          get().setCardCounts(c.name, c.tier, { companion: 0 });
        }

        const cur = get().cards.find(match);
        const companion = Math.max(1, cur?.companion ?? 0);
        get().setCardCounts(
          name,
          tier,
          from ? { [from]: (cur?.[from] ?? 0) - 1, companion } : { companion },
        );
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

      setLoungeCreditSlots(n) {
        set((s) => ({
          profile: { ...s.profile, loungeCreditSlots: Math.max(0, Math.floor(n)) },
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

      setIconicMerchantBought(droidName, bought) {
        set((s) => {
          const key = droidName.trim().toUpperCase();
          const existing = s.iconicMerchantBought.some((n) => n.trim().toUpperCase() === key);
          if (bought && !existing) {
            return { iconicMerchantBought: [...s.iconicMerchantBought, droidName.trim()] };
          }
          if (!bought && existing) {
            return {
              iconicMerchantBought: s.iconicMerchantBought.filter(
                (n) => n.trim().toUpperCase() !== key,
              ),
            };
          }
          return {};
        });
      },

      startCraft(station, name, tier) {
        set((s) => {
          // Blocked if the station is already occupied — one slot per station.
          if (s.craftingStations.some((c) => c.station === station)) return {};
          return {
            craftingStations: [
              ...s.craftingStations,
              { station, name: name.trim(), tier, state: "crafting" },
            ],
          };
        });
      },

      setStationState(station, state) {
        set((s) => ({
          craftingStations: s.craftingStations.map((c) =>
            c.station === station ? { ...c, state } : c,
          ),
        }));
      },

      grabStation(station, target) {
        const slot = get().craftingStations.find((c) => c.station === station);
        if (!slot) return;
        if (target) {
          // Deploy the finished droid straight into a slot (also marks owned).
          get().addDeployed(slot.name, slot.tier, target);
        } else {
          // Just mark the crafted droid owned in the Droidex.
          get().setCardCounts(slot.name, slot.tier, { owned: true });
        }
        set((s) => ({
          craftingStations: s.craftingStations.filter((c) => c.station !== station),
        }));
      },

      clearStation(station) {
        set((s) => ({
          craftingStations: s.craftingStations.filter((c) => c.station !== station),
        }));
      },

      setPickaxeLevel(level) {
        const next = Math.max(0, Math.floor(Number(level) || 0));
        set((s) => ({
          profile: {
            ...s.profile,
            pickaxeLevel: next,
            pickaxePeak: Math.max(next, s.profile.pickaxePeak ?? 0),
          },
        }));
      },

      setChipStationDroid(name, tier) {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({ chipStation: { name: trimmed, tier } });
      },

      clearChipStation() {
        set({ chipStation: null });
      },

      setChipRate(name, tier, perMin) {
        const key = name.trim();
        if (!key) return;
        set((s) => {
          const rates: ChipRates = { ...s.chipRates };
          const tiers = { ...(rates[key] ?? {}) };
          // A blank / non-positive entry clears the rate rather than storing 0.
          if (perMin === null || !Number.isFinite(perMin) || perMin <= 0) {
            delete tiers[tier];
          } else {
            tiers[tier] = perMin;
          }
          if (Object.keys(tiers).length === 0) delete rates[key];
          else rates[key] = tiers;
          return { chipRates: rates };
        });
      },

      swapCompanionIntoStation(station) {
        const s = get();
        const slot = s.craftingStations.find((c) => c.station === station);
        if (!slot || slot.state !== "ready") return;
        // Capture the current companion (if any and distinct from the slot droid).
        const prior = s.cards.find(
          (c) =>
            c.companion > 0 &&
            !(c.name.trim().toLowerCase() === slot.name.trim().toLowerCase() && c.tier === slot.tier),
        );
        // Install the slot droid as the new companion (owned).
        get().moveToCompanion(slot.name, slot.tier, null);
        // Park the prior companion back into the station only if it ACTUALLY
        // lost its slot — with a spare Nova companion slot nothing is
        // displaced, so the station just empties.
        const displaced =
          !!prior &&
          !get().cards.some(
            (c) =>
              c.name.trim().toLowerCase() === prior.name.trim().toLowerCase() &&
              c.tier === prior.tier &&
              c.companion > 0,
          );
        set((cur) => ({
          craftingStations: cur.craftingStations.filter((c) => c.station !== station),
        }));
        if (prior && displaced) {
          set((cur) => ({
            craftingStations: [
              ...cur.craftingStations,
              { station, name: prior.name, tier: prior.tier, state: "ready" },
            ],
          }));
        }
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

      setStatOverride(name, tier, patch) {
        const key = name.trim();
        if (!key) return;
        set((s) => {
          const droid = { ...(s.statOverrides[key] ?? {}) };
          const cur: Partial<DroidTierStat> = { ...(droid[tier] ?? {}) };
          // Apply each field; an empty/blank string clears that field (→ seed).
          for (const field of ["cost", "income", "value"] as const) {
            if (!(field in patch)) continue;
            const v = patch[field];
            if (typeof v === "string" && v.trim()) cur[field] = v.trim();
            else delete cur[field];
          }
          if (Object.keys(cur).length > 0) droid[tier] = cur;
          else delete droid[tier];
          const next = { ...s.statOverrides };
          if (Object.keys(droid).length > 0) next[key] = droid;
          else delete next[key];
          return { statOverrides: next };
        });
      },

      clearStatOverrides(name) {
        const key = name.trim();
        set((s) => {
          if (!(key in s.statOverrides)) return {};
          const next = { ...s.statOverrides };
          delete next[key];
          return { statOverrides: next };
        });
      },

      setActiveTab(tab) {
        set((s) => ({ ui: { ...s.ui, activeTab: tab } }));
      },

      setUiPref(key, value) {
        set((s) => ({ ui: { ...s.ui, [key]: value } }));
      },

      dismissOnboarding() {
        set((s) => ({ ui: { ...s.ui, hasOnboarded: true, pendingSetup: false } }));
      },

      resetOnboarding() {
        // Explicit "show me the intro again" — starts on the explainer,
        // not the setup form (pendingSetup stays false).
        set((s) => ({ ui: { ...s.ui, hasOnboarded: false, pendingSetup: false } }));
      },

      replaceAll(state) {
        set(() => state);
      },

      resetAll() {
        // Fresh start → re-open onboarding straight on the setup form so
        // the player re-enters where they are.
        const fresh = bootstrapState();
        set(() => ({ ...fresh, ui: { ...fresh.ui, pendingSetup: true } }));
      },

      performSuperRebirth() {
        // Compute the bonus first (need pre-mutation state).
        const pre = get();
        const bonus = srbBonusAt(pre.profile.standardRebirth);
        const crystalsAwarded = bonus?.crystals ?? 0;
        set((s) => {
          // Zero deployed counts (working/lounge/companion), keep owned + notes.
          const cards = s.cards
            .map((c) => ({ ...c, working: 0, lounge: 0, companion: 0 }))
            // Sparse-storage rule: drop rows with no ownership + no counts.
            .filter((c) => c.owned || c.working > 0 || c.lounge > 0 || c.companion > 0);
          return {
            cards,
            // Iconic Merchant purchases are per-cycle (1M credits each) —
            // availability resets on Super Rebirth. Unlocks (novaIconicOwned)
            // persist.
            iconicMerchantBought: [],
            // Station occupancy clears on SR (Astromech/Battle also re-lock).
            craftingStations: [],
            // Same for the chip station's occupant. `chipRates` is deliberately
            // NOT cleared — those are observed numbers, not deployment state.
            chipStation: null,
            profile: {
              ...s.profile,
              standardRebirth: 0,
              superRebirthCount: s.profile.superRebirthCount + 1,
              currentCredits: "",
              upgradeChips: 0,
              // Credit-bought lounge slots reset on Super Rebirth; Nova
              // slots persist (tracked via novaUpgrades, untouched here).
              loungeCreditSlots: 0,
              // The pickaxe resets to whatever Pickaxe Mastery preserves —
              // the peak is untouched, because that's what Mastery is bought
              // against and it survives the reset by definition.
              pickaxeLevel: pickaxeLevelsKept(
                s.novaUpgrades.find((u) => u.id === "core.pickaxe-mastery")?.level ?? 0,
              ),
              novaEarned: s.profile.novaEarned + crystalsAwarded,
            },
          };
        });
        return {
          crystalsAwarded,
          newSrbCount: get().profile.superRebirthCount,
        };
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
        iconicMerchantBought: state.iconicMerchantBought ?? [],
        craftingStations: state.craftingStations ?? [],
        chipStation: state.chipStation ?? null,
        chipRates: state.chipRates ?? {},
        statOverrides: state.statOverrides ?? {},
        ui: state.ui,
      }),
    },
  ),
);

// Keep the pure stats layer (droidStats.ts) in sync with the persisted
// overrides, so `statsFromTable` merges them for EVERY consumer (income
// strategy, sell values, base income) without threading a table around.
setStatOverrides(useAppStore.getState().statOverrides ?? {});
useAppStore.subscribe((state) => setStatOverrides(state.statOverrides ?? {}));

export { defaultProfile };
