import { describe, expect, it } from "vitest";
import { planNovaPurchases } from "./novaPlan";
import { MEASURED_EFFECTS, trackFor } from "../data/strategyTracks.seed";
import { NOVA_UPGRADES } from "../data/novaShop.seed";
import type { NovaUpgradeState } from "../types";

const plan = (upgrades: NovaUpgradeState[], over: Partial<Parameters<typeof planNovaPurchases>[0]> = {}) =>
  planNovaPurchases({ upgrades, goal: "CRYSTALS_PER_HOUR", ...over });

describe("planNovaPurchases", () => {
  it("puts Daily Crystals first for a fresh player", () => {
    const p = plan([]);
    expect(p.steps[0]).toMatchObject({
      id: "featured.daily-crystals",
      fromLevel: 0,
      toLevel: 1,
      cost: 30,
    });
  });

  it("skips milestones the player already owns outright", () => {
    // Asserts the skipping, not what happens to be next — the track order
    // changes as effects get measured.
    const first = plan([]).steps[0]!.id;
    const p = plan([{ id: first, level: 99 }]);
    expect(p.steps.some((s) => s.id === first)).toBe(false);
    expect(p.steps.length).toBeGreaterThan(0);
  });

  it("groups a milestone's levels into one row priced as a block", () => {
    const p = plan([], { limit: 30 });
    // "Credits through 5" is ONE row covering L0→L5 at 2+6+10+14+18 = 50.
    const credits = p.steps.find((s) => s.id === "core.credits")!;
    expect(credits).toMatchObject({ fromLevel: 0, toLevel: 5, levels: 5, cost: 50 });
  });

  it("starts a partially-owned milestone from the level actually reached", () => {
    // Owning Credits L3 means the "through 5" block is just L3→L5 (14+18).
    const p = plan([{ id: "core.credits", level: 3 }], { limit: 30 });
    const credits = p.steps.find((s) => s.id === "core.credits")!;
    expect(credits).toMatchObject({ fromLevel: 3, toLevel: 5, levels: 2, cost: 32 });
  });

  it("keeps a running total that never decreases", () => {
    const p = plan([], { limit: 30 });
    for (let i = 1; i < p.steps.length; i++) {
      expect(p.steps[i]!.cumulative).toBeGreaterThanOrEqual(p.steps[i - 1]!.cumulative);
    }
  });

  it("does not re-buy levels when a track names an upgrade twice", () => {
    // The track has Credits "through 5", then "through 10", then "through 25".
    const p = plan([], { limit: 60 });
    const blocks = p.steps.filter((s) => s.id === "core.credits");
    expect(blocks.length).toBeGreaterThan(1);
    for (let i = 1; i < blocks.length; i++) {
      // Each block starts exactly where the previous one ended — no overlap.
      expect(blocks[i]!.fromLevel).toBe(blocks[i - 1]!.toLevel);
    }
  });

  it("marks affordability against the balance and stops counting after it runs out", () => {
    // Budget derived from the plan itself so it survives track reordering:
    // exactly enough for the first two steps and not the third.
    const full = plan([], { limit: 5 });
    const budget = full.steps[1]!.cumulative;
    const p = plan([], { balance: budget, limit: 5 });
    expect(p.steps[0]!.affordable).toBe(true);
    expect(p.steps[1]!.affordable).toBe(true);
    expect(p.steps[2]!.affordable).toBe(false);
    expect(p.affordableCount).toBe(2);
  });

  it("never proposes an upgrade the track explicitly skips", () => {
    const skipped = new Set(trackFor("CRYSTALS_PER_HOUR").skip.map((s) => s.id));
    const p = plan([], { limit: 100 });
    for (const s of p.steps) expect(skipped.has(s.id)).toBe(false);
    // ...and the crit ladders are named in the skip list with a reason.
    expect(p.skip.map((s) => s.id)).toContain("featured.critical-chance");
    expect(p.skip.every((s) => s.why.length > 0)).toBe(true);
  });

  it("respects the limit and never exceeds an upgrade's real level cap", () => {
    expect(plan([], { limit: 3 }).steps).toHaveLength(3);
    const byId = new Map(NOVA_UPGRADES.map((u) => [u.id, u]));
    for (const s of plan([], { limit: 100 }).steps) {
      expect(s.toLevel).toBeLessThanOrEqual(byId.get(s.id)!.costs.length);
      expect(s.levels).toBeGreaterThan(0);
    }
  });

  it("returns an empty plan once everything on the track is owned", () => {
    const maxed: NovaUpgradeState[] = NOVA_UPGRADES.map((u) => ({ id: u.id, level: u.costs.length }));
    expect(plan(maxed, { limit: 100 }).steps).toHaveLength(0);
  });

  it("the raw-credits track leads with the Credits ladder instead", () => {
    const p = plan([], { goal: "CREDIT_THROUGHPUT" });
    expect(p.steps[0]!.id).toBe("core.credits");
  });

  // Scrap Value pays in seconds of your own credit generation, so for an
  // actively-swinging player it's a large share of total income.
  it("recommends Scrap Value rather than skipping it", () => {
    for (const goal of ["CRYSTALS_PER_HOUR", "CREDIT_THROUGHPUT"] as const) {
      const p = plan([], { goal, limit: 100 });
      expect(p.steps.some((s) => s.id === "workshop.scrap-value")).toBe(true);
      expect(p.skip.some((s) => s.id === "workshop.scrap-value")).toBe(false);
    }
  });

  it("attaches a measured effect to exactly the upgrades that have one", () => {
    const p = plan([], { limit: 100 });
    const measured = new Set(MEASURED_EFFECTS.map((e) => e.id));
    expect(measured.size).toBeGreaterThan(1);
    for (const s of p.steps) {
      if (measured.has(s.id)) expect(s.knownEffect, s.id).toBeTruthy();
      else expect(s.knownEffect, s.id).toBeUndefined();
    }
    // Spot-check that the curve, not just a flag, comes through.
    expect(p.steps.find((s) => s.id === "core.credits")!.knownEffect).toMatch(/20%/);
    expect(p.steps.find((s) => s.id === "workshop.scrap-value")!.knownEffect).toMatch(
      /seconds of base credit/,
    );
  });

  // Back to arithmetic: with Scrap Value denominated in credits/s again, the
  // computed ranking in lib/upgradeValue puts Credits L1-5 ahead of Scrap L1,
  // which is ahead of Credits L6+. The track order must not contradict it.
  it("orders the measured upgrades to match the computed ranking", () => {
    const p = plan([], { limit: 100 });
    const idx = (id: string, toLevel: number) =>
      p.steps.findIndex((s) => s.id === id && s.toLevel === toLevel);
    expect(idx("core.credits", 5)).toBeLessThan(idx("workshop.scrap-value", 1));
    expect(idx("workshop.scrap-value", 1)).toBeLessThan(idx("core.credits", 11));
    expect(idx("core.credits", 11)).toBeLessThan(idx("workshop.scrap-value", 2));
  });
});

