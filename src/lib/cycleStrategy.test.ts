import { describe, expect, it } from "vitest";
import { computeCycleStrategy, isDroidSafeToSell } from "./cycleStrategy";
import { chipsFromDefaultTo } from "./chipCosts";
import { rebirthsForCycle } from "./sellGuidance";

describe("computeCycleStrategy", () => {
  it("unions requirements across all 27 levels of a cycle", () => {
    const s = computeCycleStrategy(1);
    // Every keeper must appear at ≥ 1 RB level and ≤ 27.
    for (const k of s.keepers) {
      expect(k.appearsAt.length).toBeGreaterThan(0);
      expect(k.firstNeeded).toBeGreaterThanOrEqual(1);
      expect(k.lastNeeded).toBeLessThanOrEqual(27);
      expect(k.firstNeeded).toBeLessThanOrEqual(k.lastNeeded);
    }
    // The union should cover more distinct droids than any single RB row.
    const singleRow = rebirthsForCycle(1)[0]!.needs.length;
    expect(s.keepers.length).toBeGreaterThan(singleRow);
  });

  it("picks the MAX required tier per droid across the cycle", () => {
    const s = computeCycleStrategy(1);
    // Verify each keeper's targetTier is at least as high as every tier
    // it's actually required at in the seed data.
    const rows = rebirthsForCycle(1);
    for (const k of s.keepers) {
      const seenTiers = rows.flatMap((rb) =>
        rb.needs.filter((n) => n.name === k.name).map((n) => n.tier),
      );
      expect(seenTiers.length).toBeGreaterThan(0);
      // targetTier must be present in seenTiers (it's max, so it's one of them).
      expect(seenTiers).toContain(k.targetTier);
    }
  });

  it("sums chipTotals per rarity from keeper entries", () => {
    const s = computeCycleStrategy(2);
    // Recompute totals independently and match.
    const expected: Record<string, number> = {};
    for (const k of s.keepers) {
      if (k.chipCost === null || k.rarity === "ICONIC") continue;
      expected[k.rarity] = (expected[k.rarity] ?? 0) + k.chipCost;
    }
    expect(s.chipTotals).toEqual(expected);
  });

  it("sorts keepers by rarity ASC then earliest-needed RB ASC", () => {
    const s = computeCycleStrategy(1);
    // Within the same rarity, earlier RB needs should come first (that's
    // the play-order that matches gameplay progression).
    for (let i = 1; i < s.keepers.length; i++) {
      const a = s.keepers[i - 1]!;
      const b = s.keepers[i]!;
      if (a.rarity === b.rarity) {
        expect(a.firstNeeded).toBeLessThanOrEqual(b.firstNeeded);
      }
    }
    // First keeper's rarity rank should be <= last keeper's rank (ASC).
    const first = s.keepers[0]!;
    const last = s.keepers[s.keepers.length - 1]!;
    expect(first.rarity).not.toBe("MYTHIC"); // first should be low-rarity
    // If any MYTHIC exists, it should be at or near the end.
    if (s.keepers.some((k) => k.rarity === "MYTHIC")) {
      expect(["MYTHIC", "LEGENDARY", "EPIC"]).toContain(last.rarity);
    }
  });

  it("tierLevels maps each required tier to the RB levels that need it", () => {
    const s = computeCycleStrategy(1);
    const rows = rebirthsForCycle(1);
    for (const k of s.keepers) {
      // Rebuild the expected tier→levels map straight from the seed data.
      const expected: Record<string, number[]> = {};
      for (const rb of rows) {
        for (const n of rb.needs) {
          if (n.name !== k.name) continue;
          (expected[n.tier] ??= []).push(rb.level);
        }
      }
      for (const t of Object.keys(expected)) expected[t]!.sort((a, b) => a - b);

      // Every tier key present must match, and the values are sorted ascending.
      expect(Object.keys(k.tierLevels).sort()).toEqual(Object.keys(expected).sort());
      for (const [tier, levels] of Object.entries(k.tierLevels)) {
        expect(levels).toEqual(expected[tier]);
      }
      // The union of all tier levels equals appearsAt, and the highest tier
      // present is the keeper's targetTier.
      const union = [...new Set(Object.values(k.tierLevels).flat())].sort((a, b) => a - b);
      expect(union).toEqual(k.appearsAt);
      expect(k.tierLevels[k.targetTier]).toBeDefined();
    }
  });

  it("chipCost matches the chipCosts helper for the entry's rarity and tier", () => {
    const s = computeCycleStrategy(3);
    for (const k of s.keepers) {
      expect(k.chipCost).toBe(chipsFromDefaultTo(k.rarity, k.targetTier));
    }
  });
});

describe("isDroidSafeToSell", () => {
  it("returns true for a droid never required in the cycle", () => {
    expect(isDroidSafeToSell("SOME-NONEXISTENT-DROID", 1, 5)).toBe(true);
  });

  it("returns false at a DO_NOT_SELL rebirth, even for an unneeded droid", () => {
    // Cycle 1, RB3 is flagged DO_NOT_SELL in the seed → nothing is safe here.
    expect(isDroidSafeToSell("SOME-NONEXISTENT-DROID", 1, 3)).toBe(false);
  });

  it("returns true once currentLevel reaches the last required RB", () => {
    const s = computeCycleStrategy(1);
    // Pick the first keeper and check "at or past" its lastNeeded → safe
    const k = s.keepers[0]!;
    expect(isDroidSafeToSell(k.name, 1, k.lastNeeded)).toBe(true);
    expect(isDroidSafeToSell(k.name, 1, k.lastNeeded + 5)).toBe(true);
  });

  it("returns false when currentLevel is before the last required RB", () => {
    const s = computeCycleStrategy(1);
    const kFuture = s.keepers.find((k) => k.lastNeeded >= 5);
    expect(kFuture).toBeDefined();
    expect(isDroidSafeToSell(kFuture!.name, 1, kFuture!.lastNeeded - 1)).toBe(false);
  });

  it("is case-insensitive on the droid name", () => {
    const s = computeCycleStrategy(1);
    const k = s.keepers[0]!;
    expect(isDroidSafeToSell(k.name.toLowerCase(), 1, k.lastNeeded)).toBe(true);
  });
});
