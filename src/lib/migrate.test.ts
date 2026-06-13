import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../data/version";
import { defaultProfile, emptyState, migrate } from "./migrate";

describe("migrate", () => {
  it("returns an empty state for unknown / nullish input", () => {
    expect(migrate(null)).toEqual(emptyState());
    expect(migrate(undefined)).toEqual(emptyState());
    expect(migrate("nonsense")).toEqual(emptyState());
  });

  it("lifts a v0 prototype flat-array into Super Rebirth 1", () => {
    const v0 = [
      {
        credits: "10K",
        creditsReady: true,
        droids: [
          { name: "Mouse", tier: "Default" },
          { name: "Pit", tier: "Gold" },
        ],
        notes: "from prototype",
      },
    ];
    const state = migrate(v0);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.superRebirths).toHaveLength(1);
    const grp = state.superRebirths[0]!;
    expect(grp.level).toBe("1");
    expect(grp.ranks).toHaveLength(1);
    const rank = grp.ranks[0]!;
    expect(rank.rank).toBe("1");
    expect(rank.credits).toBe("10K");
    // Names resolve via the dict, tiers uppercase.
    expect(rank.droids).toEqual([
      { name: "MOUSE", tier: "DEFAULT" },
      { name: "PIT", tier: "GOLD" },
    ]);
    expect(rank.notes).toBe("from prototype");
  });

  it("upgrades a v1-shaped payload (brief §4) into v3", () => {
    const v1 = {
      superRebirths: [
        {
          id: "g1",
          level: "2",
          ranks: [
            {
              id: "r1",
              rank: "1",
              credits: "10.00K",
              creditsReady: false,
              droids: [
                { name: "Mouse", tier: "Default" },
                { name: "Pit", tier: "Default" },
                { name: "Gonk", tier: "Default" },
              ],
              gain: { credits: "2K", multiplier: "+45%", slot: "Worker", force: "Push" },
              notes: "",
            },
          ],
        },
      ],
      roster: [
        { id: "d1", name: "Mouse", tier: "Gold", status: "Working" },
        { id: "d2", name: "Pit", tier: "Default", status: "Lounge" },
      ],
    };
    const state = migrate(v1);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    // Droid req tiers uppercased + names resolved to canonical.
    expect(state.superRebirths[0]?.ranks[0]?.droids[0]).toEqual({ name: "MOUSE", tier: "DEFAULT" });
    expect(state.superRebirths[0]?.ranks[0]?.gain).toEqual({
      credits: "2K",
      multiplier: "+45%",
      slot: "Worker",
      force: "Push",
    });
    // Roster collapsed into cards with canonical names + active=true.
    expect(state.cards).toHaveLength(2);
    expect(state.cards[0]).toMatchObject({ name: "MOUSE", tier: "GOLD", active: true, owned: true });
    expect(state.cards[1]).toMatchObject({ name: "PIT", tier: "DEFAULT", active: true, owned: true });
    // Profile bootstrapped to defaults.
    expect(state.profile).toEqual(defaultProfile());
  });

  it("upgrades Pass-1 (v2) export into v3 cards", () => {
    const v2 = {
      schemaVersion: 2,
      roster: [
        { droidId: "Mouse", tier: "GOLD", owned: true, active: true },
        { droidId: "Pit", tier: "DEFAULT", owned: true, active: false },
      ],
      customDroids: [],
      superRebirths: [],
      standardOverrides: [],
      ui: { activeTab: "collection", creditsCurrent: "1K" },
    };
    const state = migrate(v2);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.cards).toEqual([
      { name: "MOUSE", tier: "GOLD", owned: true, active: true, notes: undefined },
      { name: "PIT", tier: "DEFAULT", owned: true, active: false, notes: undefined },
    ]);
    expect(state.ui.creditsCurrent).toBe("1K");
  });

  it("dedupes cards with the same (name, tier)", () => {
    const dup = {
      cards: [
        { name: "MOUSE", tier: "GOLD", owned: true, active: false },
        { name: "MOUSE", tier: "GOLD", owned: false, active: true },
      ],
    };
    const state = migrate(dup);
    expect(state.cards).toHaveLength(1);
    expect(state.cards[0]).toMatchObject({ name: "MOUSE", tier: "GOLD", owned: true, active: true });
  });

  it("unwraps a current ExportEnvelope", () => {
    const envelope = {
      app: "sandcrawler",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-06-12T00:00:00Z",
      payload: {
        schemaVersion: SCHEMA_VERSION,
        cards: [{ name: "GONK", tier: "GOLD", owned: true, active: true }],
        profile: { standardRebirth: 5, superRebirth: { level: "2", rank: "1" } },
        customDroids: [],
        superRebirths: [],
        standardOverrides: [],
        ui: { activeTab: "droidex", creditsCurrent: "0" },
      },
    };
    const state = migrate(envelope);
    expect(state.cards).toHaveLength(1);
    expect(state.cards[0]?.name).toBe("GONK");
    expect(state.profile.standardRebirth).toBe(5);
    expect(state.profile.superRebirth).toEqual({ level: "2", rank: "1" });
  });

  it("re-normalises a v1 'Basic' tier label into DEFAULT", () => {
    const state = migrate({
      superRebirths: [
        { level: "1", ranks: [{ rank: "1", droids: [{ name: "X", tier: "Basic" }] }] },
      ],
    });
    expect(state.superRebirths[0]?.ranks[0]?.droids[0]?.tier).toBe("DEFAULT");
  });
});
