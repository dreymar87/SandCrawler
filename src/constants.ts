import type { DroidClass, Tier } from "./types";

/** Ordered low → high. Index doubles as the tier rank. */
export const TIERS = ["DEFAULT", "GOLD", "DIAMOND", "RAINBOW", "BESKAR"] as const satisfies readonly Tier[];

export const CLASSES = ["WORKER", "ASTROMECH", "BATTLE", "UNKNOWN"] as const satisfies readonly DroidClass[];

/**
 * Credit suffix multipliers. The game shows values like "10.00K", "1.36B".
 * Kept as bigint so we don't lose precision past 2^53 (a real concern at
 * Beskar-tier credit totals).
 */
export const CREDIT_SUFFIXES: Record<string, bigint> = {
  K: 1_000n,
  M: 1_000_000n,
  B: 1_000_000_000n,
  T: 1_000_000_000_000n,
  Q: 1_000_000_000_000_000n,
};

export const TAB_LABELS: Record<import("./types").TabKey, string> = {
  collection: "My Droids",
  standard: "Standard Rebirth",
  super: "Super Rebirth",
  "next-unlock": "Next Unlock",
  data: "Data",
};
