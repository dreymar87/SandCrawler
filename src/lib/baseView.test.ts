import { describe, expect, it } from "vitest";
import {
  companionCapacity,
  buildBaseView,
  loungeCapacity,
  loungeRbUnlocksAt,
  maxLoungeCreditSlots,
  nextLoungeUnlock,
  stationUnlockedAt,
} from "./baseView";
import type { CollectionCard, DroidDef, DroidStats } from "../types";

const DICT: DroidDef[] = [
  { canonical: "MOUSE", class: "WORKER", rarity: "COMMON", tiers: ["DEFAULT", "GOLD"] },
  { canonical: "R2", class: "ASTROMECH", rarity: "EPIC", tiers: ["DEFAULT"] },
  { canonical: "2BB", class: "BATTLE", rarity: "RARE", tiers: ["DEFAULT"] },
  { canonical: "PIT", class: "WORKER", rarity: "COMMON", tiers: ["DEFAULT"] },
  { canonical: "ZZZ-FAKE-ICONIC", class: "ASTROMECH", rarity: "ICONIC", tiers: ["DEFAULT"] },
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
): CollectionCard => ({ name, tier, owned, working, lounge, companion: 0 });

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

  it("surfaces the companion slot + its buff (non-ICONIC via class/rarity/tier)", () => {
    const view = base([
      { name: "MOUSE", tier: "DEFAULT", owned: true, working: 0, lounge: 0, companion: 1 },
    ]);
    expect(view.companion.deployed).toBe(1);
    expect(view.companion.droids[0]!.name).toBe("MOUSE");
    // MOUSE is WORKER/COMMON → +20% crafting speed at DEFAULT.
    expect(view.companion.bonus).toBe("+20% crafting speed");
  });

  it("empty companion slot when nothing is marked", () => {
    const view = base([card("MOUSE", "GOLD", 1, 0)]);
    expect(view.companion.deployed).toBe(0);
    expect(view.companion.bonus).toBe(null);
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

  it("lists DEPLOYED droids not needed later this cycle, excludes still-needed ones", () => {
    // "CB" is a real cycle-1 RB1 requirement → NOT safe to sell at RB0.
    // A made-up droid name is never required → safe to sell (when deployed).
    const view = base([
      card("ZZZ-FAKE-DROID", "DEFAULT", 2, 0), // 2 working → deployed
      card("CB", "DEFAULT", 1, 0), // deployed but still needed
    ]);
    const names = view.sellCandidates.map((c) => c.name);
    expect(names).toContain("ZZZ-FAKE-DROID");
    expect(names).not.toContain("CB");
  });

  it("never lists ICONIC droids as safe to sell, even when not required", () => {
    // ZZZ-FAKE-ICONIC is never required in any cycle, so a non-ICONIC droid
    // with the same deployment would be listed. Being ICONIC excludes it.
    const view = base([card("ZZZ-FAKE-ICONIC", "DEFAULT", 2, 0)]);
    expect(view.sellCandidates.map((c) => c.name)).not.toContain("ZZZ-FAKE-ICONIC");
    // Sanity: a non-ICONIC never-required droid IS listed under the same setup.
    const control = base([card("ZZZ-FAKE-DROID", "DEFAULT", 2, 0)]);
    expect(control.sellCandidates.map((c) => c.name)).toContain("ZZZ-FAKE-DROID");
  });

  it("only counts deployed cards — owned-but-not-deployed is not sellable", () => {
    // owned:true but working:0 lounge:0 → occupies no base slot → excluded.
    const view = base([card("ZZZ-FAKE-DROID", "DEFAULT", 0, 0, true)]);
    expect(view.sellCandidates).toHaveLength(0);
  });

  it("counts a lounge-only droid as sellable and reports its copy count", () => {
    const view = base([card("ZZZ-FAKE-DROID", "DEFAULT", 0, 3)]);
    expect(view.sellCandidates).toHaveLength(1);
    expect(view.sellCandidates[0]!.count).toBe(3);
  });

  it("sums sell value across every deployed copy", () => {
    const view = buildBaseView({
      cards: [card("ZZZ-A", "DEFAULT", 2, 1)], // 3 deployed
      dict: DICT,
      stats: { "ZZZ-A": { DEFAULT: { cost: null, income: "1/s", value: "100" } } },
      standardRebirth: 0,
      loungeCreditSlots: 5,
      novaLoungeSlots: 0,
      cycle: 1,
    });
    expect(view.sellCandidates).toHaveLength(1);
    expect(view.sellCandidates[0]!.count).toBe(3);
    expect(view.sellTotal).toBe("300"); // 100 × 3 deployed
  });
});

