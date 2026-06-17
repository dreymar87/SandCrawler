/** Bumped when the seed dictionary or Standard Rebirth seed changes. */
export const SEED_VERSION = 3;

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
 */
export const SCHEMA_VERSION = 4;
