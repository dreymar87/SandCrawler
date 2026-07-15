import { describe, expect, it } from "vitest";
import {
  buildBaseView,
  loungeCapacity,
  loungeRbUnlocksAt,
  maxLoungeCreditSlots,
  nextLoungeUnlock,
} from "./baseView";
import type { CollectionCard, DroidDef, DroidStats } from "../types";

const DICT: DroidDef[] = [
  { canonical: "MOUSE", class: "WORKER", rarity: "COMMON", tiers: ["DEFAULT", "GOLD"] },
  { canonical: "R2", class: "ASTROMECH", rarity: "EPIC", tiers: ["DEFAULT"] },
  { canonical: "2BB", class: "BATTLE", rarity: "RARE", tiers: ["DEFAULT"] },
  { canonical: "PIT", class: "WORKER", rarity: "COMMON", tiers: ["DEFAULT"] },
];

const STATS: DroidStats = {
  MOUSE: { GOLD: { cost: null, income: "4/s", value: "2.66k" } },
  PIT: { DEFAULT: { cost: null, income: "2/s", value: "665" } },
};

const card = (
  name: string,
  tier: CollectionCard["tier"],
  working: number,
  lounge: number,
  owned = true,
): CollectionCard => ({ name, tier, owned, working, lounge });

describe("lounge capacity helpers", () => {
  it("counts RB unlocks at 17 and 18", () => {
    expect(loungeRbUnlocksAt(16)).toBe(0);
    expect(loungeRbUnlocksAt(17)).toBe(1);
    expect(loungeRbUnlocksAt(18)).toBe(2);
    expect(loungeRbUnlocksAt(27)).toBe(2);
  });

  it("max credit slots = 5 base + RB unlocks", () => {
    expect(maxLoungeCreditSlots(0)).toBe(5);
    expect(maxLoungeCreditSlots(17)).toBe(6);
    expect(maxLoungeCreditSlots(18)).toBe(7);
  });

  it("total capacity adds credit + nova slots", () => {
    expect(loungeCapacity(5, 2)).toBe(7);
    expect(loungeCapacity(0, 0)).toBe(0);
  });

  it("nextLoungeUnlock points at the next threshold", () => {
    expect(nextLoungeUnlock(0)).toBe(17);
    expect(nextLoungeUnlock(17)).toBe(18);
    expect(nextLoungeUnlock(18)).toBe(null);
  });
});

describe("buildBaseView", () => {
  const base = (cards: CollectionCard[], overrides = {}) =>
    buildBaseView({
      cards,
      dict: DICT,
      stats: STATS,
      standardRebirth: 0,
      loungeCreditSlots: 5,
      novaLoungeSlots: 0,
      cycle: 1,
      ...overrides,
    });

  it("sums working counts into the droid's class squad", () => {
    const view = base([
      card("MOUSE", "GOLD", 3, 0),
      card("PIT", "DEFAULT", 2, 0),
      card("R2", "DEFAULT", 1, 0),
      card("2BB", "DEFAULT", 1, 0),
    ]);
    const worker = view.squads.find((s) => s.type === "WORKER")!;
    const astro = view.squads.find((s) => s.type === "ASTROMECH")!;
    const battle = view.squads.find((s) => s.type === "BATTLE")!;
    expect(worker.deployed).toBe(5); // 3 MOUSE + 2 PIT
    expect(worker.droids).toHaveLength(2);
    expect(astro.deployed).toBe(1);
    expect(battle.deployed).toBe(1);
  });

  it("sums lounge counts across all classes into the Lounge", () => {
    const view = base(
      [card("MOUSE", "GOLD", 0, 4), card("R2", "DEFAULT", 0, 2)],
      { loungeCreditSlots: 5, novaLoungeSlots: 2 },
    );
    expect(view.lounge.deployed).toBe(6);
    expect(view.lounge.capacity).toBe(7); // 5 credit + 2 nova
    expect(view.lounge.droids).toHaveLength(2);
  });

  it("lists owned droids not needed later this cycle, excludes still-needed ones", () => {
    // "CB" is a real cycle-1 RB1 requirement → NOT safe to sell at RB0.
    // A made-up droid name is never required → safe to sell.
    const view = base([
      card("ZZZ-FAKE-DROID", "DEFAULT", 0, 0),
      card("CB", "DEFAULT", 0, 0),
    ]);
    const names = view.sellCandidates.map((c) => c.name);
    expect(names).toContain("ZZZ-FAKE-DROID");
    expect(names).not.toContain("CB");
  });

  it("sums sell-candidate values from the stats table", () => {
    // PIT/MOUSE values exist in STATS; both must be unneeded for the sum.
    // Use made-up names mapped to real stats via the STATS table override.
    const view = buildBaseView({
      cards: [card("ZZZ-A", "DEFAULT", 0, 0), card("ZZZ-B", "DEFAULT", 0, 0)],
      dict: DICT,
      stats: { "ZZZ-A": { DEFAULT: { cost: null, income: "1/s", value: "665" } } },
      standardRebirth: 0,
      loungeCreditSlots: 5,
      novaLoungeSlots: 0,
      cycle: 1,
    });
    expect(view.sellCandidates).toHaveLength(2);
    expect(view.sellTotal).not.toBe("0"); // 665 from ZZZ-A
  });

  it("excludes unowned cards from sell candidates", () => {
    const view = base([card("ZZZ-FAKE-DROID", "DEFAULT", 0, 0, false)]);
    expect(view.sellCandidates).toHaveLength(0);
  });
});
