/**
 * Cosmetic collectibles: Hats, Paints, and Droid Effects.
 * Source: Cait/Omega's Tracker workbook, Cosmetics tab.
 * Game facts, not copyrightable.
 *
 * `requirementKind` is our structured categorisation that lets the UI
 * link rebirth/craft milestones across systems; `requirement` is the
 * verbatim label players see in-game.
 */
import type { CosmeticItem } from "../types";

const slug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const hat = (name: string, requirement: string, kind: CosmeticItem["requirementKind"] = "WORLD"): CosmeticItem => ({
  id: `hat-${slug(name)}`,
  kind: "HAT",
  name,
  requirement,
  requirementKind: kind,
});

const paint = (
  name: string,
  requirement: string,
  kind: CosmeticItem["requirementKind"] = "NONE",
  value?: number,
): CosmeticItem => ({
  id: `paint-${slug(name)}`,
  kind: "PAINT",
  name,
  requirement,
  requirementKind: kind,
  requirementValue: value,
});

const effect = (
  name: string,
  requirement: string,
  kind: CosmeticItem["requirementKind"] = "EVENT",
): CosmeticItem => ({
  id: `effect-${slug(name)}`,
  kind: "EFFECT",
  name,
  requirement,
  requirementKind: kind,
});

export const COSMETICS: readonly CosmeticItem[] = [
  // ── Hats (mostly world-found) ───────────────────────────────────────
  hat("F1L-ON1", "Find in world"),
  hat("Cone of Coruscant", "Find in world"),
  hat("Rebel Snapback", "Find in world"),
  hat("Twin Sunhat", "Find in world"),
  hat("Speeder Cap", "Find in world"),
  hat("Fennec's Flyer", "Find in world"),
  hat("Outrider", "Find in world"),
  hat("Hoth Holiday", "Find in world"),
  hat("AT-Topper", "Find in world"),
  hat("Order-67", "Find in world"),
  hat("Bantha Whip", "Find in world"),
  hat("Blaster Shade", "Find in world"),
  hat("Death Star Dish", "Find in world"),
  hat("Gridcap", "Find in world"),
  hat("Outeredge", "Find in world"),
  hat("Bonehead Hat", "Mister Bones event", "EVENT"),

  // ── Paints ──────────────────────────────────────────────────────────
  paint("Red Paint (Default)", "Owned by default", "NONE"),
  paint("Yellow Paint", "Owned by default", "NONE"),
  paint("Blue Paint", "Rebirth 1 time", "REBIRTH", 1),
  paint("Gold Paint", "Rebirth 5 times", "REBIRTH", 5),
  paint("Diamond Paint", "Rebirth 10 times", "REBIRTH", 10),
  paint("Rainbow Paint", "Rebirth 15 times", "REBIRTH", 15),
  paint("Worker Green Paint", "Craft 100 droids", "CRAFT", 100),
  paint("Battle Orange Paint", "Craft 250 droids", "CRAFT", 250),
  paint("Astromech Purple Paint", "Craft 500 droids", "CRAFT", 500),
  paint("Flawless Paint", "Craft 15 Flawless droids", "FLAWLESS_CRAFT", 15),
  paint("Super Flawless Paint", "Craft 50 Flawless droids", "FLAWLESS_CRAFT", 50),
  paint("Ringmaster Paint", "Fly through every yellow ring", "RINGS"),
  paint("Advanced Ringmaster Paint", "Fly through every orange ring", "RINGS"),
  paint("Beskar Paint", "Collect 25 different Beskar droids", "BESKAR_COLLECT", 25),
  paint("Super Beskar Paint", "Collect 50 different Beskar droids", "BESKAR_COLLECT", 50),
  paint("Resistance Regalia Paint", "BB8 event", "EVENT"),
  paint("Mister Bones Paint", "Mister Bones event", "EVENT"),
  paint("Mandalorian Workshop Paint", "Mandalorian event", "EVENT"),
  paint("Nova Crystal Stage 1", "Unlock with Nova Crystals (30)", "NOVA", 30),
  paint("Nova Crystal Stage 2", "Unlock with Nova Crystals (120 + Stage 1)", "NOVA", 120),
  paint("Nova Crystal Stage 3", "Unlock with Nova Crystals (400 + Stage 2)", "NOVA", 400),
  paint("DJ R-3X Paint", "DJ R-3X event", "EVENT"),
  paint("R2-D2 Paint", "R2-D2 event", "EVENT"),

  // ── Droid Effects ───────────────────────────────────────────────────
  effect("Groovy Aura", "DJ R-3X event"),
];
