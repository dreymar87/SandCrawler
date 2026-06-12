import { useMemo } from "react";
import { STANDARD_REBIRTHS } from "../data/standardRebirths.seed";
import {
  rankReady,
  scoreRequirements,
  standardRebirthReady,
  type ScoredRank,
} from "../lib/readiness";
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
  // Append any user-added levels the seed doesn't have.
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
 * Computes "next unlock" ranking across BOTH standard and super rebirths.
 * Already-ready entries surface at the top of their kind; otherwise sorted
 * ascending by score (lower = closer to ready).
 */
export function useNextUnlock(limit = 5): { ready: ScoredAny[]; near: ScoredAny[] } {
  const roster = useAppStore((s) => s.roster);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const supers = useAppStore((s) => s.superRebirths);
  const standards = useStandardRebirths();

  return useMemo(() => {
    const scored: ScoredAny[] = [];

    for (const rb of standards) {
      if (rb.needs.length === 0) continue;
      const s = scoreRequirements(rb.needs, rb.credits, roster, credits);
      scored.push({ ...s, kind: "standard", rb });
    }
    for (const g of supers) {
      for (const r of g.ranks) {
        if (r.droids.length === 0) continue;
        // For Super Rebirth, the credits check is governed by the user's
        // creditsReady flag rather than current-credits parsing — that flag
        // is what the prototype used. Treat unset flag as "no credits".
        const effectiveCurrent = r.creditsReady ? r.credits : credits;
        const s = scoreRequirements(r.droids, r.credits, roster, effectiveCurrent);
        // If the flag is on AND droids cover, surface as ready (matches rankReady).
        const ready = rankReady(r, roster);
        scored.push({ ...s, ready, kind: "super", group: g, rank: r });
      }
    }

    const ready = scored.filter((s) => s.ready);
    const near = scored
      .filter((s) => !s.ready)
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);
    return { ready, near };
  }, [supers, standards, roster, credits, limit]);
}

export function useStandardReadiness(): Map<number, boolean> {
  const roster = useAppStore((s) => s.roster);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const rebirths = useStandardRebirths();
  return useMemo(() => {
    const map = new Map<number, boolean>();
    for (const rb of rebirths) {
      map.set(rb.level, standardRebirthReady(rb, roster, credits));
    }
    return map;
  }, [rebirths, roster, credits]);
}

export function useReadyCounts(): { standardReady: number; superReady: number; standardTotal: number; superTotal: number } {
  const roster = useAppStore((s) => s.roster);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const supers = useAppStore((s) => s.superRebirths);
  const standards = useStandardRebirths();
  return useMemo(() => {
    const standardReady = standards.filter((rb) => standardRebirthReady(rb, roster, credits)).length;
    const standardTotal = standards.length;
    let superReady = 0;
    let superTotal = 0;
    for (const g of supers) {
      for (const r of g.ranks) {
        superTotal += 1;
        if (rankReady(r, roster)) superReady += 1;
      }
    }
    return { standardReady, superReady, standardTotal, superTotal };
  }, [supers, standards, roster, credits]);
}
