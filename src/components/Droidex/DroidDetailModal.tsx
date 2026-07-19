import { createPortal } from "react-dom";
import { TIERS } from "../../constants";
import { cycleLabel } from "../../lib/rebirthCycles";
import { droidCycles } from "../../lib/droidCycles";
import { tierStatsFor } from "../../lib/droidStats";
import { TierPill } from "../common/TierPill";
import type { DroidDef } from "../../types";

/**
 * Read-only droid reference card, opened by tapping a droid's name in the
 * Droidex. Shows buy cost / sell value / credit mining-per-second by tier,
 * plus which rebirth cycle(s) require the droid. Portaled to <body> so the
 * fixed overlay escapes the Droidex row's `view-enter` transform.
 */
export function DroidDetailModal({ def, onClose }: { def: DroidDef; onClose: () => void }) {
  const stats = tierStatsFor(def);
  const rows = TIERS.map((tier) => ({ tier, stat: stats?.[tier] })).filter((r) => r.stat);
  const cycles = droidCycles(def.canonical);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${def.canonical} details`}
        className="relative w-full max-w-[440px] card p-5 m-3 view-enter max-h-[85vh] overflow-y-auto"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="flex items-baseline gap-2 mb-1">
          <h2 className="font-display font-bold text-lg truncate">{def.canonical}</h2>
          <span className="flex-1" />
          <button
            type="button"
            className="font-mono text-[10.5px] uppercase tracking-wider text-holo"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="flex items-center gap-1.5 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-alt">
            {def.rarity}
          </span>
          <span className="font-mono text-[10px] text-muted">·</span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
            {def.class}
          </span>
          {def.eventLocked ? (
            <span className="font-mono text-[10px] uppercase tracking-wide text-sun ml-1">Event</span>
          ) : null}
        </div>

        {def.companionEffect ? (
          <div className="mb-3 pl-3 py-1.5 border-l-2 border-tier-galactic/50 bg-tier-galactic/5 rounded-r-md">
            <span className="font-mono text-[10px] uppercase tracking-wider text-tier-galactic">
              Companion
            </span>{" "}
            <span className="text-[12px] text-ink">{def.companionEffect}</span>
          </div>
        ) : null}

        {/* Needed in which rebirth cycles */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt">
            Needed in
          </span>
          {cycles.length === 0 ? (
            <span className="font-mono text-[11px] text-muted-alt">no rebirth cycle</span>
          ) : (
            <span className="font-mono text-[11px] text-holo">
              {cycles.map((c) => cycleLabel(c).replace(/\s*\(.*\)$/, "")).join(" · ")}
            </span>
          )}
        </div>

        {/* Per-tier economy table */}
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted">No economy stats recorded for this droid.</p>
        ) : (
          <div className="rounded-[10px] border border-line overflow-hidden">
            <div className="grid grid-cols-[3.2rem_1fr_1fr_1fr] gap-x-2 px-3 py-1.5 bg-panel-alt font-mono text-[9px] uppercase tracking-wider text-muted-alt">
              <span>Tier</span>
              <span className="text-right">Buy</span>
              <span className="text-right">Sell</span>
              <span className="text-right">Mining/s</span>
            </div>
            {rows.map(({ tier, stat }) => (
              <div
                key={tier}
                className="grid grid-cols-[3.2rem_1fr_1fr_1fr] gap-x-2 items-center px-3 py-1.5 border-t border-line"
              >
                <TierPill tier={tier} />
                <span className="text-right font-mono text-[11px] tabular-nums">
                  {stat!.cost ?? "—"}
                </span>
                <span className="text-right font-mono text-[11px] tabular-nums text-sun">
                  {stat!.value ?? "—"}
                </span>
                <span className="text-right font-mono text-[11px] tabular-nums text-holo">
                  {stat!.income}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
          Buy = upgrade cost at that tier · Sell = its value · Mining/s = credits per second
          (Working). "%/s" = a percentage income booster.
        </p>
      </div>
    </div>,
    document.body,
  );
}
