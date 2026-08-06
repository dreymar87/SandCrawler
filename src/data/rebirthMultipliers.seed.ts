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
  // Second consecutive +0.7. Beyond rounding now: no constant step reproduces
  // 18.1/18.7/19.3/19.9/20.5/21.2/21.9 even after rounding to one decimal
  // (the best single line misses 4 of the 7). The step really does grow.
  { rbLevel: 12, creditMultiplier: 21.9, superRebirthCount: 2, session: "a" },
  // Third +0.7 in a row. The step rose from 0.6 to 0.7 around RB10 and has now
  // held there — settling rather than accelerating, which bounds the error on
  // projecting it flat.
  { rbLevel: 13, creditMultiplier: 22.6, superRebirthCount: 2, session: "a" },
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
  // First DIRECT reading at RB0, taken right after Super Rebirthing from RB13.
  // Every prior intercept was extrapolated backwards; this one is measured.
  //
  // Against the old cycle's extrapolated 14.5x at RB0 (2 SRBs) this is +0.9
  // for one Super Rebirth that granted +32% credits — the first handle anyone
  // has on bias (2) in srTiming, the carry-over a single-run model can't see.
  // One pair of intercepts isn't a rule; a second SR would confirm the shape.
  {
    rbLevel: 0,
    creditMultiplier: 15.4,
    superRebirthCount: 3,
    session: "c-post-srb3",
    note: "measured at RB0 immediately after SR from RB13 (+32% credits, +160% XP, 16 crystals)",
  },
  // RB0->1 reads +0.4 and RB1->2 reads +0.5, but do NOT conclude the step is
  // growing: a constant step anywhere in 0.401-0.499 reproduces all three
  // readings once you account for one-decimal rounding. Last cycle admits no
  // constant step at all, so the two cycles genuinely differ — but they differ
  // in rebirth level AND super-rebirth count at once, so which one drives it
  // is unresolved. Hence "prefer the current session" rather than a rule about
  // levels.
  { rbLevel: 1, creditMultiplier: 15.8, superRebirthCount: 3, session: "c-post-srb3" },
  { rbLevel: 2, creditMultiplier: 16.3, superRebirthCount: 3, session: "c-post-srb3" },
  // Fourth reading narrows the surviving constant-step range from 0.401-0.500
  // to 0.451-0.500 — still no evidence the step varies WITHIN this cycle, only
  // that it differs from the previous one.
  { rbLevel: 3, creditMultiplier: 16.8, superRebirthCount: 3, session: "c-post-srb3" },
  // Fifth reading; surviving constant-step range now 0.467-0.500. Four points
  // of evidence that the step is FIXED within a cycle, against last cycle
  // where no constant step fit at all.
  { rbLevel: 4, creditMultiplier: 17.3, superRebirthCount: 3, session: "c-post-srb3" },
  // Sixth reading; range now 0.475-0.500. Five consecutive levels fit one
  // fixed step. RB6 is the discriminating level: this cycle projects
  // 18.25-18.40 there against last cycle's measured 18.1, so a reading near
  // 18.1-18.4 means the two cycles converge despite the extra Super Rebirth,
  // while 18.5+ means the step grew mid-cycle as it did last time near RB10.
  { rbLevel: 5, creditMultiplier: 17.8, superRebirthCount: 3, session: "c-post-srb3" },
  // RESOLVES THE CONFOUND. The RB5->6 step is +0.6, which is exactly what the
  // PREVIOUS cycle showed at RB6->10. Two different cycles, same step at the
  // same level: the step is a function of REBIRTH LEVEL, not of super-rebirth
  // count. Pooling across cycles is therefore legitimate, provided you index
  // by level.
  //
  // It also breaks the constant-step fit — nothing reproduces all seven
  // readings — so the step does vary within a cycle. Six points simply
  // couldn't see a change that slow through one-decimal rounding.
  { rbLevel: 6, creditMultiplier: 18.4, superRebirthCount: 3, session: "c-post-srb3" },
  // QUANTIFIES THE SUPER REBIRTH CARRY-OVER. The two cycles are parallel: this
  // one reads 18.4/19.0 at RB6/RB7 against 18.1/18.7, a constant +0.3 offset.
  //
  // Walking cycle 2 back to RB0 with the LEVEL-indexed steps gives 15.10 (an
  // earlier flat-0.6 extrapolation said 14.5, which was too low because the
  // low-level steps are 0.4-0.5). Against cycle 3's measured 15.40 that is a
  // +0.30 carry-over — and the Super Rebirth from RB13 granted creditMult
  // 0.32. 15.10 + 0.32 = 15.42, which displays as 15.4.
  //
  // So SUPER_REBIRTH_BONUSES.creditMult is simply ADDED to the multiplier and
  // persists at every level. That is bias (2) in srTiming, measured at last.
  { rbLevel: 7, creditMultiplier: 19.0, superRebirthCount: 3, session: "c-post-srb3" },
];

/**
 * How many levels back to measure the step over. The step is not constant —
 * it ran +0.6 through RB10 and +0.7 after — so a slope over the whole history
 * is a stale average, while a slope over the last few levels tracks the drift.
 *
 * Four is a compromise: long enough that one-decimal display rounding on a
 * single reading can't dominate, short enough to follow a real change.
 */
export const STEP_WINDOW_LEVELS = 4;

