/**
 * Keeps MECHANICS.md honest.
 *
 * STRATEGY.md went badly stale — it accumulated eight or so corrections behind
 * the code before anyone noticed, because nothing tied the prose to the data.
 * These tests tie MECHANICS.md to the seeds: add a measured effect or a
 * constant without writing it up and the suite fails.
 *
 * Deliberately loose about wording and exact figures. The point is that every
 * measurement is DOCUMENTED, not that the prose matches a format.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BUILD_SWINGS_PER_SEC,
  buildSwingSeconds,
  MEASURED_EFFECTS,
  pickaxeLevelsKept,
  SCRAP_SWINGS_PER_SEC,
  SCRAP_TIERS,
  scrapSwingSeconds,
} from "./strategyTracks.seed";
import { OBSERVED_REBIRTH_MULTIPLIERS, observedStepAtLevel } from "./rebirthMultipliers.seed";
import { NOVA_UPGRADES } from "./novaShop.seed";

const DOC = readFileSync(resolve(process.cwd(), "MECHANICS.md"), "utf8");
const nameFor = (id: string) => NOVA_UPGRADES.find((u) => u.id === id)?.name ?? id;

describe("MECHANICS.md covers everything we've measured", () => {
  it("names every upgrade with a measured effect", () => {
    for (const e of MEASURED_EFFECTS) {
      expect(DOC, `${e.id} is measured but undocumented`).toContain(nameFor(e.id));
    }
  });

  it("lists the upgrades that are still unmeasured", () => {
    // The gap list is as useful as the findings — it's the work queue.
    const measured = new Set(MEASURED_EFFECTS.map((e) => e.id));
    const unmeasured = NOVA_UPGRADES.filter((u) => !measured.has(u.id));
    expect(unmeasured.length).toBeGreaterThan(0);
    for (const u of unmeasured) {
      expect(DOC, `${u.name} is unmeasured but not listed as a gap`).toContain(u.name);
    }
  });

  it("records the swing constants", () => {
    expect(DOC).toContain(String(BUILD_SWINGS_PER_SEC)); // 2.5 build swings/s
    expect(DOC).toMatch(/one per two seconds|1 per 2 s/i); // the scrap cap
    expect(SCRAP_SWINGS_PER_SEC).toBe(0.5);
  });

  /**
   * Pile tiers took two revisions to get right — payout ladder, then swings to
   * break — so the doc has to carry BOTH halves or the next reader re-derives
   * one of the wrong answers.
   */
  it("documents all four scrap pile tiers, payout and swings", () => {
    for (const t of SCRAP_TIERS) {
      expect(DOC, `${t.label} pile tier undocumented`).toContain(t.label);
      expect(DOC, `${t.label} payout multiple undocumented`).toContain(`${t.payoutMultiple}×`);
    }
    expect(DOC).toMatch(/health bar/i);
    expect(DOC).toMatch(/per swing/i);
    // Swings to break is the half that decides whether tier matters at all.
    expect(DOC).toMatch(/swings to break/i);
  });

  it("states how to turn a pile reading into a credits/s figure", () => {
    // L3 = 1.5s a swing is the worked example the derivation rests on.
    expect(DOC).toContain(scrapSwingSeconds(3).toFixed(1));
    expect(DOC).toMatch(/scrapValueLevel|0\.5 × scrapValue/i);
  });

  it("records the pickaxe formulas with figures that match the code", () => {
    expect(DOC).toContain(buildSwingSeconds(10).toFixed(1)); // 13.2
    expect(DOC).toContain(buildSwingSeconds(11).toFixed(1)); // 14.4
    expect(DOC).toContain(String(pickaxeLevelsKept(1))); // keeps 5 at L1
    expect(DOC).toContain(String(pickaxeLevelsKept(11))); // keeps 25 at L11
  });

  it("records the level-dependent multiplier step", () => {
    for (const level of [0, 6, 12]) {
      expect(DOC, `step near RB${level}`).toContain(observedStepAtLevel(level)!.toFixed(1));
    }
  });

  it("points at where the machine-readable copies live", () => {
    expect(DOC).toContain("strategyTracks.seed.ts");
    expect(DOC).toContain("rebirthMultipliers.seed.ts");
    expect(OBSERVED_REBIRTH_MULTIPLIERS.length).toBeGreaterThan(0);
  });

  it("keeps a record of corrections, since the failure modes recur", () => {
    expect(DOC).toMatch(/correction/i);
    expect(DOC).toMatch(/rounds to 0\.1|rounding/i);
  });
});
