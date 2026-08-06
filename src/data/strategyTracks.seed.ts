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
    | "SCRAP_SWING"
    | "CRYSTALS_PER_DAY"
    | "CONVENIENCE"
    | "DROP_QUALITY";
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
 * ── The four scrap pile tiers ────────────────────────────────────────────
 *
 * `swingsPerPile` is CAPACITY, NOT PAYOUT. The field is named that way on
 * purpose, because the obvious reading of this data is wrong and was very
 * nearly acted on.
 *
 * A player reported piles worth 5M / 10M / 20M / 40M — doubling by tier —
 * which looks like scrap income being up to 8x what we modelled. It isn't.
 * Piles have a health bar, and the higher tiers take proportionally more
 * swings to empty. Each SWING pays the same `scrapSwingSeconds(level)` of
 * your credit rate whatever the tier; a rainbow pile just holds eight swings'
 * worth in one place.
 *
 * The four readings agree exactly on the implied rate, which is what makes
 * this a measurement rather than a story — at Scrap Value L3 (1.5 s a swing):
 *
 *   common  5M / 1 swing  = 5M -> 3.33M/s      diamond 20M / 4 = 5M -> 3.33M/s
 *   gold   10M / 2 swings = 5M -> 3.33M/s      rainbow 40M / 8 = 5M -> 3.33M/s
 *
 * So tier changes credits per PILE, and therefore how far you walk between
 * swings. It does not change credits per second, and it must not appear in
 * the Scrap Value effect below. See MECHANICS.md §1 and the correction in §6.
 */
export const SCRAP_TIERS = [
  { key: "COMMON", label: "Common", swingsPerPile: 1 },
  { key: "GOLD", label: "Gold", swingsPerPile: 2 },
  { key: "DIAMOND", label: "Diamond", swingsPerPile: 4 },
  { key: "RAINBOW", label: "Rainbow", swingsPerPile: 8 },
] as const;

export type ScrapTierKey = (typeof SCRAP_TIERS)[number]["key"];

/**
 * Seconds of your credit generation one full-value swing pays, at a given
 * Scrap Value level. The shop states it directly: L3 pays "credits based on
 * 1.5 seconds of base credit generation".
 */
export function scrapSwingSeconds(scrapValueLevel: number): number {
  return 0.5 * Math.max(0, scrapValueLevel);
}

/**
 * Swings to empty a pile of this tier, assuming your pickaxe level is at or
 * above the pile's. Below it the pile takes MORE swings for the same total
 * payout — the penalty is real but unmeasured, which is why callers can
 * override this.
 */
export function scrapPileSwings(tier: ScrapTierKey): number {
  return SCRAP_TIERS.find((t) => t.key === tier)?.swingsPerPile ?? 1;
}

/**
 * Seconds removed from a droid build by one swing, as a function of pickaxe
 * level. Measured at L10 = 13.2s and L11 = 14.4s, a clean +1.2 per level:
 *
 *     swingSeconds(n) = 1.2 * (n + 1)
 *
 * Predicts L12 = 15.6s and L20 = 25.2s, neither yet checked.
 */
export function buildSwingSeconds(pickaxeLevel: number): number {
  return 1.2 * (Math.max(0, pickaxeLevel) + 1);
}

/**
 * Pickaxe levels retained through a Super Rebirth, by Pickaxe Mastery level.
 * The shop states it: L1 keeps 5, L2 keeps 7 — +2 a level, to 25 at L11.
 */
export function pickaxeLevelsKept(masteryLevel: number): number {
  return masteryLevel <= 0 ? 0 : 5 + 2 * (masteryLevel - 1);
}

