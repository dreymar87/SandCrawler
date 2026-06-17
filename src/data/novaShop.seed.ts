/**
 * Nova Crystals Shop — upgrade trees + one-shot ICONIC droid purchases.
 *
 * Source: Cait/Omega's Tracker workbook, "Nova Crystals + Shop Reference"
 * tab. The workbook publishes costs for the lower levels of most
 * upgrades; the higher levels (caps confirmed by the user) have unknown
 * costs encoded as `null`. The stepper UI lets the player record progress
 * past the known costs anyway.
 *
 * `costs[i]` is the crystal cost to upgrade FROM level i TO level i+1.
 * `null` = level exists but cost is not yet publicly known.
 */
import type { NovaIconicPurchase, NovaUpgrade } from "../types";

export const NOVA_UPGRADES: readonly NovaUpgrade[] = [
  // ── Core Upgrades ─────────────────────────────────────────────────────
  {
    id: "core.max-health",
    tree: "CORE",
    name: "Max Health",
    costs: [1, null, null, null, null, null, null, null],
  },
  {
    id: "core.damage",
    tree: "CORE",
    name: "Damage",
    costs: [1, 13, null, null, null, null, null, null],
  },
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
    costs: [1, 2, 4, 6, 8, null, null, null],
  },
  { id: "core.double-daily-quests", tree: "CORE", name: "Double Daily Quests", costs: [75] },
  {
    id: "core.pickaxe-mastery",
    tree: "CORE",
    name: "Pickaxe Mastery",
    costs: [5, 10, 15, null, 20, 25, 30, null, null, null, null],
  },
  {
    id: "core.jawa-bartering",
    tree: "CORE",
    name: "Jawa Bartering",
    costs: [5, 15, 30, null, null],
  },
  { id: "core.super-crates", tree: "CORE", name: "Super Crates", costs: [10, 25, null] },

  // ── Workshop Upgrades ─────────────────────────────────────────────────
  {
    id: "workshop.lounge-slot",
    tree: "WORKSHOP",
    name: "Lounge Slot",
    costs: [1, 30, null, null],
  },
  {
    id: "workshop.upgrade-chip-scrap",
    tree: "WORKSHOP",
    name: "Upgrade Chip Scrap",
    costs: [2, 5, 10, 15, 20, null, null, null, null, null],
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
  { id: "workshop.collect-all", tree: "WORKSHOP", name: "Collect All", costs: [3, 25, 100] },
  { id: "workshop.rebirth-droid-alert", tree: "WORKSHOP", name: "Rebirth Droid Alert", costs: [10] },
  { id: "workshop.blueprint-vendor", tree: "WORKSHOP", name: "Blueprint Vendor", costs: [10] },
];

/**
 * ICONIC droids you can purchase from the Nova Shop. Purchase is a
 * single L0 → L1 toggle (no levels). `droid` matches DROID_DICT.canonical.
 */
export const NOVA_ICONIC_PURCHASES: readonly NovaIconicPurchase[] = [
  { droid: "BB8", crystals: 30 },
  { droid: "MISTER BONES", crystals: 30 },
  { droid: "IG-11 MARSHAL", crystals: 30 },
  { droid: "DJ-R3X", crystals: 30 },
  { droid: "CB-23", crystals: 75 },
];
