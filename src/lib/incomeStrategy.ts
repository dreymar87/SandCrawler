import { DROID_DICT } from "../data/droids.seed";
import { TIERS } from "../constants";
import { parseIncome } from "./credits";
import { chipsBetween } from "./chipCosts";
import { computeCycleStrategy, isDroidSafeToSell, type KeeperEntry } from "./cycleStrategy";
import { resolveDroid, tierStatsFor } from "./droidStats";
import { normalizeName } from "./normalize";
import { getMaxSlots } from "./squads";
import { tierRank } from "./tiers";
import type { CollectionCard, Rarity, RebirthCycle, Tier } from "../types";
import type { ProductionClass } from "./baseView";

/** The three squad classes whose droids occupy working (credit-mining) slots. */
export const PRODUCTION_CLASSES: ProductionClass[] = ["WORKER", "ASTROMECH", "BATTLE"];

/**
 * Parsed credits/sec for a droid at a specific tier. Returns null when the
 * droid has no stats at that tier (sparse data — e.g. MYTHIC lack GALACTIC)
 * or when income is a "%/s" booster (ICONIC), which can't be ranked as flat.
 */
export function incomeAt(name: string, tier: Tier): bigint | null {
  const stat = tierStatsFor(name)?.[tier];
  if (!stat) return null;
  return parseIncome(stat.income);
}

/** The best flat-income tier a droid can reach (highest tier with real /s data). */
function maxIncomeTier(name: string): { tier: Tier; income: bigint } | null {
  let best: { tier: Tier; income: bigint } | null = null;
  for (const tier of TIERS) {
    const v = incomeAt(name, tier);
    if (v === null || v <= 0n) continue;
    if (best === null || v > best.income) best = { tier, income: v };
  }
  return best;
}

export interface IncomeRow {
  /** Canonical droid name. */
  name: string;
  class: ProductionClass;
  /** Best tier this droid is currently deployed at. */
  tier: Tier;
  /** Credits/sec per copy at `tier` — null for ICONIC %/s boosters. */
  income: bigint | null;
  /** Raw stat string, e.g. "1.92k/s" — the game's own notation. */
  incomeLabel: string;
  working: number;
  lounge: number;
  companion: number;
  /** True if some RB above `currentLevel` in the cycle needs this droid. */
  needed: boolean;
  neededThru: number | null;
  /**
   * Set when the droid has Lounge copies that would earn more in a working
   * slot of its class. `gain` is the credits/s improvement; `swapWith` is the
   * weakest current worker it would replace (with its tier + income so the
   * gain is self-explanatory), or null when there's a free slot to fill.
   */
  moveHint: { gain: bigint; swapWith: { name: string; tier: Tier; income: bigint } | null } | null;
}

/** Aggregated active deployment for one droid, keeping the best tier PER slot. */
interface Agg {
  canonical: string;
  cls: ProductionClass;
  working: number;
  lounge: number;
  companion: number;
  workingTier: Tier | null;
  loungeTier: Tier | null;
  companionTier: Tier | null;
}

function keeperMap(cycle: RebirthCycle): Map<string, KeeperEntry> {
  const m = new Map<string, KeeperEntry>();
  for (const k of computeCycleStrategy(cycle).keepers) m.set(normalizeName(k.name), k);
  return m;
}

/**
 * The player's ACTIVELY DEPLOYED droids (working/lounge/companion counts > 0),
 * grouped by production class and ranked by income. The Droidex `owned` flag
 * is deliberately ignored — it persists through Super Rebirths and sells, so
 * it doesn't mean the droid is actually on the base.
 *
 * For a droid sitting in Lounge that would earn more in a working slot, a
 * `moveHint` is attached (fill a free slot, or swap out the weakest worker).
 */
