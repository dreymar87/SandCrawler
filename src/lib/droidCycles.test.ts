import { describe, expect, it } from "vitest";
import { droidCycles } from "./droidCycles";
import { computeCycleStrategy } from "./cycleStrategy";
import { ALL_CYCLES } from "./rebirthCycles";

describe("droidCycles", () => {
  it("maps a real cycle-1 requirement to include cycle 1", () => {
    // CB is an RB1 requirement in cycle 1 (OG).
    expect(droidCycles("CB")).toContain(1);
  });

  it("returns an empty array for a droid never required", () => {
    expect(droidCycles("ZZZ-NEVER-NEEDED")).toEqual([]);
  });

  it("is case/punctuation-insensitive on the name", () => {
    expect(droidCycles("cb")).toEqual(droidCycles("CB"));
  });

  it("returns cycles in ascending order with no duplicates", () => {
    for (const c of ALL_CYCLES) {
      for (const k of computeCycleStrategy(c).keepers) {
        const cycles = droidCycles(k.name);
        expect(cycles).toContain(c);
        expect([...cycles].sort((a, b) => a - b)).toEqual(cycles);
        expect(new Set(cycles).size).toBe(cycles.length);
      }
    }
  });

  it("agrees with computeCycleStrategy for every cycle's keepers", () => {
    for (const c of ALL_CYCLES) {
      const keeperNames = new Set(computeCycleStrategy(c).keepers.map((k) => k.name));
      for (const name of keeperNames) {
        expect(droidCycles(name)).toContain(c);
      }
    }
  });
});
