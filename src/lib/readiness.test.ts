import { describe, expect, it } from "vitest";
import type { Rank, RosterEntry, StandardRebirth } from "../types";
import {
  activeRoster,
  bestOwnedTier,
  rankReady,
  rosterCovers,
  scoreRequirements,
  standardRebirthReady,
} from "./readiness";

const mouseDefault: RosterEntry = { droidId: "Mouse", owned: true, active: true, tier: "DEFAULT" };
const mouseGold: RosterEntry = { droidId: "Mouse", owned: true, active: true, tier: "GOLD" };
const mouseInactive: RosterEntry = { droidId: "Mouse", owned: true, active: false, tier: "BESKAR" };
const pitDefault: RosterEntry = { droidId: "Pit", owned: true, active: true, tier: "DEFAULT" };
const gonkDefault: RosterEntry = { droidId: "Gonk", owned: true, active: true, tier: "DEFAULT" };

describe("activeRoster", () => {
  it("filters to active droids only", () => {
    expect(activeRoster([mouseDefault, mouseInactive])).toEqual([mouseDefault]);
  });
});

describe("rosterCovers", () => {
  it("matches by normalized name and tier substitution", () => {
    expect(rosterCovers({ name: "Mouse", tier: "DEFAULT" }, [mouseGold])).toBe(true);
    expect(rosterCovers({ name: "mouse", tier: "DEFAULT" }, [mouseDefault])).toBe(true);
    // Punctuation differences alone don't break the match (alias logic for
    // WLKR<->Walker lives in the droid dictionary, not here).
    expect(rosterCovers({ name: "MONO-WLKR", tier: "DEFAULT" }, [
      { droidId: "Mono Wlkr", owned: true, active: true, tier: "DEFAULT" },
    ])).toBe(true);
  });

  it("ignores inactive droids", () => {
    expect(rosterCovers({ name: "Mouse", tier: "DEFAULT" }, [mouseInactive])).toBe(false);
  });

  it("rejects lower-tier coverage", () => {
    expect(rosterCovers({ name: "Mouse", tier: "GOLD" }, [mouseDefault])).toBe(false);
  });
});

describe("bestOwnedTier", () => {
  it("returns the highest tier across active duplicates", () => {
    expect(bestOwnedTier("Mouse", [mouseDefault, mouseGold])).toBe("GOLD");
  });

  it("returns null when nothing active matches", () => {
    expect(bestOwnedTier("Mouse", [mouseInactive])).toBe(null);
    expect(bestOwnedTier("Pit", [mouseDefault])).toBe(null);
  });
});

describe("rankReady", () => {
  const baseRank: Rank = {
    id: "r1",
    rank: "1",
    credits: "10K",
    creditsReady: true,
    droids: [
      { name: "Mouse", tier: "DEFAULT" },
      { name: "Pit", tier: "DEFAULT" },
      { name: "Gonk", tier: "DEFAULT" },
    ],
  };

  it("requires every droid covered AND credits flag set", () => {
    expect(rankReady(baseRank, [mouseDefault, pitDefault, gonkDefault])).toBe(true);
  });

  it("is false when credits flag is off", () => {
    expect(rankReady({ ...baseRank, creditsReady: false }, [mouseDefault, pitDefault, gonkDefault])).toBe(false);
  });

  it("is false when any droid is missing", () => {
    expect(rankReady(baseRank, [mouseDefault, pitDefault])).toBe(false);
  });

  it("is false when the rank has no droid requirements", () => {
    expect(rankReady({ ...baseRank, droids: [] }, [mouseDefault])).toBe(false);
  });
});

describe("standardRebirthReady", () => {
  const rb: StandardRebirth = {
    level: 1,
    credits: "10K",
    needs: [
      { name: "C8", tier: "DEFAULT" },
      { name: "Pit", tier: "DEFAULT" },
      { name: "DRK-1", tier: "DEFAULT" },
    ],
    source: "seed",
  };

  it("requires droids covered AND credits >= threshold", () => {
    const roster: RosterEntry[] = [
      { droidId: "C8", owned: true, active: true, tier: "DEFAULT" },
      { droidId: "Pit", owned: true, active: true, tier: "DEFAULT" },
      { droidId: "DRK-1", owned: true, active: true, tier: "DEFAULT" },
    ];
    expect(standardRebirthReady(rb, roster, "10K")).toBe(true);
    expect(standardRebirthReady(rb, roster, "9K")).toBe(false);
  });
});

describe("scoreRequirements", () => {
  it("scores a fully-covered set as ready=true, score=0, no gaps", () => {
    const result = scoreRequirements(
      [{ name: "Mouse", tier: "DEFAULT" }],
      "10K",
      [mouseDefault],
      "10K",
    );
    expect(result.ready).toBe(true);
    expect(result.score).toBe(0);
    expect(result.gaps).toHaveLength(0);
    expect(result.creditsOnly).toBe(false);
  });

  it("flags creditsOnly when all droids cover but credits fall short", () => {
    const result = scoreRequirements(
      [{ name: "Mouse", tier: "DEFAULT" }],
      "1M",
      [mouseDefault],
      "10K",
    );
    expect(result.ready).toBe(false);
    expect(result.creditsOnly).toBe(true);
    expect(result.gaps).toHaveLength(0);
  });

  it("prefers 'one tier upgrade away' over 'don't own it at all'", () => {
    const ownsLow = scoreRequirements(
      [{ name: "Mouse", tier: "GOLD" }],
      "0",
      [mouseDefault],
      "0",
    );
    const ownsNothing = scoreRequirements(
      [{ name: "Mouse", tier: "GOLD" }],
      "0",
      [],
      "0",
    );
    expect(ownsLow.score).toBeLessThan(ownsNothing.score);
    expect(ownsLow.gaps[0]?.ownedTier).toBe("DEFAULT");
    expect(ownsNothing.gaps[0]?.ownedTier).toBe(null);
  });

  it("scales primary cost by number of missing droids", () => {
    const oneMissing = scoreRequirements(
      [
        { name: "Mouse", tier: "DEFAULT" },
        { name: "Pit", tier: "DEFAULT" },
      ],
      "0",
      [mouseDefault],
      "0",
    );
    const twoMissing = scoreRequirements(
      [
        { name: "Mouse", tier: "DEFAULT" },
        { name: "Pit", tier: "DEFAULT" },
      ],
      "0",
      [],
      "0",
    );
    expect(twoMissing.score).toBeGreaterThan(oneMissing.score + 90);
  });
});
