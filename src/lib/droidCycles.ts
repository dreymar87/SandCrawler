import { ALL_CYCLES } from "./rebirthCycles";
import { computeCycleStrategy } from "./cycleStrategy";
import { normalizeName } from "./normalize";
import type { RebirthCycle } from "../types";

/**
 * Which rebirth cycles (1–4) require each droid *anywhere* in that cycle.
 *
 * A droid is "needed in cycle N" iff it's a keeper of
 * `computeCycleStrategy(N)` (which unions every RB level's requirements).
 * The map is keyed by `normalizeName(canonical)` and built once — the data
 * is static (seed only), independent of store state.
 */
let cache: Map<string, RebirthCycle[]> | null = null;

function build(): Map<string, RebirthCycle[]> {
  const map = new Map<string, RebirthCycle[]>();
  for (const cycle of ALL_CYCLES) {
    for (const keeper of computeCycleStrategy(cycle).keepers) {
      const key = normalizeName(keeper.name);
      const arr = map.get(key);
      // ALL_CYCLES is ascending, so pushing keeps each list sorted.
      if (arr) {
        if (!arr.includes(cycle)) arr.push(cycle);
      } else {
        map.set(key, [cycle]);
      }
    }
  }
  return map;
}

/** The rebirth cycles that require this droid, ascending. Empty if never needed. */
export function droidCycles(canonicalName: string): RebirthCycle[] {
  if (!cache) cache = build();
  return cache.get(normalizeName(canonicalName)) ?? [];
}
