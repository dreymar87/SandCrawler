/**
 * Observed in-game credit multiplier at a given Standard Rebirth level.
 *
 * This is the curve that removes bias (1) from `lib/srTiming.ts`: the model
 * would otherwise assume a flat credits/s across a run, when it actually
 * climbs as you rebirth.
 *
 * ── Read the caveats before extending this ───────────────────────────────
 * The figure is NOT rebirth-only. Extrapolating the observed step back to RB0
 * lands near 14.5×, far too high for rebirth bonuses alone, so Nova upgrades
 * and Super Rebirth carry-over are folded into whatever the HUD shows. Two
 * players at the same rebirth level will not share a number — which is why
 * `srTimingTable` takes the player's own reading and back-solves from it,
 * rather than looking anything up here.
 *
 * These samples exist to estimate the per-level STEP, which does appear to be
 * shared. All from one account at 2 super rebirths.
 */
export interface RebirthMultiplierSample {
  rbLevel: number;
  creditMultiplier: number;
  /** Super Rebirths completed when sampled — the carry-over differs by count. */
  superRebirthCount: number;
}

export const OBSERVED_REBIRTH_MULTIPLIERS: readonly RebirthMultiplierSample[] = [
  { rbLevel: 6, creditMultiplier: 18.1, superRebirthCount: 2 },
  { rbLevel: 7, creditMultiplier: 18.7, superRebirthCount: 2 },
  { rbLevel: 8, creditMultiplier: 19.3, superRebirthCount: 2 },
  { rbLevel: 9, creditMultiplier: 19.9, superRebirthCount: 2 },
  { rbLevel: 10, creditMultiplier: 20.5, superRebirthCount: 2 },
  // First departure from the +0.6 run: this step is +0.7. The player had
  // predicted the pattern would get less reliable at higher rebirths — it did,
  // by growing rather than decaying. One deviation isn't a new model, so the
  // step is now DERIVED from the samples instead of hardcoded, which lets it
  // drift with the evidence rather than needing a decision each time.
  { rbLevel: 11, creditMultiplier: 21.2, superRebirthCount: 2 },
];

/**
 * Average multiplier gained per rebirth level, measured end-to-end across the
 * samples. End-to-end rather than a mean of steps so that display rounding on
 * any single reading washes out instead of compounding.
 *
 * Currently ≈0.62 over RB6→11. Returns null with fewer than two samples.
 */
export function observedMultiplierStep(
  samples: readonly RebirthMultiplierSample[] = OBSERVED_REBIRTH_MULTIPLIERS,
): number | null {
  if (samples.length < 2) return null;
  const sorted = [...samples].sort((a, b) => a.rbLevel - b.rbLevel);
  const lo = sorted[0]!;
  const hi = sorted[sorted.length - 1]!;
  const span = hi.rbLevel - lo.rbLevel;
  if (span <= 0) return null;
  return (hi.creditMultiplier - lo.creditMultiplier) / span;
}

/** Highest rebirth level anyone has actually sampled — beyond this is guesswork. */
export function highestSampledLevel(
  samples: readonly RebirthMultiplierSample[] = OBSERVED_REBIRTH_MULTIPLIERS,
): number {
  return samples.reduce((n, s) => Math.max(n, s.rbLevel), 0);
}
