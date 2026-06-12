import { clear, get, set } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

/**
 * Zustand `persist` adapter backed by idb-keyval. Async under the hood; the
 * middleware handles rehydration timing for us.
 *
 * Why idb over localStorage: room to grow, no 5MB cap, and survives
 * Safari's aggressive eviction better.
 */
export const idbStorage: StateStorage = {
  async getItem(name) {
    const value = await get<string>(name);
    return value ?? null;
  },
  async setItem(name, value) {
    await set(name, value);
  },
  async removeItem(name) {
    await set(name, undefined);
  },
};

/** Wipe everything SandCrawler has stored. Used by the Data tab's reset action. */
export async function wipeStorage(): Promise<void> {
  await clear();
}
