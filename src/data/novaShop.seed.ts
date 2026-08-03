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
  // ── Featured Upgrades ─────────────────────────────────────────────────
  { id: "featured.critical-chance", tree: "FEATURED", name: "Critical Chance", costs: [60, 90, 120, 180] },
  { id: "featured.critical-amount", tree: "FEATURED", name: "Critical Amount", costs: [30, 90, 150, 210, 330] },
  // Companion Slot isn't released yet — 1 level assumed, cost unknown (rumored <500).
  { id: "featured.companion-slot", tree: "FEATURED", name: "Companion Slot", costs: [null] },

  // ── Core Upgrades ─────────────────────────────────────────────────────
  {
    id: "core.max-health",
    tree: "CORE",
    name: "Max Health",
    costs: [1, 6, 13, 19, 25, 31, 37, 43],
  },
  {
    id: "core.damage",
    tree: "CORE",
    name: "Damage",
    costs: [1, 13, 25, 37, 49, 61, 73, 85],
  },
  {
    id: "core.credits",
    tree: "CORE",
    name: "Credits",
    costs: [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54, 58, 62, 66, 70, 74, 78, 82, 86, 90, 94, 98],
  },
  { id: "core.flawless-charm", tree: "CORE", name: "Flawless Charm", costs: [500] },
  {
    id: "core.movement-speed",
    tree: "CORE",
    name: "Movement Speed",
    costs: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34],
  },
  { id: "core.double-daily-quests", tree: "CORE", name: "Double Daily Quests", costs: [75] },
  {
    id: "core.pickaxe-mastery",
    tree: "CORE",
    name: "Pickaxe Mastery",
    costs: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
  },
  {
    id: "core.jawa-bartering",
    tree: "CORE",
    name: "Jawa Bartering",
    costs: [5, 15, 30, 45, 60],
  },
  { id: "core.super-crates", tree: "CORE", name: "Super Crates", costs: [10, 25, null] },

  // ── Workshop Upgrades ─────────────────────────────────────────────────
  {
    id: "workshop.lounge-slot",
    tree: "WORKSHOP",
    name: "Lounge Slot",
    costs: [1, 30, 60, null],
  },
  {
    id: "workshop.upgrade-chip-scrap",
    tree: "WORKSHOP",
    name: "Upgrade Chip Scrap",
    costs: [2, 5, 10, 15, 20, 25, 30, 35, 40, 45],
  },
  {
    id: "workshop.scrap-value",
    tree: "WORKSHOP",
    name: "Scrap Value",
    costs: [25, 55, 85, 115, 145, 175, 205, 235, 265, 295, 325, 355, 385, 415, 445, 475, 505, 535, 565],
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
    costs: [3, 18, 33, 48, 63, 78, 93, 108, 123, 138, 445],
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
 * ICONIC droids you can unlock from the Nova Shop. Unlock is a single
 * L0 → L1 crystal purchase (no levels); `droid` matches
 * DROID_DICT.canonical. Unlocking *enables* the droid in the Iconic Droid
 * Merchant, where each copy costs `ICONIC_MERCHANT_COST` credits per cycle.
 */
export const NOVA_ICONIC_PURCHASES: readonly NovaIconicPurchase[] = [
  { droid: "BB8", crystals: 30 },
  { droid: "MISTER BONES", crystals: 30 },
  { droid: "IG-11 MARSHAL", crystals: 30 },
  { droid: "DJ-R3X", crystals: 30 },
  { droid: "R2-D2", crystals: 30 },
  { droid: "C-3PO", crystals: 30 },
  { droid: "CB-23", crystals: 75 },
];

/**
 * Credits to buy one unlocked ICONIC droid from the Iconic Droid Merchant.
 * These purchases reset every Super Rebirth (tracked in
 * `iconicMerchantBought`).
 */
export const ICONIC_MERCHANT_COST = 1_000_000;
