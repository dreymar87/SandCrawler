import { describe, expect, it } from "vitest";
import { rebirthsForCycle, sellHint } from "./sellGuidance";

describe("rebirthsForCycle", () => {
  it("returns exactly the 27 levels for cycle 1", () => {
    const rows = rebirthsForCycle(1);
    expect(rows).toHaveLength(27);
    expect(rows[0]?.level).toBe(1);
    expect(rows[26]?.level).toBe(27);
  });

  it("RB24 cycle 1 requires a MYTHIC droid (MO-TRAK) per the new data", () => {
    const rb24 = rebirthsForCycle(1).find((r) => r.level === 24)!;
    expect(rb24.credits).toBe("9T");
    expect(rb24.needs.map((n) => n.name)).toContain("MO-TRAK");
  });

  it("RB1 of cycle 1 is CB / PIT / DRK-1 PROBE per the workbook", () => {
    const rb1 = rebirthsForCycle(1)[0]!;
    const names = rb1.needs.map((n) => n.name);
    expect(names).toEqual(["CB", "PIT", "DRK-1 PROBE"]);
  });

  it("each cycle has different RB1 droids", () => {
    expect(rebirthsForCycle(2)[0]?.needs.map((n) => n.name)).toEqual(["MOUSE", "GONK", "ID10"]);
    expect(rebirthsForCycle(3)[0]?.needs.map((n) => n.name)).toEqual(["MOUSE", "PIT", "GONK"]);
    expect(rebirthsForCycle(4)[0]?.needs.map((n) => n.name)).toEqual(["ID10", "PIT", "DRK-1 PROBE"]);
  });
});

describe("sellHint", () => {
  it("flags DO_NOT_SELL when the current rebirth bans selling", () => {
    // RBC1 RB3 has 'Do not sell' in the workbook
    expect(sellHint("CB", 1, 3).kind).toBe("DO_NOT_SELL");
  });

  it("flags droids explicitly listed in the sell column as safe", () => {
    // RBC1 RB5 marks R9 as safe to sell
    expect(sellHint("R9", 1, 5).kind).toBe("SAFE_TO_SELL");
  });

  it("warns KEEP when the droid is needed at a future rebirth", () => {
    // CB is needed at RBC1 RB1; once you're past RB1, it isn't needed again in cycle 1
    // But MOUSE shows up in cycle 2 RB1, so on cycle 2 starting at level 0, MOUSE is KEEP.
    const h = sellHint("MOUSE", 2, 0);
    expect(h.kind).toBe("KEEP");
    expect(h.kind === "KEEP" && h.nextLevel).toBe(1);
  });

  it("returns NOT_NEEDED when nothing ahead requires the droid", () => {
    // CB is RBC1 RB1 only — once you've cleared RB23, it's not needed
    expect(sellHint("CB", 1, 23).kind).toBe("NOT_NEEDED");
  });
});