/**
 * Multiplier gained per rebirth level, from WITHIN-session differences only,
 * measured over the most recent `windowLevels` of each session.
 *
 * Cross-session differences are never taken: the absolute reading drifts
 * between sessions (see the header) and diffing across that gap would measure
 * the drift rather than the level.
 *
 * Endpoint slope rather than a mean of adjacent steps, so one-decimal display
 * rounding on a middle reading washes out. Sessions are then combined weighted
 * by the levels each contributes.
 *
 * `nearLevel` restricts the calculation to the session closest to that
 * rebirth level, which matters because the step is level-dependent: ~0.4 at
 * RB0 rising to ~0.7 by RB10. Without it, sessions are pooled.
 *
 * Null if no session has two readings at different levels.
 */
export function observedMultiplierStep(
  samples: readonly RebirthMultiplierSample[] = OBSERVED_REBIRTH_MULTIPLIERS,
  windowLevels: number = STEP_WINDOW_LEVELS,
  nearLevel?: number,
): number | null {
  const bySession = new Map<string, RebirthMultiplierSample[]>();
  for (const s of samples) {
    const list = bySession.get(s.session) ?? [];
    list.push(s);
    bySession.set(s.session, list);
  }

  // Sessions disagree: ~0.4-0.5 in the current cycle at RB0-2, 0.6-0.7 in the
  // previous one at RB6-13. Whether that's driven by rebirth level or by
  // super-rebirth count is confounded — the two moved together — so don't
  // encode a rule about either. Prefer the player's CURRENT session, which is
  // the right answer under both explanations, and fall back to level
  // proximity only when the current session can't yield a step yet.
  if (nearLevel !== undefined) {
    const usable = (list: RebirthMultiplierSample[]) => {
      if (list.length < 2) return false;
      const levels = list.map((s) => s.rbLevel);
      return Math.max(...levels) !== Math.min(...levels);
    };
    // Samples are appended chronologically, so scan back for the most recent
    // session that can actually yield a step. Scanning for the LAST session
    // outright would stall on a single-reading one (e.g. the stale-login
    // artefact) and silently fall through to another cycle's data.
    const ordered = [...bySession.values()];
    for (let i = ordered.length - 1; i >= 0; i--) {
      const list = ordered[i]!;
      if (usable(list)) return observedMultiplierStep(list, windowLevels);
    }

    let best: { list: RebirthMultiplierSample[]; distance: number } | null = null;
    for (const list of ordered) {
      if (!usable(list)) continue;
      const distance = Math.min(...list.map((s) => Math.abs(s.rbLevel - nearLevel)));
      if (!best || distance < best.distance) best = { list, distance };
    }
    if (best) return observedMultiplierStep(best.list, windowLevels);
  }
  let weighted = 0;
  let levels = 0;
  for (const list of bySession.values()) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.rbLevel - b.rbLevel);
    const hi = sorted[sorted.length - 1]!;
    // Walk back to the oldest reading still inside the window, falling back to
    // the session's own start when it's shorter than the window.
    const cutoff = hi.rbLevel - Math.max(1, windowLevels);
    const lo = sorted.find((s) => s.rbLevel >= cutoff) ?? sorted[0]!;
    const span = hi.rbLevel - lo.rbLevel;
    if (span <= 0) continue;
    weighted += hi.creditMultiplier - lo.creditMultiplier;
    levels += span;
  }
  return levels > 0 ? weighted / levels : null;
}

/**
 * The step observed AT a given rebirth level, pooled across cycles.
 *
 * Both sampled cycles show the same step at the same level (+0.6 at RB5→6 in
 * one and RB6→10 in the other), so the step is level-driven and cross-cycle
 * pooling is sound as long as it's indexed by level. Observed so far:
 *
 *   RB0→1   +0.4          RB6→10  +0.6
 *   RB1→5   +0.5          RB10→13 +0.7
 *   RB5→6   +0.6
 *
 * Only consecutive WITHIN-session pairs are used, so a between-session drift
 * in the absolute reading can't be mistaken for a step. Falls back to the
 * nearest sampled level, which means levels above the top sample inherit the
 * highest observed step — conservative, since the step has only ever risen.
 */
export function observedStepAtLevel(
  level: number,
  samples: readonly RebirthMultiplierSample[] = OBSERVED_REBIRTH_MULTIPLIERS,
): number | null {
  const bySession = new Map<string, RebirthMultiplierSample[]>();
  for (const s of samples) {
    const list = bySession.get(s.session) ?? [];
    list.push(s);
    bySession.set(s.session, list);
  }
  // (fromLevel, step) for every adjacent pair inside a session.
  const steps: { from: number; step: number }[] = [];
  for (const list of bySession.values()) {
    const sorted = [...list].sort((a, b) => a.rbLevel - b.rbLevel);
    for (let i = 1; i < sorted.length; i++) {
      const lo = sorted[i - 1]!;
      const hi = sorted[i]!;
      const span = hi.rbLevel - lo.rbLevel;
      if (span <= 0) continue;
      const per = (hi.creditMultiplier - lo.creditMultiplier) / span;
      for (let k = lo.rbLevel; k < hi.rbLevel; k++) steps.push({ from: k, step: per });
    }
  }
  if (!steps.length) return null;
  let best = steps[0]!;
  for (const s of steps) {
    if (Math.abs(s.from - level) < Math.abs(best.from - level)) best = s;
  }
  return best.step;
}

/** Highest rebirth level anyone has actually sampled — beyond this is guesswork. */
export function highestSampledLevel(
  samples: readonly RebirthMultiplierSample[] = OBSERVED_REBIRTH_MULTIPLIERS,
): number {
  return samples.reduce((n, s) => Math.max(n, s.rbLevel), 0);
}
