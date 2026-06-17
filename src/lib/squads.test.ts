import { describe, expect, it } from "vitest";
import { getMaxSlots, nextSlotUnlock, totalProductionSlots } from "./squads";

describe("getMaxSlots", () => {
  it("returns base slot count at rebirth 0", () => {
    expect(getMaxSlots("WORKER", 0)).toBe(4);
    expect(getMaxSlots("ASTROMECH", 0)).toBe(3);
    expect(getMaxSlots("BATTLE", 0)).toBe(2);
    expect(getMaxSlots("LOUNGE", 0)).toBe(5);
    expect(getMaxSlots("COMPANION", 0)).toBe(1);
  });

  it("counts every passed unlock for Worker", () => {
    expect(getMaxSlots("WORKER", 1)).toBe(5);
    expect(getMaxSlots("WORKER", 4)).toBe(6);
    expect(getMaxSlots("WORKER", 16)).toBe(11);
    expect(getMaxSlots("WORKER", 23)).toBe(11); // capped — no unlocks past 16
  });

  it("Companion is fixed at 1 regardless of rebirth", () => {
    expect(getMaxSlots("COMPANION", 23)).toBe(1);
  });

  it("Lounge unlocks at RB16–20 (corrected per Cait/Omega's sheet)", () => {
    expect(getMaxSlots("LOUNGE", 15)).toBe(5);
    expect(getMaxSlots("LOUNGE", 16)).toBe(6);
    expect(getMaxSlots("LOUNGE", 17)).toBe(7);
    expect(getMaxSlots("LOUNGE", 20)).toBe(10);
  });
});

describe("nextSlotUnlock", () => {
  it("returns the next future unlock level", () => {
    expect(nextSlotUnlock("WORKER", 0)).toBe(1);
    expect(nextSlotUnlock("WORKER", 1)).toBe(4);
    expect(nextSlotUnlock("WORKER", 10)).toBe(12);
  });

  it("returns null when there are no more unlocks", () => {
    expect(nextSlotUnlock("WORKER", 16)).toBe(null);
    expect(nextSlotUnlock("COMPANION", 0)).toBe(null);
    expect(nextSlotUnlock("BATTLE", 9)).toBe(null);
  });
});

describe("totalProductionSlots", () => {
  it("sums Worker + Astromech + Battle", () => {
    // At rebirth 0: 4 + 3 + 2 = 9
    expect(totalProductionSlots(0)).toBe(9);
    // At rebirth 23 (capped): 11 + 9 + 5 = 25
    expect(totalProductionSlots(23)).toBe(25);
  });
});