export function deployedByClass(args: {
  cards: CollectionCard[];
  cycle: RebirthCycle;
  currentLevel: number;
  rebirthLevel: number;
}): Record<ProductionClass, IncomeRow[]> {
  const { cards, cycle, currentLevel, rebirthLevel } = args;
  const keepers = keeperMap(cycle);

  const byName = new Map<string, Agg>();
  for (const c of cards) {
    if (c.working + c.lounge + c.companion <= 0) continue;
    const def = resolveDroid(c.name);
    const cls = def?.class;
    if (cls !== "WORKER" && cls !== "ASTROMECH" && cls !== "BATTLE") continue;
    const canonical = def!.canonical;
    const key = normalizeName(canonical);
    const agg =
      byName.get(key) ??
      {
        canonical,
        cls,
        working: 0,
        lounge: 0,
        companion: 0,
        workingTier: null,
        loungeTier: null,
        companionTier: null,
      };
    // Track the best tier PER slot — a droid can sit at different tiers in
    // working vs lounge, and each slot must be scored at its own tier.
    if (c.working > 0) {
      agg.working += c.working;
      if (agg.workingTier === null || tierRank(c.tier) > tierRank(agg.workingTier)) agg.workingTier = c.tier;
    }
    if (c.lounge > 0) {
      agg.lounge += c.lounge;
      if (agg.loungeTier === null || tierRank(c.tier) > tierRank(agg.loungeTier)) agg.loungeTier = c.tier;
    }
    if (c.companion > 0) {
      agg.companion += c.companion;
      if (agg.companionTier === null || tierRank(c.tier) > tierRank(agg.companionTier)) agg.companionTier = c.tier;
    }
    byName.set(key, agg);
  }

  const aggsByClass: Record<ProductionClass, Agg[]> = { WORKER: [], ASTROMECH: [], BATTLE: [] };
  for (const agg of byName.values()) aggsByClass[agg.cls].push(agg);

  const result: Record<ProductionClass, IncomeRow[]> = { WORKER: [], ASTROMECH: [], BATTLE: [] };
  for (const cls of PRODUCTION_CLASSES) {
    const aggs = aggsByClass[cls];
    const totalWorking = aggs.reduce((s, a) => s + a.working, 0);
    const freeSlots = Math.max(0, getMaxSlots(cls, rebirthLevel) - totalWorking);

    // Weakest current worker (min income at its WORKING tier) — swap-out target.
    let weakest: { name: string; tier: Tier; income: bigint } | null = null;
    for (const a of aggs) {
      if (a.working <= 0 || a.workingTier === null) continue;
      const inc = incomeAt(a.canonical, a.workingTier);
      if (inc === null) continue;
      if (weakest === null || inc < weakest.income) {
        weakest = { name: a.canonical, tier: a.workingTier, income: inc };
      }
    }

    for (const a of aggs) {
      // Primary slot drives the row's headline income: what it earns now if
      // working, else what it would earn (lounge/companion tier).
      const primaryTier = (a.working > 0 ? a.workingTier : a.lounge > 0 ? a.loungeTier : a.companionTier)!;
      const income = incomeAt(a.canonical, primaryTier);
      const keeper = keepers.get(normalizeName(a.canonical));
      const needed = keeper ? !isDroidSafeToSell(a.canonical, cycle, currentLevel) : false;

      let moveHint: IncomeRow["moveHint"] = null;
      if (a.lounge > 0 && a.loungeTier !== null) {
        const loungeIncome = incomeAt(a.canonical, a.loungeTier);
        if (loungeIncome !== null && loungeIncome > 0n) {
          if (freeSlots > 0) {
            moveHint = { gain: loungeIncome, swapWith: null };
          } else if (weakest !== null && weakest.name !== a.canonical && loungeIncome > weakest.income) {
            moveHint = { gain: loungeIncome - weakest.income, swapWith: { ...weakest } };
          }
        }
      }

      result[cls].push({
        name: a.canonical,
        class: cls,
        tier: primaryTier,
        income,
        incomeLabel: tierStatsFor(a.canonical)?.[primaryTier]?.income ?? "",
        working: a.working,
        lounge: a.lounge,
        companion: a.companion,
        needed,
        neededThru: needed && keeper ? keeper.lastNeeded : null,
        moveHint,
      });
    }

    result[cls].sort((a, b) => {
      if (a.income === null && b.income === null) return a.name.localeCompare(b.name);
      if (a.income === null) return 1;
      if (b.income === null) return -1;
      return b.income > a.income ? 1 : b.income < a.income ? -1 : a.name.localeCompare(b.name);
    });
  }
  return result;
}

