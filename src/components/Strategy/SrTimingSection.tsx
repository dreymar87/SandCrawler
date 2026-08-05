import { useMemo, useState } from "react";
import {
  bestSrStop,
  OBSERVED_MULTIPLIER_STEP,
  PROJECTION_WARN_LEVELS,
  srTimingTable,
  type SrStop,
} from "../../lib/srTiming";
import { formatPerSecond } from "../../lib/production";
import { formatCredits } from "../../lib/credits";
import { cycleLabel } from "../../lib/rebirthCycles";
import { useActiveCycle, useProduction } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

/**
 * Two hours, not one. Getting back to RB12 costs ~2.3B credits — seconds of
 * grinding at any realistic rate — so the whole early game is droid
 * acquisition: crafting, tier upgrades, redeploying. Players report that
 * taking around two hours, and the default matters because it drives the
 * recommendation.
 */
const DEFAULT_SETUP_HOURS = 2;

/** "2.5 h" / "18 min" — run lengths span minutes to days, so scale the unit. */
function formatHours(h: number): string {
  if (!Number.isFinite(h)) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

/**
 * "When should I Super Rebirth?" — the highest-leverage decision in the game,
 * because Super Rebirth is effectively the only source of Nova Crystals.
 *
 * Computes crystals/hour for every eligible stopping level from the player's
 * LIVE credits/s, so the answer tracks their actual progress instead of
 * repeating a community rule of thumb that only holds at high income.
 */
export function SrTimingSection() {
  const cycle = useActiveCycle();
  const production = useProduction();
  const setUiPref = useAppStore((s) => s.setUiPref);
  const storedSetup = useAppStore((s) => s.ui.srSetupHours);
  const storedMult = useAppStore((s) => s.ui.creditMultiplier);
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);

  const setupHours = storedSetup ?? DEFAULT_SETUP_HOURS;
  const [draft, setDraft] = useState(String(setupHours));
  const [multDraft, setMultDraft] = useState(storedMult ? String(storedMult) : "");
  const [showAll, setShowAll] = useState(false);

  const rows = useMemo(
    () =>
      srTimingTable({
        cycle,
        creditsPerSec: production.flat,
        setupHours,
        // Only integrate a climbing rate once the player has told us what
        // multiplier they're on; otherwise stay on the flat model.
        multiplier:
          storedMult && storedMult > 0
            ? { atCurrentLevel: storedMult, currentLevel }
            : undefined,
      }),
    [cycle, production.flat, setupHours, storedMult, currentLevel],
  );
  const best = useMemo(() => bestSrStop(rows), [rows]);

  const commit = (raw: string) => {
    const n = Number(raw.trim());
    setUiPref("srSetupHours", Number.isFinite(n) && n >= 0 ? n : DEFAULT_SETUP_HOURS);
  };

  // Without deployed droids there's no rate, so the per-hour column is
  // meaningless — fall back to showing the efficiency ratio only.
  const hasRate = production.flat > 0n;
  const visible = showAll ? rows : rows.filter((r) => r.level <= (best?.level ?? 20) + 3);

  return (
    <section className="card p-4 mb-4">
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="font-display font-bold text-base">When to Super Rebirth</h2>
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-muted-alt">{cycleLabel(cycle)}</span>
      </div>

      {hasRate && best ? (
        <>
          <p className="font-mono text-[11px] text-muted mb-1.5">
            At <span className="text-holo">{formatPerSecond(production.flat)}</span> you earn most
            crystals by Super Rebirthing at{" "}
            <span className="font-bold text-ok">RB{best.level}</span> —{" "}
            <span className="text-ok">{best.crystalsPerHour.toFixed(1)} crystals/hour</span>, a{" "}
            {formatHours(best.runHours)} run.
          </p>
          {/* When setup dominates the run, pushing further is cheap — the
              marginal grind is small against overhead you've already paid. */}
          <p className="font-mono text-[10px] text-muted-alt mb-3">
            {formatHours(setupHours)} setup + {formatHours(Math.max(0, best.runHours - setupHours))}{" "}
            grinding
            {best.runHours > 0 && setupHours / best.runHours >= 0.75
              ? " — setup is most of that, so pushing a level or two further costs little."
              : ""}
          </p>
        </>
      ) : (
        <p className="font-mono text-[11px] text-warn mb-3">
          Deploy some droids to get a credits/s reading — then this recommends a stopping level.
          The efficiency column below works regardless.
        </p>
      )}

      <div className="flex items-center gap-2 mb-3">
        <label
          className="font-mono text-[10px] uppercase tracking-wider text-muted-alt"
          htmlFor="sr-setup"
        >
          Setup per run
        </label>
        <input
          id="sr-setup"
          type="text"
          inputMode="decimal"
          className="input w-16 text-right tabular-nums"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="font-mono text-[10px] text-muted-alt">hours</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <label
          className="font-mono text-[10px] uppercase tracking-wider text-muted-alt"
          htmlFor="sr-mult"
        >
          Credit multiplier
        </label>
        <input
          id="sr-mult"
          type="text"
          inputMode="decimal"
          className="input w-16 text-right tabular-nums"
          value={multDraft}
          placeholder="—"
          onChange={(e) => setMultDraft(e.target.value)}
          onBlur={(e) => {
            const n = Number(e.target.value.trim());
            setUiPref("creditMultiplier", e.target.value.trim() === "" || !Number.isFinite(n) || n <= 0 ? undefined : n);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="font-mono text-[10px] text-muted-alt">
          × at RB{currentLevel}
          {storedMult ? "" : " · optional"}
        </span>
      </div>
      {/* The reading drifts between sessions — one account saw 21.2x and then
          20.0x at the same rebirth — so a saved value can quietly go stale. */}
      {storedMult ? (
        <p className="font-mono text-[9.5px] text-muted-alt mb-3 leading-snug">
          Read this after collecting, not straight after login — the HUD can show a low figure
          until the first collection refreshes it.
        </p>
      ) : null}

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full font-mono text-[11px] tabular-nums">
          <thead>
            <tr className="text-muted-alt text-[9.5px] uppercase tracking-wider">
              <th className="text-left font-normal pb-1.5">SR at</th>
              <th className="text-right font-normal pb-1.5">Crystals</th>
              <th className="text-right font-normal pb-1.5">Run</th>
              <th className="text-right font-normal pb-1.5">Per hour</th>
              <th className="text-right font-normal pb-1.5" title="Crystals per 1T credits spent">
                Per 1T
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <Row key={r.level} row={r} isBest={r.level === best?.level} atOrPast={currentLevel >= r.level} hasRate={hasRate} />
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > visible.length ? (
        <button
          type="button"
          className="mt-2 font-mono text-[10px] uppercase tracking-wider text-holo"
          onClick={() => setShowAll(true)}
        >
          Show all levels →
        </button>
      ) : null}

      <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
        Reaching RB N costs every rebirth on the way up, so the run gets long fast while the
        crystal reward barely moves — that's why the best stop is usually lower than you'd guess.
        Setup time is your estimate; raising it pushes the answer higher.
      </p>
      {/* One bias is correctable given the player's multiplier; the other
          isn't, so the caveat narrows rather than disappearing. */}
      <p className="font-mono text-[10px] text-warn/80 mt-2 leading-snug">
        {storedMult ? (
          <>
            Using your {storedMult}× at RB{currentLevel}, climbing ~
            {OBSERVED_MULTIPLIER_STEP} a level, so the grind figures account for your rate rising as
            you go. Rows marked <span className="text-warn">~</span> project that step more than{" "}
            {PROJECTION_WARN_LEVELS} levels past where you are — the correction is largest exactly
            where it's least observed, so treat those as rough. Still a floor besides: Super Rebirth
            raises the multiplier every future run starts from, which one run can't show.
          </>
        ) : (
          <>
            Treat this as a floor. It assumes a flat credits/s, but your multiplier climbs as you
            rebirth. Enter it above and the grind figures get noticeably more accurate at the top of
            the ladder.
          </>
        )}
      </p>
    </section>
  );
}

function Row({
  row,
  isBest,
  atOrPast,
  hasRate,
}: {
  row: SrStop;
  isBest: boolean;
  atOrPast: boolean;
  hasRate: boolean;
}) {
  return (
    <tr
      className={`border-t border-line/60 ${
        isBest ? "bg-ok/10 text-ok" : atOrPast ? "text-ink" : "text-muted"
      }`}
    >
      <td className="py-1.5 text-left">
        RB{row.level}
        {isBest ? <span className="ml-1.5 text-[9px] uppercase tracking-wider">best</span> : null}
        {(row.levelsProjected ?? 0) > PROJECTION_WARN_LEVELS ? (
          <span
            className="ml-1 text-[9px] text-warn"
            title={`Multiplier projected ${row.levelsProjected} levels past anything you've observed`}
          >
            ~
          </span>
        ) : null}
      </td>
      <td className="py-1.5 text-right">{row.crystals}</td>
      <td className="py-1.5 text-right">{hasRate ? formatHours(row.runHours) : "—"}</td>
      <td className={`py-1.5 text-right ${isBest ? "font-bold" : ""}`}>
        {hasRate ? row.crystalsPerHour.toFixed(1) : "—"}
      </td>
      <td className="py-1.5 text-right" title={`${formatCredits(row.cumCredits)} total credits`}>
        {row.crystalsPerT.toFixed(1)}
      </td>
    </tr>
  );
}
