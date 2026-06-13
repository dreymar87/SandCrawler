/**
 * Per-droid economic stats: upgrade cost, income (credits/sec), and value
 * for every droid × tier combination.
 *
 * Game facts re-derived from a community Google Sheet (via the
 * erikpeik/droidex repo). MYTHIC droids have null cost/value and a
 * percentage income (e.g. "5%/s") since they're event-locked boosters.
 *
 * Values keep their in-game notation ("3.8k", "112.50m", "8.80b") so we
 * can display them as the player sees them. Parsing into bigint happens
 * lazily via lib/credits.ts.
 */
import type { DroidStats } from "../types";
import raw from "./droidStats.json";

export const DROID_STATS = raw as DroidStats;
