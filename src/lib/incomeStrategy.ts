import { DROID_DICT } from "../data/droids.seed";
import { TIERS } from "../constants";
import { parseIncome } from "./credits";
import { chipsBetween } from "./chipCosts";
import { computeCycleStrategy, isDroidSafeToSell, type KeeperEntry } from "./cycleStrategy";
import { resolveDroid, tierStatsFor } from "./droidStats";
import { normalizeName } from "./normalize";
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

/** Highest tier at which the player OWNS this droid (owned flag), or null. */
export function bestOwnedTier2(name: string, cards: CollectionCard[]): Tier | null {
  const key = normalizeName(name);
  let best: Tier | null = null;
  for (const c of cards) {
    if (!c.owned) continue;
    if (normalizeName(c.name) !== key) continue;
    if (best === null || tierRank(c.tier) > tierRank(best)) best = c.tier;
  }
  return best;
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
  /** Tier the income figure is for (best-owned tier, or max tier for unowned). */
  tier: Tier;
  /** Credits/sec at `tier`. */
  income: bigint;
  /** Raw stat string, e.g. "1.92k/s" — the game's own notation. */
  incomeLabel: string;
  owned: boolean;
  /** Total copies currently working (any tier). */
  working: number;
  /** True if some RB above `currentLevel` in the cycle needs this droid. */
  needed: boolean;
  /** Last RB level in the cycle that needs it (when `needed`). */
  neededThru: number | null;
}

export interface RankIncomeArgs {
  cards: CollectionCard[];
  cycle: RebirthCycle;
  currentLevel: number;
  /** When true, append droids you don't own (ranked at their max tier). */
  includeAll: boolean;
}

/**
 * Rank credit-earning droids by income, grouped by the squad class whose
 * slots they fill. Owned droids are ranked at their best-owned tier; when
 * `includeAll`, unowned droids are appended at their max flat-income tier.
 * ICONIC (%/s boosters) and UNKNOWN-class droids are excluded.
 */
export function rankIncome(args: RankIncomeArgs): Record<ProductionClass, IncomeRow[]> {
  const { cards, cycle, currentLevel, includeAll } = args;

  const keeperByName = new Map<string, KeeperEntry>();
  for (const k of computeCycleStrategy(cycle).keepers) keeperByName.set(normalizeName(k.name), k);

  const result: Record<ProductionClass, IncomeRow[]> = { WORKER: [], ASTROMECH: [], BATTLE: [] };

  for (const def of DROID_DICT) {
    const cls = def.class;
    if (cls !== "WORKER" && cls !== "ASTROMECH" && cls !== "BATTLE") continue;

    const ownedTier = bestOwnedTier2(def.canonical, cards);
    let tier: Tier;
    let income: bigint;
    if (ownedTier !== null) {
      const atOwned = incomeAt(def.canonical, ownedTier);
      if (atOwned !== null && atOwned > 0n) {
        tier = ownedTier;
        income = atOwned;
      } else {
        // Owned tier has no flat income (booster / missing) — fall back to max.
        const mx = maxIncomeTier(def.canonical);
        if (!mx) continue;
        tier = mx.tier;
        income = mx.income;
      }
    } else {
      if (!includeAll) continue;
      const mx = maxIncomeTier(def.canonical);
      if (!mx) continue; // no flat income at all (e.g. ICONIC) — skip
      tier = mx.tier;
      income = mx.income;
    }

    const working = cards.reduce(
      (sum, c) => (normalizeName(c.name) === normalizeName(def.canonical) ? sum + c.working : sum),
      0,
    );
    const keeper = keeperByName.get(normalizeName(def.canonical));
    const needed = keeper ? !isDroidSafeToSell(def.canonical, cycle, currentLevel) : false;

    result[cls].push({
      name: def.canonical,
      class: cls,
      tier,
      income,
      incomeLabel: tierStatsFor(def.canonical)?.[tier]?.income ?? "",
      owned: ownedTier !== null,
      working,
      needed,
      neededThru: needed && keeper ? keeper.lastNeeded : null,
    });
  }

  for (const cls of PRODUCTION_CLASSES) {
    result[cls].sort((a, b) =>
      b.income > a.income ? 1 : b.income < a.income ? -1 : a.name.localeCompare(b.name),
    );
  }
  return result;
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
