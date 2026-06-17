import { useMemo } from "react";
import { COSMETICS } from "../data/cosmetics.seed";
import { DROID_DICT, TOTAL_CARDS } from "../data/droids.seed";
import { DROID_STATS } from "../data/droidStats.seed";
import { NOVA_UPGRADES } from "../data/novaShop.seed";
import { SQUAD_TYPES } from "../data/squads.seed";
import { cycleFor } from "../lib/rebirthCycles";
import { computeBalance, crystalsSpent, type NovaBalance } from "../lib/novaCrystals";
import { rebirthsForCycle } from "../lib/sellGuidance";
import { computeProduction, type ProductionTotals } from "../lib/production";
import { scoreRequirements, standardRebirthReady, type ScoredRank } from "../lib/readiness";
import { getMaxSlots, nextSlotUnlock } from "../lib/squads";
import type {
  CosmeticItem,
  CosmeticKind,
  NovaUpgrade,
  RebirthCycle,
  StandardRebirth,
  SquadType,
} from "../types";
import { useAppStore } from "./useAppStore";

export type { NovaBalance };

/** Which rebirth cycle the user is currently on. */
export function useActiveCycle(): RebirthCycle {
  const count = useAppStore((s) => s.profile.superRebirthCount);
  const override = useAppStore((s) => s.profile.cycleOverride);
  return useMemo(() => cycleFor(count, override), [count, override]);
}

/** Merge the active cycle's seed rows with any user overrides. */
function mergeRebirthRows(
  cycle: RebirthCycle,
  overrides: readonly StandardRebirth[],
): StandardRebirth[] {
  const ovMap = new Map<number, StandardRebirth>();
  for (const o of overrides) {
    if (o.cycle === cycle) ovMap.set(o.level, o);
  }
  const seed = rebirthsForCycle(cycle);
  const merged = seed.map((row) => {
    const ov = ovMap.get(row.level);
    return ov ? { ...ov, source: "user" as const } : row;
  });
  // Append user-only levels (rare; mostly defensive).
  for (const o of overrides) {
    if (o.cycle !== cycle) continue;
    if (!seed.some((s) => s.level === o.level)) merged.push({ ...o, source: "user" });
  }
  return merged.sort((a, b) => a.level - b.level);
}

export function useStandardRebirths(): StandardRebirth[] {
  const cycle = useActiveCycle();
  const overrides = useAppStore((s) => s.standardOverrides);
  return useMemo(() => mergeRebirthRows(cycle, overrides), [cycle, overrides]);
}

export interface ScoredStandard extends ScoredRank {
  kind: "standard";
  rb: StandardRebirth;
}
export type ScoredAny = ScoredStandard;

/**
 * "Next unlock": ranks each upcoming rebirth by how close you are to it.
 * Scoped to the active cycle and skips levels you've already cleared.
 */
export function useNextUnlock(limit = 5): { ready: ScoredAny[]; near: ScoredAny[] } {
  const cards = useAppStore((s) => s.cards);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const standards = useStandardRebirths();
  const currentRebirth = useAppStore((s) => s.profile.standardRebirth);

  return useMemo(() => {
    const scored: ScoredAny[] = [];
    for (const rb of standards) {
      if (rb.needs.length === 0) continue;
      if (rb.level <= currentRebirth) continue;
      const s = scoreRequirements(rb.needs, rb.credits, cards, credits);
      scored.push({ ...s, kind: "standard", rb });
    }
    const ready = scored.filter((s) => s.ready);
    const near = scored
      .filter((s) => !s.ready)
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);
    return { ready, near };
  }, [standards, cards, credits, limit, currentRebirth]);
}

export function useStandardReadiness(): Map<number, boolean> {
  const cards = useAppStore((s) => s.cards);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const rebirths = useStandardRebirths();
  return useMemo(() => {
    const map = new Map<number, boolean>();
    for (const rb of rebirths) map.set(rb.level, standardRebirthReady(rb, cards, credits));
    return map;
  }, [rebirths, cards, credits]);
}

export function useReadyCounts(): {
  standardReady: number;
  standardTotal: number;
} {
  const cards = useAppStore((s) => s.cards);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const standards = useStandardRebirths();
  return useMemo(() => {
    const standardReady = standards.filter((rb) => standardRebirthReady(rb, cards, credits)).length;
    return { standardReady, standardTotal: standards.length };
  }, [standards, cards, credits]);
}

/** Per-squad slot capacity at the player's current rebirth level. */
export interface SquadCapacity {
  type: SquadType;
  current: number;
  next: number | null;
}

export function useSquadCapacity(): SquadCapacity[] {
  const rebirth = useAppStore((s) => s.profile.standardRebirth);
  return useMemo(
    () =>
      SQUAD_TYPES.map((type) => ({
        type,
        current: getMaxSlots(type, rebirth),
        next: nextSlotUnlock(type, rebirth),
      })),
    [rebirth],
  );
}

export function useProduction(): ProductionTotals {
  const cards = useAppStore((s) => s.cards);
  return useMemo(() => computeProduction(cards, DROID_STATS), [cards]);
}

export function useDroidexCompletion(): {
  ownedCards: number;
  totalCards: number;
  ownedDroids: number;
  totalDroids: number;
  activeCards: number;
} {
  const cards = useAppStore((s) => s.cards);
  return useMemo(() => {
    let ownedCards = 0;
    let activeCards = 0;
    const ownedDroidNames = new Set<string>();
    for (const c of cards) {
      if (c.owned) {
        ownedCards += 1;
        ownedDroidNames.add(c.name.toUpperCase());
      }
      if (c.active) activeCards += 1;
    }
    return {
      ownedCards,
      totalCards: TOTAL_CARDS,
      ownedDroids: ownedDroidNames.size,
      totalDroids: DROID_DICT.length,
      activeCards,
    };
  }, [cards]);
}

/** Nova Crystals balance (earned manually-recorded; spent derived from upgrade levels). */
export function useNovaBalance(): NovaBalance {
  const earned = useAppStore((s) => s.profile.novaEarned);
  const upgrades = useAppStore((s) => s.novaUpgrades);
  const derivedSpent = useMemo(() => crystalsSpent(upgrades, NOVA_UPGRADES), [upgrades]);
  return useMemo(() => computeBalance(earned, derivedSpent), [earned, derivedSpent]);
}

export function useCosmeticsByKind(): Record<CosmeticKind, CosmeticItem[]> {
  return useMemo(() => {
    const groups: Record<CosmeticKind, CosmeticItem[]> = { HAT: [], PAINT: [], EFFECT: [] };
    for (const c of COSMETICS) groups[c.kind].push(c);
    return groups;
  }, []);
}

export function useCosmeticOwnership(): Map<string, boolean> {
  const cosmetics = useAppStore((s) => s.cosmetics);
  return useMemo(() => {
    const m = new Map<string, boolean>();
    for (const c of cosmetics) m.set(c.id, c.owned);
    return m;
  }, [cosmetics]);
}

export function useNovaShop(): { core: NovaUpgrade[]; workshop: NovaUpgrade[] } {
  return useMemo(() => ({
    core: NOVA_UPGRADES.filter((u) => u.tree === "CORE"),
    workshop: NOVA_UPGRADES.filter((u) => u.tree === "WORKSHOP"),
  }), []);
}

export function useNovaLevels(): Map<string, number> {
  const upgrades = useAppStore((s) => s.novaUpgrades);
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const u of upgrades) m.set(u.id, u.level);
    return m;
  }, [upgrades]);
}