export interface DexEarner {
  name: string;
  class: ProductionClass;
  tier: Tier;
  income: bigint;
  incomeLabel: string;
  /** True if the player has any copy of this droid deployed right now. */
  active: boolean;
  needed: boolean;
  neededThru: number | null;
}

/**
 * Whole-dex flat-income leaderboard (production classes only), ranked at each
 * droid's max flat-income tier, with an `active` flag for droids the player
 * currently has deployed. Feeds the "Show all" acquisition view.
 */
export function dexLeaderboard(args: {
  cards: CollectionCard[];
  cycle: RebirthCycle;
  currentLevel: number;
}): DexEarner[] {
  const { cards, cycle, currentLevel } = args;
  const keepers = keeperMap(cycle);

  const activeNames = new Set<string>();
  for (const c of cards) {
    if (c.working + c.lounge + c.companion <= 0) continue;
    const def = resolveDroid(c.name);
    activeNames.add(normalizeName(def?.canonical ?? c.name));
  }

  const out: DexEarner[] = [];
  for (const def of DROID_DICT) {
    const cls = def.class;
    if (cls !== "WORKER" && cls !== "ASTROMECH" && cls !== "BATTLE") continue;
    const mx = maxIncomeTier(def.canonical);
    if (!mx) continue; // ICONIC / no flat income
    const keeper = keepers.get(normalizeName(def.canonical));
    const needed = keeper ? !isDroidSafeToSell(def.canonical, cycle, currentLevel) : false;
    out.push({
      name: def.canonical,
      class: cls,
      tier: mx.tier,
      income: mx.income,
      incomeLabel: tierStatsFor(def.canonical)?.[mx.tier]?.income ?? "",
      active: activeNames.has(normalizeName(def.canonical)),
      needed,
      neededThru: needed && keeper ? keeper.lastNeeded : null,
    });
  }
  out.sort((a, b) => (b.income > a.income ? 1 : b.income < a.income ? -1 : a.name.localeCompare(b.name)));
  return out;
}

export interface UpgradePayoff {
  name: string;
  rarity: Rarity;
  /** Current working tier. */
  tier: Tier;
  nextTier: Tier;
  /** Credits/sec gained per copy by the one-tier upgrade. */
  perCopyGain: bigint;
  working: number;
  /** perCopyGain × working copies. */
  totalGain: bigint;
  /** Upgrade-chip cost for the step, or null when unknown. */
  chips: number | null;
  needed: boolean;
}

/**
 * For every droid you currently have working, the credits/sec payoff of
 * upgrading it one tier (× copies) plus the chip cost — sorted by biggest
 * total win. Skips max-tier, booster, and no-data cases.
 */
export function upgradePayoffs(args: {
  cards: CollectionCard[];
  cycle: RebirthCycle;
  currentLevel: number;
}): UpgradePayoff[] {
  const { cards, cycle, currentLevel } = args;
  const out: UpgradePayoff[] = [];

  for (const c of cards) {
    if (c.working <= 0) continue;
    const def = resolveDroid(c.name);
    if (!def) continue;
    const idx = tierRank(c.tier);
    if (idx >= TIERS.length - 1) continue; // already max tier
    const nextTier = TIERS[idx + 1]!;
    const cur = incomeAt(def.canonical, c.tier);
    const next = incomeAt(def.canonical, nextTier);
    if (cur === null || next === null) continue; // booster or missing data
    const perCopyGain = next - cur;
    if (perCopyGain <= 0n) continue;
    out.push({
      name: def.canonical,
      rarity: def.rarity,
      tier: c.tier,
      nextTier,
      perCopyGain,
      working: c.working,
      totalGain: perCopyGain * BigInt(c.working),
      chips: chipsBetween(def.rarity, c.tier, nextTier),
      needed: !isDroidSafeToSell(def.canonical, cycle, currentLevel),
    });
  }

  out.sort((a, b) => (b.totalGain > a.totalGain ? 1 : b.totalGain < a.totalGain ? -1 : 0));
  return out;
}
