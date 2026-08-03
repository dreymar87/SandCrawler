/** Bumped when the seed dictionary or Standard Rebirth seed changes. */
export const SEED_VERSION = 9;

/**
 * Bumped when PersistedState's shape changes incompatibly. `migrate.ts`
 * carries data from older versions forward.
 *
 * v0 — prototype's `Array.isArray(raw)` flat-array shape (the original HTML).
 * v1 — `{ superRebirths, roster }` from the migration brief (§4).
 * v2 — `owned`/`active` split, `customDroids`, `standardOverrides`, `ui`.
 * v3 — Card-based collection (`cards` replaces `roster`), `profile` slice,
 *      droid names uppercased + alias-resolved.
 * v4 — Rebirth cycles + 6th tier FLAWLESS + ICONIC (was MYTHIC) +
 *      cosmetics + Nova Shop. Drops the manual `superRebirths` slice.
 *      Profile gains `superRebirthCount`, `cycleOverride`, `novaEarned/Spent`.
 * v5 — StandardRebirth.rewards split: `slotUnlock` stays per-RB; the
 *      crystals + credit/XP multipliers move to a separate
 *      SUPER_REBIRTH_BONUSES table (they're SRB rewards, not RB rewards).
 *      Adds `novaIconicOwned` slice for ICONIC Nova Shop purchases.
 *      Nova Shop level caps raised with null-padded unknown costs.
 * v6 — IA redesign: 5 primary tabs (home/droidex/rebirths/shop/profile).
 *      `ui.creditsCurrent` moves to `profile.currentCredits`; Profile
 *      gains `baseName` + `upgradeChips`. Old tab keys remapped.
 * v7 — CollectionCard swaps `active: boolean` for `working: number` +
 *      `lounge: number` (per-status duplicate counts). Only Working
 *      contributes to production; Working+Lounge both count for
 *      rebirths. Migration: `active:true` → `working:1`.
 * v8 — Base tab replaces Home. `ui.activeTab "home"` remaps to `"base"`.
 *      Profile gains `loungeCreditSlots` (default 5) — credit-bought
 *      lounge slots that reset on Super Rebirth. Lounge capacity is now
 *      credit slots + Nova-Shop lounge level (not the generic
 *      baseSlots+unlocks path).
 * v9 — GALACTIC replaces FLAWLESS as the 6th tier (Flawless is a cosmetic
 *      shiny, not a tier); card `tier: "FLAWLESS"` → `"BESKAR"`.
 *      CollectionCard gains `companion` (0/1, default 0).
 * v10 — Adds `iconicMerchantBought` slice: unlocked ICONIC droids re-bought
 *      from the Iconic Droid Merchant this cycle (1M credits each), reset on
 *      Super Rebirth. R2-D2 & C-3PO added to the Nova Shop iconic list.
 * v11 — Adds `craftingStations` slice: single-slot state for Worker/
 *      Astromech/Battle stations ({state:"crafting"|"ready"}). Reset on
 *      Super Rebirth. Stations unlock at RB0/1/2 respectively.
 * v12 — Adds `statOverrides` slice: user edits to per-tier droid economy
 *      stats (cost/income/value), merged over the seed everywhere via
 *      statsFromTable. Lets players fill in missing/wrong data.
 * v13 — Community sheet refresh (RB28-30, corrected stats). Prunes any
 *      `statOverrides` field that now duplicates the refreshed seed; edits
 *      that genuinely differ are kept.
 * v14 — Adds the Upgrade Chip Station: `chipStation` (its single occupant,
 *      reset on Super Rebirth) and `chipRates` (observed chips/min per
 *      droid+tier, kept across Super Rebirths as reference data).
 */
export const SCHEMA_VERSION = 14;
