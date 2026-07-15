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
    // v1 "status: Working" → v7 working: 1; "status: Lounge" → lounge: 1.
    expect(state.cards[0]).toMatchObject({ name: "MOUSE", tier: "GOLD", working: 1, lounge: 0 });
    expect(state.cards[1]).toMatchObject({ name: "PIT", tier: "DEFAULT", working: 0, lounge: 1 });
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
    // v2 `active: true` → v7 `working: 1`; `active: false` retains owned only.
    expect(state.cards[0]).toMatchObject({ name: "MOUSE", tier: "GOLD", owned: true, working: 1, lounge: 0 });
    expect(state.cards[1]).toMatchObject({ name: "PIT", tier: "DEFAULT", owned: true, working: 0, lounge: 0 });
    // v6: ui.creditsCurrent lifted into profile.currentCredits.
    expect(state.profile.currentCredits).toBe("1K");
    // Old "collection" tab key remaps to "droidex".
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

  it("v5 → v6: remaps tabs and lifts ui.creditsCurrent → profile.currentCredits", () => {
    const v5 = {
      schemaVersion: 5,
      cards: [],
      profile: {
        standardRebirth: 12,
        superRebirthCount: 1,
        cycleOverride: null,
        novaEarned: 40,
        novaSpent: 0,
      },
      customDroids: [],
      standardOverrides: [],
      cosmetics: [],
      novaUpgrades: [],
      novaIconicOwned: [],
      ui: { activeTab: "nova", creditsCurrent: "3.4B" },
    };
    const state = migrate(v5);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    // "nova" and "cosmetics" collapse into "shop"; "data"/"next-unlock" too.
    expect(state.ui.activeTab).toBe("shop");
    expect(migrate({ ...v5, ui: { activeTab: "cosmetics" } }).ui.activeTab).toBe("shop");
    expect(migrate({ ...v5, ui: { activeTab: "next-unlock" } }).ui.activeTab).toBe("rebirths");
    expect(migrate({ ...v5, ui: { activeTab: "data" } }).ui.activeTab).toBe("profile");
    // credits lifted off ui onto the profile.
    expect(state.profile.currentCredits).toBe("3.4B");
    expect((state.ui as unknown as Record<string, unknown>).creditsCurrent).toBeUndefined();
  });

  it("dedupes cards with the same (name, tier)", () => {
    const dup = {
      cards: [
        { name: "MOUSE", tier: "GOLD", owned: true, working: 0, lounge: 0 },
        { name: "MOUSE", tier: "GOLD", owned: false, working: 3, lounge: 0 },
      ],
    };
    const state = migrate(dup);
    expect(state.cards).toHaveLength(1);
    expect(state.cards[0]).toMatchObject({ name: "MOUSE", tier: "GOLD", owned: true, working: 3, lounge: 0 });
  });

  it("v6 → v7: legacy `active: true` becomes `working: 1`", () => {
    const v6 = {
      schemaVersion: 6,
      cards: [
        { name: "MOUSE", tier: "GOLD", owned: true, active: true },
        { name: "PIT", tier: "DEFAULT", owned: true, active: false },
      ],
    };
    const state = migrate(v6);
    expect(state.cards[0]).toMatchObject({ owned: true, working: 1, lounge: 0 });
    expect(state.cards[1]).toMatchObject({ owned: true, working: 0, lounge: 0 });
  });

  it("v7 cards with explicit counts preserve them", () => {
    const v7 = {
      schemaVersion: 7,
      cards: [{ name: "MOUSE", tier: "GOLD", owned: true, working: 5, lounge: 2 }],
    };
    const state = migrate(v7);
    expect(state.cards[0]).toMatchObject({ working: 5, lounge: 2 });
  });

  it("v7 → v8: remaps the Home tab to Base and defaults loungeCreditSlots", () => {
    const v7 = {
      schemaVersion: 7,
      cards: [],
      profile: { standardRebirth: 3, superRebirthCount: 1 },
      ui: { activeTab: "home" },
    };
    const state = migrate(v7);
    expect(state.ui.activeTab).toBe("base");
    // Pre-v8 payloads get the base 5 credit lounge slots by default.
    expect(state.profile.loungeCreditSlots).toBe(5);
  });

  it("legacy droid name BU-4D resolves to canonical B-U4D via aliases", () => {
    const legacy = {
      schemaVersion: 6,
      cards: [{ name: "BU-4D", tier: "GOLD", owned: true, active: true }],
    };
    const state = migrate(legacy);
    expect(state.cards[0]?.name).toBe("B-U4D");
  });

  it("unwraps a current ExportEnvelope and preserves cosmetics + nova upgrades + ICONIC purchases", () => {
    const envelope = {
      app: "sandcrawler",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: "2026-06-17T00:00:00Z",
      payload: {
        schemaVersion: SCHEMA_VERSION,
        cards: [{ name: "GONK", tier: "GOLD", owned: true, working: 1, lounge: 0 }],
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
