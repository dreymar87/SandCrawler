import { REBIRTH_CYCLES } from "../data/rebirthCycles.seed";
import type { RebirthCycle, StandardRebirth } from "../types";
import { normalizeName } from "./normalize";

export type SellHint =
  /** The community sheet flags this rebirth as "do not sell" anything. */
  | { kind: "DO_NOT_SELL" }
  /** The droid appears in the sell list for the current rebirth. */
  | { kind: "SAFE_TO_SELL" }
  /** Safe by elimination: the droid never appears in any future cycle requirement. */
  | { kind: "NOT_NEEDED" }
  /** The droid is required somewhere ahead — keep it. */
  | { kind: "KEEP"; nextLevel: number }
  /** No data to make a recommendation. */
  | { kind: "UNKNOWN" };

/**
 * Should the player sell `droidName` if they're currently at `currentLevel`
 * of `cycle`?
 *
 * Priority:
 *   1. If the current row says DO_NOT_SELL, propagate that as a guard.
 *   2. If the current row's sellList names the droid, it's safe.
 *   3. Otherwise scan all *future* requirements in this cycle: if the
 *      droid shows up later, return KEEP with that level; if never, it's
 *      NOT_NEEDED.
 */
export function sellHint(
  droidName: string,
  cycle: RebirthCycle,
  currentLevel: number,
): SellHint {
  const key = normalizeName(droidName);
  const cycleRows = REBIRTH_CYCLES.filter((r) => r.cycle === cycle);
  const currentRow = cycleRows.find((r) => r.level === currentLevel);

  if (currentRow) {
    if (currentRow.sellList.includes("DO_NOT_SELL")) {
      return { kind: "DO_NOT_SELL" };
    }
    if (currentRow.sellList.some((n) => normalizeName(n) === key)) {
      return { kind: "SAFE_TO_SELL" };
    }
  }

  const future = cycleRows.filter((r) => r.level > currentLevel);
  const upcoming = future.find((r) =>
    r.needs.some((n) => normalizeName(n.name) === key),
  );
  if (upcoming) return { kind: "KEEP", nextLevel: upcoming.level };
  if (cycleRows.length === 0) return { kind: "UNKNOWN" };
  return { kind: "NOT_NEEDED" };
}

/** Quick filter: rows of the active cycle, sorted by level. */
export function rebirthsForCycle(cycle: RebirthCycle): StandardRebirth[] {
  return REBIRTH_CYCLES.filter((r) => r.cycle === cycle).sort((a, b) => a.level - b.level);
}