/**
 * ── Pickaxe level RESETS on Super Rebirth ────────────────────────────────
 * and this is probably where the two-hour setup actually goes.
 *
 * Swings drive both income streams and the build rate, and all three collapse
 * at the start of a run:
 *
 *   pickaxe L0  ->  1.2s a swing,  ~4x build rate   (11% of an L11 player)
 *   pickaxe L6  ->  8.4s a swing, ~23x build rate   (59%)
 *   pickaxe L11 -> 14.4s a swing, ~39x build rate   (100%)
 *
 * Scrap income is gated on pickaxe level ≥ the pile's, so it is suppressed
 * over the same stretch. Re-levelling the pickaxe at the merchant is therefore
 * a plausible dominant term in setup time — more so than crafting, which
 * swinging already makes near-instant.
 *
 * PICKAXE MASTERY preserves levels through the reset — see
 * `pickaxeLevelsKept`. It is a setup-time upgrade, not a power one, and the
 * cheapest meaningful one in the shop: the right target is whatever mastery
 * level matches your PEAK pickaxe, since anything beyond that preserves levels
 * you never reach. For a player at pickaxe 11 that is Mastery L4, at 45
 * crystals all-in — against restarting at 5, which is half the build rate and
 * a suppressed scrap station until you re-level.
 */
export const PICKAXE_RESETS_ON_SUPER_REBIRTH = true;

/**
 * Build swings per second. Unlike the scrap station there is NO 2-second gate
 * here — players report 2-3 swings a second.
 *
 * That makes crafting a non-issue. At 2.5 swings/s the effective build rate is
 * ~36x, so a 6-hour RAINBOW craft finishes in about ten minutes and a
 * 38-minute one in about a minute. The crafting times in `craftingTimes.seed`
 * describe the un-swung case, which is not the case anyone plays.
 *
 * The consequence for the buy order is counter-intuitive: because swings
 * dominate the build rate, upgrades that scale swings (the crit ladders) beat
 * the flat +0.1/sec of Crafting Speed by ~3x per crystal — the reverse of the
 * ranking at a 2s cadence. But BOTH are low priority anyway, since build time
 * has stopped being the setup bottleneck. Setup is acquisition, deployment and
 * the early rebirth grind, none of which a build-speed upgrade touches.
 */
