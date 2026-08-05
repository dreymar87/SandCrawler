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
 * A reading taken straight after login showed 20.0x at RB11, where the same
 * account had read 21.2x at RB11 the session before — and it returned to 21.2x
 * after collecting credits, without rebirthing. So the low reading looks like a
 * STALE DISPLAY rather than a real change: the HUD hadn't recomputed yet, and
 * collecting forced it to. Recorded but excluded from the fit for that reason.
 *
 * Samples still carry a `session`, and the step is still derived only from
 * WITHIN-session differences. That's cheap insurance: whether the drift is
 * display staleness or a real transient boost, differences taken inside one
 * session are unaffected by it, while differences across sessions are not.
 * Never diff across sessions.
 */
export interface RebirthMultiplierSample {
  rbLevel: number;
  creditMultiplier: number;
  /** Super Rebirths completed when sampled — the carry-over differs by count. */
  superRebirthCount: number;
  /**
   * Play session the reading came from. Only readings sharing a session are
   * comparable: transient boosts cancel within one and don't across.
   */
  session: string;
  /** Anything unusual about the reading — boosts, companion changes. */
  note?: string;
}

export const OBSERVED_REBIRTH_MULTIPLIERS: readonly RebirthMultiplierSample[] = [
  { rbLevel: 6, creditMultiplier: 18.1, superRebirthCount: 2, session: "a" },
  { rbLevel: 7, creditMultiplier: 18.7, superRebirthCount: 2, session: "a" },
  { rbLevel: 8, creditMultiplier: 19.3, superRebirthCount: 2, session: "a" },
  { rbLevel: 9, creditMultiplier: 19.9, superRebirthCount: 2, session: "a" },
  { rbLevel: 10, creditMultiplier: 20.5, superRebirthCount: 2, session: "a" },
  // First departure from the +0.6 run: this step is +0.7. The player had
  // predicted the pattern would get less reliable at higher rebirths — it did,
  // by growing rather than decaying. One deviation isn't a new model, so the
  // step is now DERIVED from the samples instead of hardcoded, which lets it
  // drift with the evidence rather than needing a decision each time.
  { rbLevel: 11, creditMultiplier: 21.2, superRebirthCount: 2, session: "a" },
  // Read immediately after login, same rebirth level, 1.2 lower — then back to
  // 21.2x after collecting credits with no rebirth in between. Almost certainly
  // a stale HUD rather than a real change, so it sits in its own session and
  // contributes nothing to the derived step.
  {
    rbLevel: 11,
    creditMultiplier: 20.0,
    superRebirthCount: 2,
    session: "b-login-stale",
    note: "taken at login; recovered to 21.2x after collecting credits, no rebirth — treat as a display artefact, not a data point",
  },
];

/**
 * Multiplier gained per rebirth level, from WITHIN-session differences only.
 *
 * Each session contributes its own endpoint slope; those are then averaged,
 * weighted by how many levels each spans. Cross-session differences are never
 * taken, because the absolute reading drifts between sessions (see the header)
 * and diffing across that gap would measure the boost, not the level.
 *
 * Endpoint slope within a session rather than a mean of adjacent steps, so
 * that one-decimal display rounding on a middle reading washes out.
 *
 * Currently ≈0.62 from session "a" over RB6→11. Null if no session has two
 * readings at different levels.
 */
export function observedMultiplierStep(
  samples: readonly RebirthMultiplierSample[] = OBSERVED_REBIRTH_MULTIPLIERS,
): number | null {
  const bySession = new Map<string, RebirthMultiplierSample[]>();
  for (const s of samples) {
    const list = bySession.get(s.session) ?? [];
    list.push(s);
    bySession.set(s.session, list);
  }
  let weighted = 0;
  let levels = 0;
  for (const list of bySession.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.rbLevel - b.rbLevel);
    const lo = sorted[0]!;
    const hi = sorted[sorted.length - 1]!;
    const span = hi.rbLevel - lo.rbLevel;
    if (span <= 0) continue;
    weighted += hi.creditMultiplier - lo.creditMultiplier;
    levels += span;
  }
  return levels > 0 ? weighted / levels : null;
}

/** Highest rebirth level anyone has actually sampled — beyond this is guesswork. */
export function highestSampledLevel(
  samples: readonly RebirthMultiplierSample[] = OBSERVED_REBIRTH_MULTIPLIERS,
): number {
  return samples.reduce((n, s) => Math.max(n, s.rbLevel), 0);
}