describe("strategy tracks", () => {
  it("every referenced upgrade id exists in the Nova seed", () => {
    const ids = new Set(NOVA_UPGRADES.map((u) => u.id));
    for (const goal of ["CRYSTALS_PER_HOUR", "CREDIT_THROUGHPUT"] as const) {
      const t = trackFor(goal);
      for (const s of t.steps) expect(ids, `${goal} step ${s.id}`).toContain(s.id);
      for (const s of t.skip) expect(ids, `${goal} skip ${s.id}`).toContain(s.id);
    }
  });

  it("no upgrade is both recommended and skipped in the same track", () => {
    for (const goal of ["CRYSTALS_PER_HOUR", "CREDIT_THROUGHPUT"] as const) {
      const t = trackFor(goal);
      const skip = new Set(t.skip.map((s) => s.id));
      for (const s of t.steps) expect(skip.has(s.id), `${goal}: ${s.id}`).toBe(false);
    }
  });

  it("track milestones for the same upgrade are in ascending level order", () => {
    for (const goal of ["CRYSTALS_PER_HOUR", "CREDIT_THROUGHPUT"] as const) {
      const seen = new Map<string, number>();
      for (const s of trackFor(goal).steps) {
        const prev = seen.get(s.id);
        if (prev !== undefined) expect(s.throughLevel).toBeGreaterThan(prev);
        seen.set(s.id, s.throughLevel);
      }
    }
  });
});
