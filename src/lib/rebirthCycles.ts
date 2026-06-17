import type { RebirthCycle } from "../types";

/**
 * Star Wars: Droid Tycoon's rebirth requirements cycle through 4 distinct
 * tables. The first run (before any Super Rebirth) uses RBC1; after each
 * Super Rebirth you advance to the next cycle, then loop back to RBC1
 * after RBC4.
 *
 *   cycleFor(0) → 1 (RBC1 = OG)
 *   cycleFor(1) → 2 (RBC2 = SRB1)
 *   cycleFor(2) → 3 (RBC3 = SRB2)
 *   cycleFor(3) → 4 (RBC4 = SRB3)
 *   cycleFor(4) → 1 (RBC1 = SRB5)
 */
export function cycleFor(superRebirthCount: number, override?: RebirthCycle | null): RebirthCycle {
  if (override) return override;
  const safe = Math.max(0, Math.floor(superRebirthCount));
  return ((safe % 4) + 1) as RebirthCycle;
}

/** Human label like "RBC1 (OG)" or "RBC3 (after SRB2)". */
export function cycleLabel(cycle: RebirthCycle): string {
  switch (cycle) {
    case 1: return "RBC1 (OG)";
    case 2: return "RBC2 (after SRB1)";
    case 3: return "RBC3 (after SRB2)";
    case 4: return "RBC4 (after SRB3)";
  }
}

export const ALL_CYCLES: readonly RebirthCycle[] = [1, 2, 3, 4];
