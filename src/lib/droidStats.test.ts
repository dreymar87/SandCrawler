import { afterEach, describe, expect, it } from "vitest";
import { setStatOverrides, statsFromTable, tierStatsFor } from "./droidStats";
import { DROID_STATS } from "../data/droidStats.seed";
import type { DroidDef, DroidStats } from "../types";

describe("tierStatsFor", () => {
  it("returns per-tier stats for a normal droid keyed by canonical", () => {
    const stats = tierStatsFor("MOUSE");
    expect(stats).toBeDefined();
    expect(stats?.DEFAULT?.income).toBeTruthy();
  });

  it("keys the stats table by canonical name, and still resolves aliases", () => {
    // The importer canonicalises every key, so the plain lookup hits directly
    // (it used to be keyed "MONO-WLKR", which the alias fallback had to cover).
    expect(DROID_STATS["MONO-WALKER"]).toBeDefined();
    expect(tierStatsFor("MONO-WALKER")?.DEFAULT?.income).toBeTruthy();
    // Looking up by an alias spelling still lands on the same row.
    expect(tierStatsFor("MONO-WLKR")).toEqual(tierStatsFor("MONO-WALKER"));
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

describe("statsFromTable — user overrides", () => {
  afterEach(() => setStatOverrides({}));

  it("merges an override over the seed, per field", () => {
    setStatOverrides({ MOUSE: { GOLD: { value: "9.99k" } } });
    const gold = tierStatsFor("MOUSE")?.GOLD;
    expect(gold?.value).toBe("9.99k"); // overridden
    expect(gold?.income).toBe("4/s"); // seed field intact
    expect(gold?.cost).toBe("3.8k"); // seed field intact
  });

  it("fills in a tier the seed lacks", () => {
    expect(tierStatsFor("BB8")?.GOLD).toBeUndefined(); // ICONIC are DEFAULT-only
    setStatOverrides({ BB8: { GOLD: { income: "999/s" } } });
    expect(tierStatsFor("BB8")?.GOLD?.income).toBe("999/s");
  });

  it("empty registry is a seed passthrough (no merge object built)", () => {
    setStatOverrides({});
    expect(tierStatsFor("MOUSE")).toBe(DROID_STATS["MOUSE"]); // same reference
  });
});
