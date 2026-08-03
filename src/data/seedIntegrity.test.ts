/**
 * Guards on the AUTO-GENERATED seeds. These catch a bad sheet import (wrong
 * columns, a dropped tab, an unresolvable droid name) before it reaches the UI.
 */
import { describe, expect, it } from "vitest";
import { REBIRTH_CYCLES } from "./rebirthCycles.seed";
import { DROID_DICT, TOTAL_CARDS } from "./droids.seed";
import { DROID_STATS } from "./droidStats.seed";
import { CRAFTING_TIMES } from "./craftingTimes.seed";
import { CHIP_COSTS } from "./chipCosts.seed";
import { SUPER_REBIRTH_BONUSES } from "./superRebirthBonuses.seed";
import { NOVA_UPGRADES } from "./novaShop.seed";
import { MAX_STANDARD_REBIRTH, TIERS } from "../constants";
import { normalizeName } from "../lib/normalize";

const MAX_RB = 30;

/** normalized name -> canonical, over canonicals + aliases. */
const index = new Map<string, string>();
for (const d of DROID_DICT) {
  index.set(normalizeName(d.canonical), d.canonical);
  for (const a of d.aliases ?? []) index.set(normalizeName(a), d.canonical);
}

describe("rebirth cycle seed", () => {
  it("covers RB1..30 for all four cycles with no gaps or duplicates", () => {
    expect(REBIRTH_CYCLES).toHaveLength(4 * MAX_RB);
    for (const cycle of [1, 2, 3, 4] as const) {
      const levels = REBIRTH_CYCLES.filter((r) => r.cycle === cycle)
        .map((r) => r.level)
        .sort((a, b) => a - b);
      expect(levels).toEqual(Array.from({ length: MAX_RB }, (_, i) => i + 1));
    }
  });

  it("MAX_STANDARD_REBIRTH matches the data", () => {
    expect(MAX_STANDARD_REBIRTH).toBe(MAX_RB);
  });

  it("every requirement names a known droid at a valid tier", () => {
    for (const rb of REBIRTH_CYCLES) {
      expect(rb.needs.length).toBeGreaterThan(0);
      for (const n of rb.needs) {
        expect(index.get(normalizeName(n.name)), `${n.name} (C${rb.cycle} RB${rb.level})`).toBe(
          n.name,
        );
        expect(TIERS).toContain(n.tier);
      }
    }
  });

  it("every sell-list entry is a known droid or the DO_NOT_SELL marker", () => {
    for (const rb of REBIRTH_CYCLES) {
      for (const s of rb.sellList) {
        if (s === "DO_NOT_SELL") continue;
        expect(index.get(normalizeName(s)), `${s} (C${rb.cycle} RB${rb.level})`).toBe(s);
      }
    }
  });

  it("carries a credit cost for every level", () => {
    for (const rb of REBIRTH_CYCLES) expect(rb.credits).toMatch(/\d/);
  });
});

describe("droid + stats seeds", () => {
  it("has 70 droids and 380 Droidex cards", () => {
    expect(DROID_DICT).toHaveLength(70);
    expect(TOTAL_CARDS).toBe(380);
  });

  it("keys stats by canonical droid names only", () => {
    for (const key of Object.keys(DROID_STATS)) {
      expect(index.get(normalizeName(key)), `stats key ${key}`).toBe(key);
    }
  });

  it("gives every craftable droid all six tiers of stats (ICONIC are DEFAULT-only)", () => {
    for (const d of DROID_DICT) {
      const row = DROID_STATS[d.canonical];
      expect(row, `${d.canonical} has no stats`).toBeDefined();
      const tiers = Object.keys(row!);
      if (d.rarity === "ICONIC") expect(tiers).toEqual(["DEFAULT"]);
      else expect(tiers.sort()).toEqual([...TIERS].sort());
    }
  });

  it("gives every craftable droid build times, and every time is well-formed", () => {
    // Blanks the source sheet itself is missing. If a future import fills one
    // of these in, this list should shrink — that's a nudge, not a failure.
    const KNOWN_GAPS: Record<string, string[]> = {
      "B2 SUPER": ["GALACTIC"],
      "HAUL-R": ["GALACTIC"],
      "PROTO-ROLLER": ["GALACTIC"],
      "TRAK-R": ["GALACTIC"],
      RIC: ["RAINBOW"],
    };
    for (const d of DROID_DICT) {
      if (d.rarity === "ICONIC") continue; // event droids aren't craftable
      const row = CRAFTING_TIMES[d.canonical];
      expect(row, `${d.canonical} has no crafting times`).toBeDefined();
      for (const t of d.tiers) {
        if (KNOWN_GAPS[d.canonical]?.includes(t)) continue;
        expect(row![t], `${d.canonical} ${t}`).toMatch(/^\d+:\d{2}:\d{2}$/);
      }
    }
  });
});

describe("chip costs + SRB bonuses", () => {
  it("each rarity's steps sum to its stated total", () => {
    for (const row of CHIP_COSTS) {
      const sum = row.steps.reduce<number>((n, s) => n + (s ?? 0), 0);
      expect(sum, row.rarity).toBe(row.total);
    }
  });

  it("covers RB12..30 with no gaps", () => {
    const levels = SUPER_REBIRTH_BONUSES.map((b) => b.rbLevel);
    expect(levels).toEqual(Array.from({ length: MAX_RB - 11 }, (_, i) => i + 12));
  });
});

describe("nova shop", () => {
  it("has unique ids and at least one cost level each", () => {
    const ids = NOVA_UPGRADES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of NOVA_UPGRADES) {
      expect(u.costs.length, u.id).toBeGreaterThan(0);
    }
  });

  // Pass 30's sheet comparison skipped columns A-E and missed the whole
  // FEATURED block. These pin the values `--check-nova` now verifies.
  it("matches the sheet's FEATURED ladders", () => {
    const byId = new Map(NOVA_UPGRADES.map((u) => [u.id, u]));

    const chance = byId.get("featured.critical-chance")!;
    expect(chance.costs).toHaveLength(18);
    // 60 rising by 30 a level, to 570.
    expect(chance.costs).toEqual(Array.from({ length: 18 }, (_, i) => 60 + i * 30));

    const amount = byId.get("featured.critical-amount")!;
    expect(amount.costs).toHaveLength(18);
    // 30 rising by 60 a level, to 1050.
    expect(amount.costs).toEqual(Array.from({ length: 18 }, (_, i) => 30 + i * 60));

    expect(byId.get("featured.companion-slot")!.costs).toEqual([250]);
    expect(byId.get("featured.chip-station")!.costs).toEqual([120]);
    expect(byId.get("featured.daily-crystals")!.costs).toEqual([30]);
  });
});
