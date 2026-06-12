/** Bumped when the seed dictionary or Standard Rebirth seed changes. */
export const SEED_VERSION = 1;

/**
 * Bumped when PersistedState's shape changes incompatibly. `migrate.ts`
 * carries data from older versions forward.
 *
 * v0 — prototype's `Array.isArray(raw)` flat-array shape (the original HTML).
 * v1 — `{ superRebirths, roster }` from the migration brief (§4).
 * v2 — Adds `owned`/`active` split, `customDroids`, `standardOverrides`,
 *      `ui` prefs. Tier strings uppercased.
 */
export const SCHEMA_VERSION = 2;
