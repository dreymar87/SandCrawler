/**
 * Nova Shop purchase ORDER, per player goal.
 *
 * ── This ranking is editorial, not computed ──────────────────────────────
 * The community workbooks publish crystal COSTS only; nobody has published
 * how much each upgrade level actually *does* (+x% credits per level, etc.).
 * So this can't be solved from data the way the SR-timing table can. What it
 * is instead: an ordering argued from cost structure, crystal scarcity, and
 * game mechanics, with the reasoning written down per step so it can be
 * challenged. `src/lib/srTiming.ts` is computed; this is judgement.
 *
 * The reasoning behind each track lives in STRATEGY.md.
 */
import type { NovaUpgradeState } from "../types";

/**
 * Effect magnitudes we actually KNOW, as opposed to the cost data the
 * workbooks publish.
 *
 * Almost every upgrade is still unmeasured — that's why the tracks below are
 * judgement. For the handful with real numbers, `gainAt` expresses the effect
 * in one common currency: **the fraction of your base credits/s it adds at
 * that level**. That makes different upgrades directly comparable, so
 * `lib/upgradeValue.ts` can rank them by gain-per-crystal instead of arguing.
 */
export interface MeasuredEffect {
  id: string;
  /**
   * What `gainAt` is denominated in. Only `CREDIT_RATE` effects share a
   * currency and can be ranked against each other by `lib/upgradeValue.ts`.
   * Everything else is recorded but excluded from the ranking — see
   * `whyNotRanked` — rather than converted with an invented exchange rate.
   */
  unit:
    | "CREDIT_RATE"
    | "CHIPS"
    | "BUILD_TIME"
    | "CRAFT_SPEED"
    | "SELL_CHANCE"
    | "SCRAP_SWING";
  /** Cumulative gain at `level`, in whatever `unit` says. */
  gainAt: (level: number) => number;
  /** Why this can't join the credit ranking. Required for non-CREDIT_RATE. */
  whyNotRanked?: string;
  /**
   * True when the gain only accrues while you're actively playing. Passive
   * upgrades bank value while you're away; active ones are scaled by how much
   * of a run you actually spend at the screen.
   */
  activeOnly: boolean;
  /** Human-readable statement of the effect. */
  effect: string;
  source: string;
}

/**
 * Full-value swings per second at the scrap station. The game hard-caps this
 * at roughly one swing every two seconds — swinging faster doesn't pay full
 * value — so it's the ceiling on what Scrap Value can be worth.
 */
export const SCRAP_SWINGS_PER_SEC = 0.5;

/**
 * Seconds removed from a droid build by one swing, at pickaxe level 10.
 *
 * Measured in-game. The figure is large enough to reframe crafting entirely:
 * at a 2-second cadence that's 6.6 seconds removed per real second, so the
 * effective build rate is ~7.6x and a 38-minute RAINBOW craft finishes in
 * about five. Setup time is therefore dominated by swinging, not by the
 * printed crafting times — and setup is roughly half of a Super Rebirth run.
 *
 * Two things are still unmeasured: whether build swings share the scrap
 * station's 2-second cap (assumed here), and how the value scales with pickaxe
 * level, which is what would let Pickaxe Mastery be priced.
 */
export const BUILD_SWING_SECONDS_AT_PICKAXE_10 = 13.2;

