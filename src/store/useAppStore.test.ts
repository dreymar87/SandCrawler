import { describe, expect, it, beforeEach, vi } from "vitest";

// idb-keyval touches globalThis.indexedDB, which isn't in jsdom.
// Swap it for an in-memory Map so the persist middleware can flush
// writes without exploding. Must be declared before the store import.
const mem = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  createStore: () => "store",
  get: async (key: string) => mem.get(key),
  set: async (key: string, value: unknown) => void mem.set(key, value),
  del: async (key: string) => void mem.delete(key),
  clear: async () => void mem.clear(),
  keys: async () => [...mem.keys()],
}));

import { useAppStore } from "./useAppStore";
import type { CollectionCard } from "../types";

/**
 * Reset the store to a clean state between tests so each case is
 * independent. We call the internal setState directly rather than
 * relying on `resetAll()` — that keeps the tests hermetic even if
 * `resetAll` itself changes shape later.
 */
function seedState(patch: Partial<{
  cards: CollectionCard[];
  standardRebirth: number;
  superRebirthCount: number;
  novaEarned: number;
  upgradeChips: number;
  currentCredits: string;
}> = {}) {
  const cur = useAppStore.getState();
  useAppStore.setState({
    cards: patch.cards ?? [],
    profile: {
      ...cur.profile,
      standardRebirth: patch.standardRebirth ?? 0,
      superRebirthCount: patch.superRebirthCount ?? 0,
      novaEarned: patch.novaEarned ?? 0,
      upgradeChips: patch.upgradeChips,
      currentCredits: patch.currentCredits ?? "",
    },
  });
}

describe("performSuperRebirth", () => {
  beforeEach(() => useAppStore.getState().resetAll());

  it("awards SRB crystals from the RB level's bonus row (RB15 → +29)", () => {
    seedState({ standardRebirth: 15, novaEarned: 100 });
    const result = useAppStore.getState().performSuperRebirth();
    expect(result.crystalsAwarded).toBe(29);
    expect(useAppStore.getState().profile.novaEarned).toBe(129);
  });

  it("awards 0 crystals below RB12 (no bonus row)", () => {
    seedState({ standardRebirth: 5, novaEarned: 40 });
    const result = useAppStore.getState().performSuperRebirth();
    expect(result.crystalsAwarded).toBe(0);
    expect(useAppStore.getState().profile.novaEarned).toBe(40);
  });

  it("zeros working+lounge on every card but preserves owned", () => {
    seedState({
      standardRebirth: 15,
      cards: [
        { name: "MOUSE", tier: "GOLD", owned: true, working: 3, lounge: 0, companion: 0 },
        { name: "PIT", tier: "DEFAULT", owned: true, working: 0, lounge: 2, companion: 0 },
        { name: "GONK", tier: "BESKAR", owned: true, working: 0, lounge: 0, companion: 0 },
      ],
    });
    useAppStore.getState().performSuperRebirth();
    const cards = useAppStore.getState().cards;
    expect(cards).toHaveLength(3);
    for (const c of cards) {
      expect(c.owned).toBe(true);
      expect(c.working).toBe(0);
      expect(c.lounge).toBe(0);
    }
  });

  it("drops unowned-and-empty cards to keep sparse-storage invariant", () => {
    // A card with owned=false + counts > 0 gets zeroed → owned still false,
    // counts 0 → sparse-drop.
    seedState({
      standardRebirth: 12,
      cards: [{ name: "MOUSE", tier: "DEFAULT", owned: false, working: 2, lounge: 0, companion: 0 }],
    });
    useAppStore.getState().performSuperRebirth();
    expect(useAppStore.getState().cards).toHaveLength(0);
  });

  it("resets RB to 0, increments SRB count, clears credits and chips", () => {
    seedState({
      standardRebirth: 20,
      superRebirthCount: 3,
      currentCredits: "50T",
      upgradeChips: 4200,
    });
    const result = useAppStore.getState().performSuperRebirth();
    const p = useAppStore.getState().profile;
    expect(p.standardRebirth).toBe(0);
    expect(p.superRebirthCount).toBe(4);
    expect(result.newSrbCount).toBe(4);
    expect(p.currentCredits).toBe("");
    expect(p.upgradeChips).toBe(0);
  });

  it("resets credit-bought lounge slots to 0 (nova slots persist elsewhere)", () => {
    useAppStore.getState().setLoungeCreditSlots(7);
    expect(useAppStore.getState().profile.loungeCreditSlots).toBe(7);
    useAppStore.getState().performSuperRebirth();
    expect(useAppStore.getState().profile.loungeCreditSlots).toBe(0);
  });
});

