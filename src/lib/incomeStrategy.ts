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

function keeperMap(cycle: RebirthCycle): Map<string, KeeperEntry> {
  const m = new Map<string, KeeperEntry>();
  for (const k of computeCycleStrategy(cycle).keepers) m.set(normalizeName(k.name), k);
  return m;
}

/**
 * The player's ACTIVELY DEPLOYED droids, one row per (name, tier) card — the
 * same granularity the Base tab shows — grouped by production class and ranked
 * by income. The Droidex `owned` flag is deliberately ignored (it persists
 * through Super Rebirths and sells).
 *
 * For a Lounge copy that would earn more in a working slot, a `moveHint` is
 * attached: fill a free slot, or swap out the **weakest working copy**. Because
 * rows are per (name, tier), a droid deployed at two tiers is compared per
 * copy — so the cheapest copy is the one displaced, not whichever tier is
 * highest.
 */
export function deployedByClass(args: {
  cards: CollectionCard[];
  cycle: RebirthCycle;
  currentLevel: number;
  rebirthLevel: number;
}): Record<ProductionClass, IncomeRow[]> {
  const { cards, cycle, currentLevel, rebirthLevel } = args;
  const keepers = keeperMap(cycle);

  const result: Record<ProductionClass, IncomeRow[]> = { WORKER: [], ASTROMECH: [], BATTLE: [] };
  for (const c of cards) {
    if (c.working + c.lounge + c.companion <= 0) continue;
    const def = resolveDroid(c.name);
    const cls = def?.class;
    if (cls !== "WORKER" && cls !== "ASTROMECH" && cls !== "BATTLE") continue;
    const canonical = def!.canonical;
    const keeper = keepers.get(normalizeName(canonical));
    const needed = keeper ? !isDroidSafeToSell(canonical, cycle, currentLevel) : false;
    result[cls].push({
      name: canonical,
      class: cls,
      tier: c.tier,
      income: incomeAt(canonical, c.tier),
      incomeLabel: tierStatsFor(canonical)?.[c.tier]?.income ?? "",
      working: c.working,
      lounge: c.lounge,
      companion: c.companion,
      needed,
      neededThru: needed && keeper ? keeper.lastNeeded : null,
      moveHint: null,
    });
  }

  for (const cls of PRODUCTION_CLASSES) {
    const rows = result[cls];
    const totalWorking = rows.reduce((s, r) => s + r.working, 0);
    const freeSlots = Math.max(0, getMaxSlots(cls, rebirthLevel) - totalWorking);

    // Weakest working COPY (per name+tier) — the copy a swap-in would displace.
    let weakest: { name: string; tier: Tier; income: bigint } | null = null;
    for (const r of rows) {
      if (r.working <= 0 || r.income === null) continue;
      if (weakest === null || r.income < weakest.income) {
        weakest = { name: r.name, tier: r.tier, income: r.income };
      }
    }

    for (const r of rows) {
      if (r.lounge <= 0 || r.income === null || r.income <= 0n) continue;
      if (freeSlots > 0) {
        r.moveHint = { gain: r.income, swapWith: null };
      } else if (
        weakest !== null &&
        !(weakest.name === r.name && weakest.tier === r.tier) &&
        r.income > weakest.income
      ) {
        r.moveHint = { gain: r.income - weakest.income, swapWith: { ...weakest } };
      }
    }

    rows.sort((a, b) => {
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