export const MEASURED_EFFECTS: readonly MeasuredEffect[] = [
  {
    id: "core.credits",
    unit: "CREDIT_RATE",
    // +20% of base per level, additive: L5 = +100%, L25 = +500%.
    gainAt: (n) => 0.2 * n,
    activeOnly: false,
    effect: "+20% of base credits/s per level",
    source: "player-reported, in-game",
  },
  {
    id: "workshop.scrap-value",
    unit: "CREDIT_RATE",
    // The shop states it outright: L3 pays "credits based on 1.5 seconds of
    // base credit generation" per swing. So it IS denominated in your credit
    // rate — 0.5 seconds per level, and at the one-swing-per-2s cap that is
    // 0.25x your rate per second per level.
    //
    // A previous pass moved this OUT of the credit ranking after a player's
    // 1.80M swing failed to reconcile with their apparent 46.9K/s. The wording
    // shows the model was fine and the RATE ESTIMATE was wrong: 1.80M / 1.5s
    // implies 1.20M/s of real generation, which is what the app should have
    // been using all along.
    gainAt: (n) => 0.5 * n * SCRAP_SWINGS_PER_SEC,
    activeOnly: true,
    effect:
      "+0.5 seconds of base credit generation per swing per level (L3 = 1.5 s), one full-value swing / 2 s while your pickaxe level ≥ the pile's",
    source: "in-game shop text",
  },
  {
    id: "workshop.upgrade-chip-scrap",
    unit: "CHIPS",
    // Flat +5 chips per level, ending at +50 — which is the whole ladder,
    // so this one is fully mapped rather than partially.
    gainAt: (n) => 5 * Math.min(n, 10),
    activeOnly: false,
    effect: "+5 upgrade chips per level, capping at +50 (L10)",
    whyNotRanked: "Chips aren't credits, and there's no honest exchange rate between them.",
    source: "player-reported, in-game",
  },
  // Crits apply to swinging at DROIDS WHILE BUILDING — each swing removes time
  // from the build. They buy setup time, not credits. An earlier pass priced
  // them as a credit multiplier and called them a trap; that arithmetic was
  // measuring the wrong thing.
  {
    id: "featured.critical-chance",
    unit: "BUILD_TIME",
    // In-game at L1: "+5% -> 10% Critical Chance" — 5 percentage points a level.
    gainAt: (n) => 0.05 * n,
    activeOnly: true,
    effect: "+5% critical chance per level when swinging at a droid under construction",
    whyNotRanked:
      "Buys BUILD TIME, not credits/s, so it has no place in a credits-per-crystal ranking. It is now priceable though: at 13.2s per swing and a 2s cadence the build rate is ~7.6x, and one crit-chance level adds ~4% to that for 90 crystals — the same order as Crafting Speed's ~1.3% for 18. No longer a trap, just second-best.",
    source: "in-game shop text",
  },
  {
    id: "featured.critical-amount",
    unit: "BUILD_TIME",
    // In-game at L0: "+10% Critical Amount" — 10 percentage points a level.
    gainAt: (n) => 0.1 * n,
    activeOnly: true,
    effect: "+10% critical amount per level — a bigger time cut when a build swing crits",
    whyNotRanked:
      "Same as Critical Chance: build time, not credits, and worth nothing without chance to trigger it.",
    source: "in-game shop text",
  },
  {
    id: "workshop.crafting-speed",
    unit: "CRAFT_SPEED",
    // In-game at L1: "+0.1 -> 0.2/sec Droid crafting".
    gainAt: (n) => 0.1 * n,
    activeOnly: false,
    effect: "+0.1/sec droid crafting per level",
    whyNotRanked:
      "Buys setup TIME, not credits/s — it feeds the Super Rebirth timing model instead, where cutting setup is worth as much as raising income.",
    source: "in-game shop text",
  },
  {
    id: "core.jawa-bartering",
    unit: "SELL_CHANCE",
    // In-game at L1: "5% -> 10% chance to get double rewards when selling a Droid."
    gainAt: (n) => 0.05 * n,
    activeOnly: false,
    effect: "+5% chance of double rewards when selling a droid, per level (L5 = 25%)",
    whyNotRanked:
      "Pays on droid sales, not on your per-second rate — a different denominator from everything in the ranking.",
    source: "in-game shop text",
  },
];

export function measuredEffectFor(id: string): MeasuredEffect | undefined {
  return MEASURED_EFFECTS.find((e) => e.id === id);
}

/** What the player is currently optimising for. */
export type StrategyGoal = "CRYSTALS_PER_HOUR" | "CREDIT_THROUGHPUT";

export interface TrackStep {
  /** Nova upgrade id, matching NOVA_UPGRADES. */
  id: string;
  /** Buy up to and including this level before moving on. */
  throughLevel: number;
  /** One line on why this sits here. Shown in the UI. */
  why: string;
}

export interface StrategyTrack {
  goal: StrategyGoal;
  label: string;
  summary: string;
  steps: readonly TrackStep[];
  /** Upgrades deliberately left out, with the reason. Shown as "skip these". */
  skip: readonly { id: string; why: string }[];
}

/**
 * Goal: maximise Nova Crystals per HOUR.
 *
 * Crystals come almost entirely from Super Rebirthing, so anything that
 * shortens a run (credit rate, or the fixed setup overhead) is worth more
 * than anything that raises the reward at the end of it. The one exception
 * is Daily Crystals, which is income the SR loop doesn't gate at all.
 */
