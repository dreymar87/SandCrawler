import { describe, expect, it } from "vitest";
import { ALL_CYCLES, cycleFor, cycleLabel } from "./rebirthCycles";

describe("cycleFor", () => {
  it("starts at cycle 1 (RBC1 = OG)", () => {
    expect(cycleFor(0)).toBe(1);
  });

  it("advances by 1 for each Super Rebirth completed", () => {
    expect(cycleFor(1)).toBe(2);
    expect(cycleFor(2)).toBe(3);
    expect(cycleFor(3)).toBe(4);
  });

  it("loops back to RBC1 after the 4th cycle", () => {
    expect(cycleFor(4)).toBe(1);
    expect(cycleFor(5)).toBe(2);
    expect(cycleFor(8)).toBe(1);
  });

  it("respects the manual override", () => {
    expect(cycleFor(0, 3)).toBe(3);
    expect(cycleFor(10, 1)).toBe(1);
  });

  it("treats null override as 'no override'", () => {
    expect(cycleFor(2, null)).toBe(3);
  });

  it("normalises negative or non-integer counts", () => {
    expect(cycleFor(-5)).toBe(1);
    expect(cycleFor(2.7)).toBe(3);
  });
});

describe("cycleLabel", () => {
  it("labels each cycle with its in-game equivalent", () => {
    expect(cycleLabel(1)).toContain("OG");
    expect(cycleLabel(2)).toContain("SRB1");
    expect(cycleLabel(3)).toContain("SRB2");
    expect(cycleLabel(4)).toContain("SRB3");
  });
});

describe("ALL_CYCLES", () => {
  it("enumerates 1..4", () => {
    expect([...ALL_CYCLES]).toEqual([1, 2, 3, 4]);
  });
});