export const BUILD_SWINGS_PER_SEC = 2.5;

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
    //
    // DELIBERATELY NOT tier-multiplied. The four pile tiers (SCRAP_TIERS) are
    // worth 1x/2x/4x/8x PER PILE and take 1/2/4/8 swings to empty, so the
    // per-swing payout — the only thing that sets a rate — is identical across
    // them. Multiplying this by an expected tier value would inflate scrap
    // income by roughly 2x and push Scrap Value several places up the ranking
    // for no reason. `upgradeValue.test.ts` guards against exactly that.
    gainAt: (n) => 0.5 * n * SCRAP_SWINGS_PER_SEC,
    activeOnly: true,
    effect:
      "+0.5 seconds of base credit generation per swing per level (L3 = 1.5 s), one full-value swing / 2 s. Pile tier changes credits per pile, not per swing — a rainbow pile is eight swings in one place, so it saves walking, not time",
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
      "Buys BUILD TIME, not credits/s. Priceable: at 2-3 swings/s the build rate is ~36x and one crit-chance level adds ~4.6% for 90 crystals, about 3x better per crystal than Crafting Speed. Still low priority — at 36x a six-hour craft takes ten minutes, so build time is not what makes setup long. Pickaxe level is the lever that matters here, and Pickaxe Mastery is the upgrade that protects it.",
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
      "Buys setup TIME, not credits/s. And very little of it: +0.1/sec against an effective build rate of ~36x is +0.3%, which is why the crit ladders beat it despite costing 5x more per level.",
    source: "in-game shop text",
  },
  {
    id: "featured.daily-crystals",
    unit: "CRYSTALS_PER_DAY",
    // One crystal per daily quest, three quests a day.
    gainAt: () => 3,
    activeOnly: false,
    effect: "3 Nova Crystals a day (1 per daily quest, 3 quests)",
    whyNotRanked:
      "Pays in crystals, not credits/s. Convertible though: at 3/day it beats a Credits level per crystal spent for anyone playing under ~6h a day, which is most people. 30 crystals returning 3/day breaks even in 10 days.",
    source: "player-reported, in-game",
  },
  {
    id: "core.double-daily-quests",
    unit: "CRYSTALS_PER_DAY",
    // Doubles the three daily quests to six, so +3/day over Daily Crystals.
    gainAt: () => 3,
    activeOnly: false,
    effect: "+3 Nova Crystals a day (doubles 3 daily quests to 6)",
    whyNotRanked:
      "Crystals, not credits/s — but directly comparable once converted. At 2h play/day it returns 20 crystals-per-hour per 1000 spent against a Credits level's 6.4; they cross at ~6.3h/day. Quests also RESET on Super Rebirth, so an SR day can yield 12 rather than 6, which pushes the crossover higher still.",
    source: "player-reported, in-game",
  },
  {
    id: "workshop.collect-all",
    unit: "CONVENIENCE",
    // L1 Battle, L2 Astromech, L3 Workers.
    gainAt: (n) => Math.min(n, 3),
    activeOnly: false,
    effect: "Collect a whole squad's credits without walking the base — L1 Battle, L2 Astromech, L3 Workers",
    whyNotRanked:
      "Saves real minutes per collection cycle rather than changing any rate. Unlike crafting — which swinging already makes near-instant — walking the base is time no upgrade otherwise removes, so this is one of the few genuine setup-time buys.",
    source: "player-reported, in-game",
  },
  {
    id: "workshop.blueprint-scrap",
    unit: "DROP_QUALITY",
    gainAt: (n) => n,
    activeOnly: false,
    effect: "Chance of better blueprints from the scrap station, per level",
    whyNotRanked:
      "Shifts a drop distribution with no published rates, so there's nothing to convert. Matters only insofar as blueprint scarcity gates droid acquisition, which is the actual setup bottleneck.",
    source: "in-game shop text",
  },
  {
    id: "core.super-crates",
    unit: "DROP_QUALITY",
    gainAt: (n) => n,
    activeOnly: true,
    effect: "Better crates found around Tatooine, per level",
    whyNotRanked:
      "Drop quality with no published rates. Also throughput-capped by the world: only a handful of crates exist and a full map circuit takes 2-3 minutes, so the ceiling is low regardless of quality.",
    source: "player-reported, in-game",
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
      id: "core.double-daily-quests",
      throughLevel: 1,
      why: "6 crystals a day instead of 3. Converted to crystals/hour it returns ~20 per 1000 spent at 2h play/day against a Credits level's 6.4 — it only loses past ~6.3h/day. Quests also reset on Super Rebirth, so an SR day can pay 12.",
    },
    {
      id: "core.pickaxe-mastery",
      throughLevel: 4,
      why: "Keeps 5 pickaxe levels at L1, +2 per level after. Pickaxe resets on Super Rebirth and drives both the scrap station and the ~36x build rate, so without this you restart at half power and grind it back. Buy up to the level that matches your PEAK pickaxe — L4 keeps 11 for 45 crystals all-in — and no further, since beyond that it preserves levels you never reach.",
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
      why: "3 crystals for the Battle squad; L2 adds Astromech, L3 Workers. Walking the base to collect is time no other upgrade removes — crafting is already near-instant if you swing, so this is one of the few real setup-time buys.",
    },
    {
      id: "workshop.crafting-speed",
      throughLevel: 3,
      why: "DEMOTED by measurement: +0.1/sec against a swung build rate of ~36x is +0.3%. Re-crafting is not what makes a run slow once you swing at builds. Kept only because L1-3 are cheap.",
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
      why: "Priced at last, and the verdict is 'low priority for a new reason'. Crits scale build swings, which at 2-3 swings/s dominate the build rate (~36x) — so per crystal they beat Crafting Speed ~3x. But at 36x a six-hour craft takes ten minutes, so build time is no longer what makes a run long. Buy these only once setup is genuinely crafting-bound.",
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