const CRYSTALS_PER_HOUR: StrategyTrack = {
  goal: "CRYSTALS_PER_HOUR",
  label: "Crystals per hour",
  summary:
    "Shorten the Super Rebirth loop and add crystal income that doesn't depend on it.",
  steps: [
    {
      id: "featured.daily-crystals",
      throughLevel: 1,
      why: "The only upgrade in the shop that PRODUCES crystals — every other one is a sink. Costs less than a single SR at RB15.",
    },
    {
      id: "workshop.lounge-slot",
      throughLevel: 1,
      why: "1 crystal. Lounge droids satisfy rebirth requirements without occupying a working slot, so your income droids stay deployed.",
    },
    {
      id: "core.credits",
      throughLevel: 5,
      why: "+20% of base credits/s per level, so L5 DOUBLES your rate for 50 crystals. The best value per crystal of anything measured.",
    },
    {
      id: "workshop.collect-all",
      throughLevel: 1,
      why: "3 crystals off the fixed per-run overhead. Setup time is worth as much as credit rate in the crystals/hour model.",
    },
    {
      id: "workshop.crafting-speed",
      throughLevel: 3,
      why: "Re-crafting droids is most of what makes a fresh run slow. Cutting setup time lifts crystals/hour at every stopping level.",
    },
    {
      id: "workshop.scrap-value",
      throughLevel: 1,
      why: "Computed, not guessed: at the one-swing-per-2s cap L1 is worth +25% of base credits/s for 25 crystals — better per crystal than Credits L6 onward, but NOT better than Credits L1-5. Only pays while you're actively swinging.",
    },
    {
      id: "core.credits",
      throughLevel: 11,
      why: "Every level here still beats the next Scrap Value level per crystal. +20% of base each, additively.",
    },
    {
      id: "workshop.scrap-value",
      throughLevel: 2,
      why: "L2 overtakes Credits L12 per crystal — the point where interleaving pays.",
    },
    {
      id: "core.double-daily-quests",
      throughLevel: 1,
      why: "Doubles a daily reward stream that runs independently of the SR loop.",
    },
    {
      id: "workshop.upgrade-chip-scrap",
      throughLevel: 5,
      why: "Chips gate tier upgrades, and tier upgrades raise income AND satisfy higher-tier rebirth requirements — double duty on both halves of a run.",
    },
    {
      id: "featured.chip-station",
      throughLevel: 1,
      why: "A standing chip income stream. Same double duty as above, without spending a working slot.",
    },
    {
      id: "workshop.lounge-slot",
      throughLevel: 4,
      why: "More requirement parking, so more of your working slots stay on pure income droids.",
    },
    {
      id: "core.credits",
      throughLevel: 25,
      why: "Keep pushing it. A higher credit rate also raises your optimal SR level, compounding with the timing table.",
    },
    {
      id: "workshop.crafting-speed",
      throughLevel: 10,
      why: "Continues cutting the fixed overhead once the cheap wins are gone.",
    },
  ],
  skip: [
    {
      id: "featured.critical-chance",
      why: "Now priced, and it survives: at 13.2s removed per build swing the effective build rate is ~7.6x, and one crit-chance level adds ~4% to that. Real, but Crafting Speed buys ~1.3% for 18 crystals against this 90 — better value per crystal, so crits stay behind it rather than being skipped outright.",
    },
    {
      id: "featured.critical-amount",
      why: "Same: a build-time upgrade, unpriceable until the per-swing time cut is measured. Worth nothing without Critical Chance to trigger it, and the pair is 15,390 crystals — 58% of the shop — so it's worth measuring before committing.",
    },
    {
      id: "core.flawless-charm",
      why: "500 crystals. Flawless is a cosmetic shiny, not a tier — it does nothing for progression.",
    },
    { id: "core.max-health", why: "Combat survivability — doesn't move credits or crystals." },
    { id: "core.damage", why: "Combat damage — doesn't move credits or crystals." },
  ],
};

/**
 * Goal: raw credit throughput — for pushing to a specific rebirth wall
 * rather than farming crystals. Drops the crystal-income picks and the
 * setup-time picks; leans harder on the credit multiplier and slots.
 */
const CREDIT_THROUGHPUT: StrategyTrack = {
  goal: "CREDIT_THROUGHPUT",
  label: "Raw credits",
  summary: "Maximise credits per second to break through a specific rebirth wall.",
  steps: [
    {
      id: "core.credits",
      throughLevel: 10,
      why: "The direct credit multiplier and the cheapest long ladder — 200 crystals for 10 levels.",
    },
    {
      id: "workshop.scrap-value",
      throughLevel: 2,
      why: "+25% of base credits/s per level at the swing cap — worth interleaving with the Credits ladder, but only while you're actively at the screen.",
    },
    {
      id: "workshop.lounge-slot",
      throughLevel: 4,
      why: "Every rebirth-required droid parked in the lounge frees a working slot for an income droid.",
    },
    {
      id: "workshop.upgrade-chip-scrap",
      throughLevel: 10,
      why: "Chips buy tier upgrades, which are the biggest single jump in a droid's credits/s.",
    },
    { id: "featured.chip-station", throughLevel: 1, why: "A standing chip stream for the same reason." },
    {
      id: "core.credits",
      throughLevel: 25,
      why: "Finish the ladder — it stays the best crystals-to-credits conversion in the shop.",
    },
    {
      id: "featured.companion-slot",
      throughLevel: 1,
      why: "A second companion buff running permanently.",
    },
  ],
  skip: [
    { id: "featured.critical-chance", why: "58% of the shop's total cost across the two crit ladders." },
    { id: "featured.critical-amount", why: "The most expensive ladder in the game." },
    { id: "core.flawless-charm", why: "Cosmetic shiny — no progression effect." },
    { id: "core.max-health", why: "Combat survivability — doesn't move credits." },
    { id: "core.damage", why: "Combat damage — doesn't move credits." },
  ],
};

export const STRATEGY_TRACKS: readonly StrategyTrack[] = [
  CRYSTALS_PER_HOUR,
  CREDIT_THROUGHPUT,
];

export function trackFor(goal: StrategyGoal): StrategyTrack {
  return STRATEGY_TRACKS.find((t) => t.goal === goal) ?? CRYSTALS_PER_HOUR;
}

/** Current level of an upgrade in the player's state (0 when unowned). */
export function levelOf(upgrades: readonly NovaUpgradeState[], id: string): number {
  return upgrades.find((u) => u.id === id)?.level ?? 0;
}
