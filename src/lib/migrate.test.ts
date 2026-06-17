import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../data/version";
import { defaultProfile, emptyState, migrate } from "./migrate";

describe("migrate", () => {
  it("returns an empty state for unknown / nullish input", () => {
    expect(migrate(null)).toEqual(emptyState());
    expect(migrate(undefined)).toEqual(emptyState());
    expect(migrate("nonsense")).toEqual(emptyState());
  });

  it("lifts a v0 prototype flat-array (the manual SR slice is discarded in v4)", () => {
    // v0 rebirth-rank shape is no longer rendered, but the migration must still
    // succeed without throwing. Cards / cosmetics / nova remain empty.
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
    expect(state.cards).toEqual([]);
    expect(state.cosmetics).toEqual([]);
    expect(state.novaUpgrades).toEqual([]);
    expect(state.profile).toEqual(defaultProfile());
  });

  it("upgrades a v1-shaped payload into v4 cards (drops the SR slice)", () => {
    const v1 = {
      superRebirths: [
        { id: "g1", level: "2", ranks: [{ rank: "1", droids: [{ name: "Mouse", tier: "Default" }] }] },
      ],
      roster: [
        { id: "d1", name: "Mouse", tier: "Gold", status: "Working" },
        { id: "d2", name: "Pit", tier: "Default", status: "Lounge" },
      ],
    };
    const state = migrate(v1);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.cards).toHaveLength(2);
    expect(state.cards[0]).toMatchObject({ name: "MOUSE", tier: "GOLD", active: true });
    expect(state.cards[1]).toMatchObject({ name: "PIT", tier: "DEFAULT", active: true });
    expect(state.profile).toEqual(defaultProfile());
  });

  it("upgrades Pass-1 (v2) export into v4 cards", () => {
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
    expect(state.cards).toHaveLength(2);
    expect(state.cards[0]).toMatchObject({ name: "MOUSE", tier: "GOLD", owned: true, active: true });
    expect(state.ui.creditsCurrent).toBe("1K");
    // Old "collection" tab key remaps to "droidex" — it doesn't exist in v4.
    expect(state.ui.activeTab).toBe("droidex");
  });

  it("upgrades v3 cards into v4 (handles legacy superRebirth.level → count)", () => {
    const v3 = {
      schemaVersion: 3,
      cards: [{ name: "GONK", tier: "GOLD", owned: true, active: true }],
      profile: { standardRebirth: 5, superRebirth: { level: "2", rank: "1" } },
      customDroids: [{ canonical: "FAKE", class: "WORKER", rarity: "MYTHIC", tiers: ["DEFAULT"] }],
      superRebirths: [],
      standardOverrides: [],
      ui: { activeTab: "super", creditsCurrent: "0" },
    };
    const state = migrate(v3);
    expect(state.profile.standardRebirth).toBe(5);
    expect(state.profile.superRebirthCount).toBe(2);
    expect(state.profile.cycleOverride).toBe(null);
    // MYTHIC → ICONIC rename in customDroids.
    expect(state.customDroids[0]!.rarity).toBe("ICONIC");
    // Old "super" tab remaps to "rebirths".
    expect(state.ui.activeTab).toBe("rebirths");
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

  it("unwraps a current ExportEnvelope and preserves cosmetics + nova upgrades + ICONIC purchases", () => {
    const envelope = {
      app: "sandcrawler",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-06-17T00:00:00Z",
      payload: {
        schemaVersion: SCHEMA_VERSION,
        cards: [{ name: "GONK", tier: "GOLD", owned: true, active: true }],
        profile: {
          standardRebirth: 5,
          superRebirthCount: 3,
          cycleOverride: 2,
          novaEarned: 100,
          novaSpent: 30,
        },
        customDroids: [],
        standardOverrides: [],
        cosmetics: [{ id: "paint-blue-paint", owned: true }],
        novaUpgrades: [{ id: "core.credits", level: 2 }],
        novaIconicOwned: ["BB8", "CB-23"],
        ui: { activeTab: "droidex", creditsCurrent: "0" },
      },
    };
    const state = migrate(envelope);
    expect(state.cards).toHaveLength(1);
    expect(state.profile.superRebirthCount).toBe(3);
    expect(state.novaIconicOwned).toEqual(["BB8", "CB-23"]);
    expect(state.profile.cycleOverride).toBe(2);
    expect(state.profile.novaEarned).toBe(100);
    expect(state.cosmetics).toEqual([{ id: "paint-blue-paint", owned: true }]);
    expect(state.novaUpgrades).toEqual([{ id: "core.credits", level: 2 }]);
  });

  it("v4 → v5: lifts standardOverrides[].rewards.slotUnlock to top level", () => {
    const v4 = {
      schemaVersion: 4,
      standardOverrides: [
        {
          level: 5,
          cycle: 1,
          credits: "5.35M",
          needs: [],
          sellList: [],
          // v4 shape: slotUnlock was nested under `rewards`.
          rewards: { novaCrystals: 0, creditMult: 0, xpMult: 0, slotUnlock: "ASTROMECH" },
        },
      ],
    };
    const state = migrate(v4);
    const row = state.standardOverrides[0]!;
    expect(row.slotUnlock).toBe("ASTROMECH");
    expect((row as unknown as { rewards?: unknown }).rewards).toBeUndefined();
  });

  it("bootstraps novaIconicOwned to [] for older payloads that lack it", () => {
    const v4 = { schemaVersion: 4 };
    expect(migrate(v4).novaIconicOwned).toEqual([]);
  });
});
