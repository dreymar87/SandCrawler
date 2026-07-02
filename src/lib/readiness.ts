import type { CollectionCard, RebirthReq, StandardRebirth, Tier } from "../types";
import { satisfies, tierGap, tierRank } from "./tiers";
import { parseCredits } from "./credits";
import { normalizeName } from "./normalize";

/** How many of this card are deployed anywhere (Working + Lounge). */
export function deployedCount(c: CollectionCard): number {
  return c.working + c.lounge;
}

/** True iff at least one copy is deployed (satisfies rebirth eligibility). */
export function isActive(c: CollectionCard): boolean {
  return deployedCount(c) > 0;
}

/** Cards that count toward rebirth requirements (any copy deployed). */
export function activeCards(cards: readonly CollectionCard[]): CollectionCard[] {
  return cards.filter(isActive);
}

/**
 * Does any deployed card in the collection cover this single requirement?
 * Match by normalized name AND tier substitution (owned tier ≥ required).
 *
 * Tier substitution means a deployed MOUSE@GOLD card satisfies a
 * MOUSE@DEFAULT requirement. Lounge counts here — the game accepts
 * either Working or Lounge for the rebirth NEED set.
 */
export function rosterCovers(req: RebirthReq, cards: readonly CollectionCard[]): boolean {
  const reqKey = normalizeName(req.name);
  return cards.some(
    (c) =>
      isActive(c) &&
      normalizeName(c.name) === reqKey &&
      satisfies(req.tier, c.tier),
  );
}

/** Best owned tier for `name` across deployed cards, or `null` if none deployed. */
export function bestOwnedTier(name: string, cards: readonly CollectionCard[]): Tier | null {
  const key = normalizeName(name);
  let best: Tier | null = null;
  for (const c of cards) {
    if (!isActive(c)) continue;
    if (normalizeName(c.name) !== key) continue;
    if (best === null || tierRank(c.tier) > tierRank(best)) best = c.tier;
  }
  return best;
}

/**
 * Standard Rebirth "ready" check. Credits come from the user's current-credits
 * input (free-text) rather than a manual checkbox — Standard Rebirth screens
 * already show the threshold so there's no separate "I have it" toggle.
 */
export function standardRebirthReady(
  rb: StandardRebirth,
  cards: readonly CollectionCard[],
  currentCredits: string,
): boolean {
  if (rb.needs.length === 0) return false;
  if (!rb.needs.every((req) => rosterCovers(req, cards))) return false;
  return parseCredits(currentCredits) >= parseCredits(rb.credits);
}

/** A single missing-droid line for the next-unlock UI. */
export interface Gap {
  name: string;
  requiredTier: Tier;
  ownedTier: Tier | null;
  /** 0 = already covered, 1+ = how many tier upgrades short, TIERS.length = don't own it. */
  tierGap: number;
}

export interface ScoredRank {
  ready: boolean;
  /** Lower is closer to ready. */
  score: number;
  gaps: Gap[];
  /** True iff every droid requirement is covered but credits fall short. */
  creditsOnly: boolean;
}

/**
 * Scores how close the player is to satisfying a set of requirements. Used by
 * both Standard and Super Rebirth views for the "next unlock" ranking. Lower
 * scores surface first.
 *
 *   primary    : number of droids not yet covered          (×100)
 *   secondary  : total tier-upgrade distance to cover them (×1)
 *   tertiary   : credits shortfall, log-scaled             (0–30)
 */
export function scoreRequirements(
  needs: readonly RebirthReq[],
  requiredCredits: string,
  cards: readonly CollectionCard[],
  currentCredits: string,
): ScoredRank {
  const gaps: Gap[] = [];
  for (const req of needs) {
    const owned = bestOwnedTier(req.name, cards);
    const gap = tierGap(req.tier, owned);
    if (gap > 0 || owned === null) {
      gaps.push({ name: req.name, requiredTier: req.tier, ownedTier: owned, tierGap: gap });
    }
  }
  const droidsMissing = gaps.filter((g) => g.ownedTier === null).length;
  const upgradeDistance = gaps.reduce((sum, g) => sum + g.tierGap, 0);

  const reqCredits = parseCredits(requiredCredits);
  const haveCredits = parseCredits(currentCredits);
  const shortfall = reqCredits > haveCredits ? reqCredits - haveCredits : 0n;
  const creditsPenalty = shortfall === 0n ? 0 : Math.min(30, Math.log10(Number(shortfall) + 1) * 2);

  const score = droidsMissing * 100 + upgradeDistance + creditsPenalty;
  const ready = gaps.length === 0 && shortfall === 0n;
  const creditsOnly = gaps.length === 0 && shortfall > 0n;

  return { ready, score, gaps, creditsOnly };
}
