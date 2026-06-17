/**
 * Nova Crystals Shop — upgrade trees with per-level crystal costs.
 * Source: Cait/Omega's Tracker workbook, Nova Crystals + Shop Reference tab.
 *
 * `costs[i]` is the crystal cost to upgrade FROM level i TO level i+1.
 * `null` means the cost is not yet known publicly (future ranks). The UI
 * still lets you record a level beyond known costs in case the player
 * already owns it.
 */
import type { NovaUpgrade } from "../types";

export const NOVA_UPGRADES: readonly NovaUpgrade[] = [
  // ── Core Upgrades ─────────────────────────────────────────────────────
  { id: "core.max-health", tree: "CORE", name: "Max Health", costs: [1] },
  { id: "core.damage", tree: "CORE", name: "Damage", costs: [1, 13] },
  {
    id: "core.credits",
    tree: "CORE",
    name: "Credits",
    costs: [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42],
  },
  { id: "core.flawless-charm", tree: "CORE", name: "Flawless Charm", costs: [500] },
  {
    id: "core.movement-speed",
    tree: "CORE",
    name: "Movement Speed",
    costs: [1, 2, 4, 6, 8],
  },
  { id: "core.double-daily-quests", tree: "CORE", name: "Double Daily Quests", costs: [75] },
  {
    id: "core.pickaxe-mastery",
    tree: "CORE",
    name: "Pickaxe Mastery",
    costs: [5, 10, 15, null, 20, 25, 30],
  },
  { id: "core.jawa-bartering", tree: "CORE", name: "Jawa Bartering", costs: [5, 15, 30] },
  { id: "core.super-crates", tree: "CORE", name: "Super Crates", costs: [10, 25] },

  // ── Workshop Upgrades ─────────────────────────────────────────────────
  { id: "workshop.lounge-slot", tree: "WORKSHOP", name: "Lounge Slot", costs: [1, 30] },
  {
    id: "workshop.upgrade-chip-scrap",
    tree: "WORKSHOP",
    name: "Upgrade Chip Scrap",
    costs: [2, 5, 10, 15, 20],
  },
  {
    id: "workshop.scrap-value",
    tree: "WORKSHOP",
    name: "Scrap Value",
    costs: [25, 55, 85, 115, 145, 185, 215, 235],
  },
  {
    id: "workshop.blueprint-scrap",
    tree: "WORKSHOP",
    name: "Blueprint Scrap",
    costs: [1, 12, 24, 36],
  },
  {
    id: "workshop.crafting-speed",
    tree: "WORKSHOP",
    name: "Crafting Speed",
    costs: [3, 18, 33, 48, 63],
  },
  {
    id: "workshop.blueprint-storage",
    tree: "WORKSHOP",
    name: "Blueprint Storage",
    costs: [10, 75, 150],
  },
  {
    id: "workshop.collect-all",
    tree: "WORKSHOP",
    name: "Collect All",
    costs: [3, 25, 100],
  },
  { id: "workshop.rebirth-droid-alert", tree: "WORKSHOP", name: "Rebirth Droid Alert", costs: [10] },
];
