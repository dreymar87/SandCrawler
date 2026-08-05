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
      why: "The direct credit multiplier, and the flattest long ladder in the shop — 5 levels for 50 crystals.",
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
      id: "core.credits",
      throughLevel: 10,
      why: "10 levels for 200 crystals total — a fifteenth of what 10 levels of Critical Amount cost.",
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
      why: "5,670 crystals to max — with Critical Amount that's 58% of the entire shop, for no established effect on credit throughput.",
    },
    {
      id: "featured.critical-amount",
      why: "9,720 crystals to max, the single most expensive ladder in the game.",
    },
    {
      id: "core.flawless-charm",
      why: "500 crystals. Flawless is a cosmetic shiny, not a tier — it does nothing for progression.",
    },
    {
      id: "workshop.scrap-value",
      why: "5,605 to max and it climbs fast. Only worth it if you scrap heavily.",
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
