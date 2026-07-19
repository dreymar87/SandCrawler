import { describe, expect, it } from "vitest";
import { companionBuffLabel } from "./companionBuffs.seed";

describe("companionBuffLabel", () => {
  it("worker → crafting-speed % by rarity/tier", () => {
    expect(companionBuffLabel("WORKER", "COMMON", "DEFAULT")).toBe("+20% crafting speed");
    expect(companionBuffLabel("WORKER", "MYTHIC", "BESKAR")).toBe("+180% crafting speed");
    expect(companionBuffLabel("WORKER", "COMMON", "GALACTIC")).toBe("+100% crafting speed");
  });

  it("astromech → pickaxe level +N", () => {
    expect(companionBuffLabel("ASTROMECH", "COMMON", "DEFAULT")).toBe("+1 pickaxe level");
    expect(companionBuffLabel("ASTROMECH", "MYTHIC", "GALACTIC")).toBe("+10 pickaxe level");
  });

  it("battle → max health +N", () => {
    expect(companionBuffLabel("BATTLE", "COMMON", "DEFAULT")).toBe("+20 max health");
    expect(companionBuffLabel("BATTLE", "MYTHIC", "GALACTIC")).toBe("+300 max health");
  });

  it("ICONIC and UNKNOWN return null (handled elsewhere / no data)", () => {
    expect(companionBuffLabel("WORKER", "ICONIC", "DEFAULT")).toBe(null);
    expect(companionBuffLabel("UNKNOWN", "COMMON", "DEFAULT")).toBe(null);
  });
});