describe("deployed-droid actions", () => {
  beforeEach(() => useAppStore.getState().resetAll());

  const find = (name: string, tier: CollectionCard["tier"]) =>
    useAppStore.getState().cards.find((c) => c.name === name && c.tier === tier);

  it("moveDeployed shifts exactly one copy between slots, same tier", () => {
    seedState({
      cards: [{ name: "MOUSE", tier: "GOLD", owned: true, working: 3, lounge: 0, companion: 0 }],
    });
    useAppStore.getState().moveDeployed("MOUSE", "GOLD", "working", "lounge");
    const c = find("MOUSE", "GOLD")!;
    expect(c.working).toBe(2);
    expect(c.lounge).toBe(1);
  });

  it("moveDeployed is a no-op when the source slot is empty", () => {
    seedState({
      cards: [{ name: "MOUSE", tier: "GOLD", owned: true, working: 0, lounge: 1, companion: 0 }],
    });
    useAppStore.getState().moveDeployed("MOUSE", "GOLD", "working", "lounge");
    const c = find("MOUSE", "GOLD")!;
    expect(c.working).toBe(0);
    expect(c.lounge).toBe(1);
  });

  it("removeDeployed decrements one copy from a slot, card stays owned", () => {
    seedState({
      cards: [{ name: "MOUSE", tier: "GOLD", owned: true, working: 2, lounge: 0, companion: 0 }],
    });
    useAppStore.getState().removeDeployed("MOUSE", "GOLD", "working");
    const c = find("MOUSE", "GOLD")!;
    expect(c.working).toBe(1);
    expect(c.owned).toBe(true);
  });

  it("upgradeDeployed moves ONE copy up a tier and back into a chosen slot", () => {
    seedState({
      cards: [{ name: "MOUSE", tier: "GOLD", owned: true, working: 2, lounge: 0, companion: 0 }],
    });
    // Redeploy back into Working: GOLD working -1, DIAMOND working +1.
    useAppStore.getState().upgradeDeployed("MOUSE", "GOLD", "working", "working");
    expect(find("MOUSE", "GOLD")!.working).toBe(1);
    expect(find("MOUSE", "DIAMOND")!.working).toBe(1);
  });

  it("upgradeDeployed can redeploy the upgraded copy to a different slot", () => {
    seedState({
      cards: [{ name: "MOUSE", tier: "GOLD", owned: true, working: 1, lounge: 0, companion: 0 }],
    });
    useAppStore.getState().upgradeDeployed("MOUSE", "GOLD", "working", "lounge");
    expect(find("MOUSE", "GOLD")!.working).toBe(0);
    expect(find("MOUSE", "DIAMOND")!.lounge).toBe(1);
  });

  it("upgradeDeployed with to=null (leave out) marks the higher tier owned only", () => {
    seedState({
      cards: [{ name: "MOUSE", tier: "GOLD", owned: true, working: 1, lounge: 0, companion: 0 }],
    });
    useAppStore.getState().upgradeDeployed("MOUSE", "GOLD", "working", null);
    expect(find("MOUSE", "GOLD")!.working).toBe(0);
    const diamond = find("MOUSE", "DIAMOND")!;
    expect(diamond.owned).toBe(true);
    expect(diamond.working).toBe(0);
    expect(diamond.lounge).toBe(0);
  });

  it("upgradeDeployed is a no-op at the top tier (GALACTIC)", () => {
    seedState({
      cards: [{ name: "MOUSE", tier: "GALACTIC", owned: true, working: 1, lounge: 0, companion: 0 }],
    });
    useAppStore.getState().upgradeDeployed("MOUSE", "GALACTIC", "working", "working");
    expect(find("MOUSE", "GALACTIC")!.working).toBe(1);
    // No higher tier was created.
    expect(useAppStore.getState().cards).toHaveLength(1);
  });
});

describe("setLoungeCreditSlots", () => {
  beforeEach(() => useAppStore.getState().resetAll());

  it("clamps to a non-negative integer", () => {
    useAppStore.getState().setLoungeCreditSlots(3);
    expect(useAppStore.getState().profile.loungeCreditSlots).toBe(3);
    useAppStore.getState().setLoungeCreditSlots(-2);
    expect(useAppStore.getState().profile.loungeCreditSlots).toBe(0);
  });
});

describe("resetOnboarding", () => {
  beforeEach(() => useAppStore.getState().resetAll());

  it("clears ui.hasOnboarded so the intro shows again (not the setup step)", () => {
    useAppStore.getState().dismissOnboarding();
    expect(useAppStore.getState().ui.hasOnboarded).toBe(true);
    useAppStore.getState().resetOnboarding();
    expect(useAppStore.getState().ui.hasOnboarded).toBe(false);
    expect(useAppStore.getState().ui.pendingSetup).toBe(false);
  });
});

describe("onboarding setup flag", () => {
  it("resetAll re-opens onboarding straight on the setup step", () => {
    useAppStore.getState().dismissOnboarding(); // hasOnboarded = true
    useAppStore.getState().resetAll();
    const ui = useAppStore.getState().ui;
    expect(ui.hasOnboarded).toBeFalsy(); // intro/setup shows again
    expect(ui.pendingSetup).toBe(true); // ...on the setup step
  });

  it("dismissOnboarding marks onboarded and clears the setup flag", () => {
    useAppStore.getState().resetAll(); // pendingSetup = true
    expect(useAppStore.getState().ui.pendingSetup).toBe(true);
    useAppStore.getState().dismissOnboarding();
    expect(useAppStore.getState().ui.hasOnboarded).toBe(true);
    expect(useAppStore.getState().ui.pendingSetup).toBe(false);
  });
});
