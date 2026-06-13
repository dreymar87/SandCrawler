import { useMemo } from "react";
import { DROID_DICT, TOTAL_CARDS } from "../data/droids.seed";
import { DROID_STATS } from "../data/droidStats.seed";
import { SQUAD_TYPES, type SquadType } from "../data/squads.seed";
import { STANDARD_REBIRTHS } from "../data/standardRebirths.seed";
import { computeProduction, type ProductionTotals } from "../lib/production";
import {
  rankReady,
  scoreRequirements,
  standardRebirthReady,
  type ScoredRank,
} from "../lib/readiness";
import { getMaxSlots, nextSlotUnlock } from "../lib/squads";
import type { PersistedState, Rank, StandardRebirth, SuperRebirth } from "../types";
import { useAppStore } from "./useAppStore";

/** Merge the seed Standard Rebirth table with user overrides (level matched). */
export function mergeStandardRebirths(
  state: Pick<PersistedState, "standardOverrides">,
): StandardRebirth[] {
  const overrides = new Map(state.standardOverrides.map((o) => [o.level, o]));
  const merged = STANDARD_REBIRTHS.map((seed): StandardRebirth => {
    const ov = overrides.get(seed.level);
    return ov ? { ...ov, source: "user" } : seed;
  });
  for (const o of state.standardOverrides) {
    if (!STANDARD_REBIRTHS.some((s) => s.level === o.level)) merged.push({ ...o, source: "user" });
  }
  return merged.sort((a, b) => a.level - b.level);
}

export function useStandardRebirths(): StandardRebirth[] {
  const overrides = useAppStore((s) => s.standardOverrides);
  return useMemo(() => mergeStandardRebirths({ standardOverrides: overrides }), [overrides]);
}

export interface ScoredStandard extends ScoredRank {
  kind: "standard";
  rb: StandardRebirth;
}

export interface ScoredSuper extends ScoredRank {
  kind: "super";
  group: SuperRebirth;
  rank: Rank;
}

export type ScoredAny = ScoredStandard | ScoredSuper;

/**
 * Computes "next unlock" ranking across both Standard and Super rebirths.
 * Hides Standard rebirths at or below the player's current level (so a
 * level-12 player isn't reminded about RB1).
 */
export function useNextUnlock(limit = 5): { ready: ScoredAny[]; near: ScoredAny[] } {
  const cards = useAppStore((s) => s.cards);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const supers = useAppStore((s) => s.superRebirths);
  const standards = useStandardRebirths();
  const currentRebirth = useAppStore((s) => s.profile.standardRebirth);

  return useMemo(() => {
    const scored: ScoredAny[] = [];

    for (const rb of standards) {
      if (rb.needs.length === 0) continue;
      if (rb.level <= currentRebirth) continue; // already passed
      const s = scoreRequirements(rb.needs, rb.credits, cards, credits);
      scored.push({ ...s, kind: "standard", rb });
    }
    for (const g of supers) {
      for (const r of g.ranks) {
        if (r.droids.length === 0) continue;
        const effectiveCurrent = r.creditsReady ? r.credits : credits;
        const s = scoreRequirements(r.droids, r.credits, cards, effectiveCurrent);
        const ready = rankReady(r, cards);
        scored.push({ ...s, ready, kind: "super", group: g, rank: r });
      }
    }

    const ready = scored.filter((s) => s.ready);
    const near = scored
      .filter((s) => !s.ready)
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);
    return { ready, near };
  }, [supers, standards, cards, credits, limit, currentRebirth]);
}

export function useStandardReadiness(): Map<number, boolean> {
  const cards = useAppStore((s) => s.cards);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const rebirths = useStandardRebirths();
  return useMemo(() => {
    const map = new Map<number, boolean>();
    for (const rb of rebirths) {
      map.set(rb.level, standardRebirthReady(rb, cards, credits));
    }
    return map;
  }, [rebirths, cards, credits]);
}

export function useReadyCounts(): {
  standardReady: number;
  superReady: number;
  standardTotal: number;
  superTotal: number;
} {
  const cards = useAppStore((s) => s.cards);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const supers = useAppStore((s) => s.superRebirths);
  const standards = useStandardRebirths();
  return useMemo(() => {
    const standardReady = standards.filter((rb) => standardRebirthReady(rb, cards, credits)).length;
    const standardTotal = standards.length;
    let superReady = 0;
    let superTotal = 0;
    for (const g of supers) {
      for (const r of g.ranks) {
        superTotal += 1;
        if (rankReady(r, cards)) superReady += 1;
      }
    }
    return { standardReady, superReady, standardTotal, superTotal };
  }, [supers, standards, cards, credits]);
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

/** Total credits-per-second from active cards. */
export function useProduction(): ProductionTotals {
  const cards = useAppStore((s) => s.cards);
  return useMemo(() => computeProduction(cards, DROID_STATS), [cards]);
}

/** Droidex completion stats. Active cards are a strict subset of owned. */
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
