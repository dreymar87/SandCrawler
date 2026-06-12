import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../data/version";
import { emptyState, migrate } from "./migrate";

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
    expect(rank.droids).toEqual([
      { name: "Mouse", tier: "DEFAULT" },
      { name: "Pit", tier: "GOLD" },
    ]);
    expect(rank.notes).toBe("from prototype");
  });

  it("upgrades a v1-shaped payload (brief §4) into v2", () => {
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
    expect(state.superRebirths[0]?.ranks[0]?.droids[0]?.tier).toBe("DEFAULT");
    expect(state.superRebirths[0]?.ranks[0]?.gain).toEqual({
      credits: "2K",
      multiplier: "+45%",
      slot: "Worker",
      force: "Push",
    });
    expect(state.roster).toHaveLength(2);
    expect(state.roster[0]).toMatchObject({ droidId: "Mouse", tier: "GOLD", active: true, owned: true });
    expect(state.roster[1]).toMatchObject({ droidId: "Pit", tier: "DEFAULT", active: true, owned: true });
  });

  it("unwraps a current ExportEnvelope", () => {
    const envelope = {
      app: "sandcrawler",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-06-12T00:00:00Z",
      payload: {
        schemaVersion: SCHEMA_VERSION,
        roster: [{ droidId: "Gonk", owned: true, active: true, tier: "GOLD" }],
        customDroids: [],
        superRebirths: [],
        standardOverrides: [],
        ui: { activeTab: "collection", creditsCurrent: "0" },
      },
    };
    const state = migrate(envelope);
    expect(state.roster).toHaveLength(1);
    expect(state.roster[0]?.droidId).toBe("Gonk");
    expect(state.roster[0]?.tier).toBe("GOLD");
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
