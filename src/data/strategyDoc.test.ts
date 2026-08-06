/**
 * Pins the cost figures quoted in MECHANICS.md to the seeds they came from.
 *
 * These numbers ("15,390 ◆ — 58% of the shop", "ten levels of Credits for
 * 200 ◆") derive from seeds that DO change: one pass moved every rebirth
 * credit cost, another rewrote the Nova FEATURED ladders. Without a guard, a
 * future import silently leaves the prose wrong.
 *
 * They live in MECHANICS.md rather than STRATEGY.md because they are facts.
 * STRATEGY.md is decisions now and deliberately restates nothing, which is
 * what stopped it drifting.
 *
 * A failure here means the doc needs updating, not that the import is bad —
 * fix MECHANICS.md in the same commit as the seed change.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NOVA_UPGRADES } from "./novaShop.seed";
import { SUPER_REBIRTH_BONUSES } from "./superRebirthBonuses.seed";

const cost = (id: string): number[] =>
  (NOVA_UPGRADES.find((u) => u.id === id)?.costs ?? []).map((c) => c ?? 0);
const total = (id: string): number => cost(id).reduce((a, b) => a + b, 0);
const firstN = (id: string, n: number): number =>
  cost(id).slice(0, n).reduce((a, b) => a + b, 0);

// vitest runs under jsdom, where import.meta.url isn't a file: URL — resolve
// from the project root instead (vitest's cwd).
const DOC = readFileSync(resolve(process.cwd(), "MECHANICS.md"), "utf8");

describe("MECHANICS.md cost figures still match the seeds", () => {
  it("whole-shop total is 26,630 crystals", () => {
    const shop = NOVA_UPGRADES.reduce((n, u) => n + u.costs.reduce<number>((a, c) => a + (c ?? 0), 0), 0);
    expect(shop).toBe(26_630);
    expect(DOC).toContain("26,630");
  });

  it("the two crit ladders are 15,390 crystals — 58% of the shop", () => {
    const chance = total("featured.critical-chance");
    const amount = total("featured.critical-amount");
    expect(chance).toBe(5_670);
    expect(amount).toBe(9_720);
    expect(chance + amount).toBe(15_390);
    expect(Math.round(((chance + amount) / 26_630) * 100)).toBe(58);
    expect(DOC).toContain("15,390");
    expect(DOC).toContain("58%");
  });

  it("ten-levels comparison table is accurate", () => {
    expect(firstN("core.credits", 10)).toBe(200);
    expect(firstN("workshop.scrap-value", 10)).toBe(1_600);
    expect(firstN("featured.critical-chance", 10)).toBe(1_950);
    expect(firstN("featured.critical-amount", 10)).toBe(3_000);
    // ...and the 15× claim about Credits vs Critical Amount.
    expect(Math.round(3_000 / 200)).toBe(15);
    expect(DOC).toContain("15×");
  });

  it("the cheap early buys are still cheap", () => {
    expect(cost("featured.daily-crystals")[0]).toBe(30);
    expect(cost("workshop.lounge-slot")[0]).toBe(1);
    expect(cost("workshop.collect-all")[0]).toBe(3);
    expect(cost("core.double-daily-quests")[0]).toBe(75);
    expect(cost("featured.chip-station")[0]).toBe(120);
    expect(cost("core.flawless-charm")[0]).toBe(500);
    expect(firstN("core.credits", 5)).toBe(50);
    expect(firstN("workshop.crafting-speed", 3)).toBe(54);
    expect(total("workshop.scrap-value")).toBe(5_605);
  });

  it("Super Rebirth rewards quoted for RB16/19/20 are unchanged", () => {
    const at = (lvl: number) => SUPER_REBIRTH_BONUSES.find((b) => b.rbLevel === lvl)!;
    expect(at(16)).toMatchObject({ crystals: 37, creditMult: 0.74 });
    expect(at(19)).toMatchObject({ crystals: 67, creditMult: 1.34 });
    expect(at(20).crystals).toBe(79);
  });
});
