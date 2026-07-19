import { describe, expect, it } from "vitest";
import { statsFromTable, tierStatsFor } from "./droidStats";
import { DROID_STATS } from "../data/droidStats.seed";
import type { DroidDef, DroidStats } from "../types";

describe("tierStatsFor", () => {
  it("returns per-tier stats for a normal droid keyed by canonical", () => {
    const stats = tierStatsFor("MOUSE");
    expect(stats).toBeDefined();
    expect(stats?.DEFAULT?.income).toBeTruthy();
  });

  it("resolves a droid whose stats key is an alias, not the canonical", () => {
    // droidStats.json keys MONO-WALKER as "MONO-WLKR" (an alias), so a plain
    // canonical lookup misses — tierStatsFor must fall back through aliases.
    expect(DROID_STATS["MONO-WALKER"]).toBeUndefined(); // the latent gap
    const stats = tierStatsFor("MONO-WALKER");
    expect(stats).toBeDefined();
    expect(stats?.DEFAULT?.income).toBeTruthy();
  });

  it("returns undefined for an unknown droid", () => {
    expect(tierStatsFor("ZZZ-NOT-A-DROID")).toBeUndefined();
  });
});

describe("statsFromTable", () => {
  const table: DroidStats = {
    "MONO-WLKR": { DEFAULT: { cost: "1k", income: "3/s", value: "500" } },
    MOUSE: { DEFAULT: { cost: "950", income: "2/s", value: "665" } },
  };
  const monoWalker: DroidDef = {
    canonical: "MONO-WALKER",
    class: "WORKER",
    rarity: "RARE",
    tiers: ["DEFAULT"],
    aliases: ["MONO-WLKR"],
  };

  it("prefers the canonical key, then aliases, then the raw name", () => {
    expect(statsFromTable(table, monoWalker)?.DEFAULT?.income).toBe("3/s"); // via alias
    expect(statsFromTable(table, undefined, "MOUSE")?.DEFAULT?.income).toBe("2/s"); // via raw name
    expect(statsFromTable(table, undefined, "NOPE")).toBeUndefined();
  });
});
