import { describe, expect, it } from "vitest";
import type { CollectionCard, StandardRebirth } from "../types";
import {
  activeCards,
  bestOwnedTier,
  rosterCovers,
  scoreRequirements,
  standardRebirthReady,
} from "./readiness";

const mouseDefault: CollectionCard = { name: "MOUSE", tier: "DEFAULT", owned: true, active: true };
const mouseGold: CollectionCard = { name: "MOUSE", tier: "GOLD", owned: true, active: true };
const mouseInactive: CollectionCard = { name: "MOUSE", tier: "BESKAR", owned: true, active: false };
describe("activeCards", () => {
  it("filters to active cards only", () => {
    expect(activeCards([mouseDefault, mouseInactive])).toEqual([mouseDefault]);
  });
});

describe("rosterCovers", () => {
  it("matches by normalized name and tier substitution", () => {
    expect(rosterCovers({ name: "MOUSE", tier: "DEFAULT" }, [mouseGold])).toBe(true);
    expect(rosterCovers({ name: "mouse", tier: "DEFAULT" }, [mouseDefault])).toBe(true);
    // Punctuation differences alone don't break the match (alias logic for
    // WLKR<->Walker lives in the droid dictionary, not here).
    expect(rosterCovers({ name: "MONO-WLKR", tier: "DEFAULT" }, [
      { name: "Mono Wlkr", tier: "DEFAULT", owned: true, active: true },
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

describe("standardRebirthReady", () => {
  const rb: StandardRebirth = {
    level: 1,
    cycle: 1,
    credits: "10K",
    needs: [
      { name: "CB", tier: "DEFAULT" },
      { name: "PIT", tier: "DEFAULT" },
      { name: "DRK-1 PROBE", tier: "DEFAULT" },
    ],
    sellList: [],
    slotUnlock: null,
    source: "seed",
  };

  it("requires droids covered AND credits >= threshold", () => {
    const cards: CollectionCard[] = [
      { name: "CB", tier: "DEFAULT", owned: true, active: true },
      { name: "PIT", tier: "DEFAULT", owned: true, active: true },
      { name: "DRK-1 PROBE", tier: "DEFAULT", owned: true, active: true },
    ];
    expect(standardRebirthReady(rb, cards, "10K")).toBe(true);
    expect(standardRebirthReady(rb, cards, "9K")).toBe(false);
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