describe("crafting stations", () => {
  it("stationUnlockedAt: Worker RB0, Astromech RB1, Battle RB2", () => {
    expect(stationUnlockedAt("WORKER", 0)).toBe(true);
    expect(stationUnlockedAt("ASTROMECH", 0)).toBe(false);
    expect(stationUnlockedAt("ASTROMECH", 1)).toBe(true);
    expect(stationUnlockedAt("BATTLE", 1)).toBe(false);
    expect(stationUnlockedAt("BATTLE", 2)).toBe(true);
  });

  it("stations reflect craftingStations input and flag class-match", () => {
    const view = buildBaseView({
      cards: [],
      dict: DICT,
      stats: STATS,
      standardRebirth: 2,
      loungeCreditSlots: 5,
      novaLoungeSlots: 0,
      cycle: 1,
      // MOUSE (WORKER class) placed in the WORKER station → type match
      craftingStations: [{ station: "WORKER", name: "MOUSE", tier: "GOLD", state: "crafting" }],
    });
    expect(view.stations).toHaveLength(3);
    const worker = view.stations.find((s) => s.type === "WORKER")!;
    expect(worker.unlocked).toBe(true);
    expect(worker.slot).toMatchObject({ name: "MOUSE", tier: "GOLD", state: "crafting", typeMatch: true });
    const astro = view.stations.find((s) => s.type === "ASTROMECH")!;
    expect(astro.unlocked).toBe(true);
    expect(astro.slot).toBeNull();
  });

  it("class-mismatch: a WORKER droid in the BATTLE station shows typeMatch=false", () => {
    const view = buildBaseView({
      cards: [],
      dict: DICT,
      stats: STATS,
      standardRebirth: 2,
      loungeCreditSlots: 5,
      novaLoungeSlots: 0,
      cycle: 1,
      craftingStations: [{ station: "BATTLE", name: "MOUSE", tier: "DEFAULT", state: "ready" }],
    });
    const battle = view.stations.find((s) => s.type === "BATTLE")!;
    expect(battle.slot).toMatchObject({ typeMatch: false, state: "ready" });
  });

  it("locked stations still appear in the view with unlocked=false", () => {
    const view = buildBaseView({
      cards: [],
      dict: DICT,
      stats: STATS,
      standardRebirth: 0, // Astromech & Battle locked
      loungeCreditSlots: 5,
      novaLoungeSlots: 0,
      cycle: 1,
    });
    expect(view.stations.find((s) => s.type === "WORKER")!.unlocked).toBe(true);
    expect(view.stations.find((s) => s.type === "ASTROMECH")!.unlocked).toBe(false);
    expect(view.stations.find((s) => s.type === "BATTLE")!.unlocked).toBe(false);
  });
});

describe("upgrade chip station", () => {
  const base = {
    cards: [],
    dict: DICT,
    stats: STATS,
    standardRebirth: 5,
    loungeCreditSlots: 5,
    novaLoungeSlots: 0,
    cycle: 1 as const,
  };

  it("is locked until the Nova upgrade is owned", () => {
    const view = buildBaseView(base);
    expect(view.chipStation).toEqual({
      unlocked: false,
      occupant: null,
      perMin: null,
      perHour: null,
    });
    expect(buildBaseView({ ...base, novaChipStationLevel: 1 }).chipStation.unlocked).toBe(true);
  });

  it("derives chips/hour from the recorded chips/min", () => {
    const view = buildBaseView({
      ...base,
      novaChipStationLevel: 1,
      chipStation: { name: "MOUSE", tier: "GOLD" },
      chipRates: { MOUSE: { GOLD: 24 } },
    });
    expect(view.chipStation.occupant).toMatchObject({ name: "MOUSE", tier: "GOLD", class: "WORKER" });
    expect(view.chipStation.perMin).toBe(24);
    expect(view.chipStation.perHour).toBe(1440);
  });

  it("leaves the rate null when the tier has no recorded rate", () => {
    const view = buildBaseView({
      ...base,
      novaChipStationLevel: 1,
      chipStation: { name: "MOUSE", tier: "GOLD" },
      // A rate for a DIFFERENT tier must not leak into this one.
      chipRates: { MOUSE: { DEFAULT: 12 } },
    });
    expect(view.chipStation.perMin).toBeNull();
    expect(view.chipStation.perHour).toBeNull();
  });

  it("does not consume any squad's working capacity", () => {
    const withOccupant = buildBaseView({
      ...base,
      novaChipStationLevel: 1,
      chipStation: { name: "MOUSE", tier: "GOLD" },
    });
    const worker = withOccupant.squads.find((s) => s.type === "WORKER")!;
    expect(worker.deployed).toBe(0);
  });
});

describe("companion capacity", () => {
  const base = {
    dict: DICT,
    stats: STATS,
    standardRebirth: 5,
    loungeCreditSlots: 5,
    novaLoungeSlots: 0,
    cycle: 1 as const,
  };

  it("is 1 by default and grows with the Nova Shop upgrade", () => {
    expect(companionCapacity(0)).toBe(1);
    expect(companionCapacity(1)).toBe(2);
    // A negative/garbage level can't shrink you below the base slot.
    expect(companionCapacity(-3)).toBe(1);
  });

  it("reports the purchased capacity on the view", () => {
    const cards = [
      { name: "MOUSE", tier: "DEFAULT" as const, owned: true, working: 0, lounge: 0, companion: 1 },
      { name: "R2", tier: "DEFAULT" as const, owned: true, working: 0, lounge: 0, companion: 1 },
    ];
    const view = buildBaseView({ ...base, cards, novaCompanionSlots: 1 });
    expect(view.companion.capacity).toBe(2);
    expect(view.companion.novaSlots).toBe(1);
    expect(view.companion.deployed).toBe(2);
    expect(view.companion.droids).toHaveLength(2);
    // Both companions' buffs are active, not just the first.
    expect(view.companion.bonuses).toHaveLength(2);
  });

  it("two companions are over capacity without the upgrade", () => {
    const cards = [
      { name: "MOUSE", tier: "DEFAULT" as const, owned: true, working: 0, lounge: 0, companion: 1 },
      { name: "R2", tier: "DEFAULT" as const, owned: true, working: 0, lounge: 0, companion: 1 },
    ];
    const view = buildBaseView({ ...base, cards });
    expect(view.companion.capacity).toBe(1);
    expect(view.companion.deployed).toBe(2); // UI flags this as over-capacity
  });
});
