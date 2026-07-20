import { createPortal } from "react-dom";
import { TIERS } from "../../constants";
import { droidCycles } from "../../lib/droidCycles";
import { tierStatsFor } from "../../lib/droidStats";
import { isDroidSafeToSell } from "../../lib/cycleStrategy";
import { sellHint } from "../../lib/sellGuidance";
import { useAppStore } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";
import type { DroidDef, RebirthCycle, Tier } from "../../types";

/**
 * Read-only droid reference card, opened by tapping a droid's name in the
 * Droidex. Shows buy cost / sell value / credit mining-per-second by tier,
 * plus which rebirth cycle(s) require the droid. Portaled to <body> so the
 * fixed overlay escapes the Droidex row's `view-enter` transform.
 *
 * Personalized: tiers the player has deployed (working/lounge) get a green
 * row, and the "Needed in" cycle matching the current cycle is highlighted.
 */
export function DroidDetailModal({
  def,
  deployed,
  activeCycle,
  onClose,
}: {
  def: DroidDef;
  /** Per-tier deployment (working/lounge) for tiers currently on the base. */
  deployed?: Partial<Record<Tier, { working: number; lounge: number }>>;
  activeCycle?: RebirthCycle;
  onClose: () => void;
}) {
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const stats = tierStatsFor(def);
  const rows = TIERS.map((tier) => ({ tier, stat: stats?.[tier] })).filter((r) => r.stat);
  const cycles = droidCycles(def.canonical);

  // Sell verdict — the SAME brain (isDroidSafeToSell/sellHint) Base uses.
  const isIconic = def.rarity === "ICONIC";
  const hint = activeCycle ? sellHint(def.canonical, activeCycle, currentLevel) : null;
  const safe = activeCycle ? isDroidSafeToSell(def.canonical, activeCycle, currentLevel) : false;
  const isDeployed =
    !!deployed && Object.values(deployed).some((d) => (d?.working ?? 0) + (d?.lounge ?? 0) > 0);

  const goto = (tab: "base" | "rebirths") => {
    setActiveTab(tab);
    onClose();
  };

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

        {/* Needed in which rebirth cycles — the current cycle is highlighted. */}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mr-1">
            Needed in
          </span>
          {cycles.length === 0 ? (
            <span className="font-mono text-[11px] text-muted-alt">no rebirth cycle</span>
          ) : (
            <>
              {cycles.map((c) => {
                const isNow = c === activeCycle;
                return (
                  <span
                    key={c}
                    className={`font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                      isNow
                        ? "bg-holo text-[#04222B] font-bold"
                        : "border border-holo/40 text-holo"
                    }`}
                  >
                    RBC{c}
                    {isNow ? " · now" : ""}
                  </span>
                );
              })}
              <button
                type="button"
                className="font-mono text-[10px] uppercase tracking-wider text-holo underline ml-1"
                onClick={() => goto("rebirths")}
              >
                See plan →
              </button>
            </>
          )}
        </div>

        {/* Sell verdict — matches Base's Safe-to-sell brain, with a shortcut. */}
        {activeCycle ? (
          <div className="mb-3 flex items-center gap-2 flex-wrap rounded-[10px] border border-line bg-panel-alt/40 px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt">Sell</span>
            {isIconic ? (
              <span className="text-[12px] text-tier-galactic">Keep — event droid, never sell</span>
            ) : safe ? (
              <span className="text-[12px] text-ok">Safe to sell now</span>
            ) : hint?.kind === "DO_NOT_SELL" ? (
              <span className="text-[12px] text-warn">Do not sell — locked this rebirth</span>
            ) : hint?.kind === "KEEP" ? (
              <span className="text-[12px] text-sun">Keep — needed at RB{hint.nextLevel}</span>
            ) : (
              <span className="text-[12px] text-sun">Keep — needed later this cycle</span>
            )}
            <span className="flex-1" />
            {isDeployed && safe && !isIconic ? (
              <button
                type="button"
                className="font-mono text-[10px] uppercase tracking-wider text-holo underline"
                onClick={() => goto("base")}
              >
                Sell on Base →
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Per-tier economy table — green rows = deployed on your base. */}
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
            {rows.map(({ tier, stat }) => {
              const dep = deployed?.[tier];
              return (
                <div
                  key={tier}
                  className={`grid grid-cols-[3.2rem_1fr_1fr_1fr] gap-x-2 items-center px-3 py-1.5 border-t border-line ${
                    dep ? "bg-ok/10 border-l-2 border-l-ok/70" : ""
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <TierPill tier={tier} />
                    {dep ? (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-ok shrink-0"
                        aria-hidden
                        title={`On base: ${dep.working} working · ${dep.lounge} lounge`}
                      />
                    ) : null}
                  </span>
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
              );
            })}
          </div>
        )}
        <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
          Buy = upgrade cost at that tier · Sell = its value · Mining/s = credits per second
          (Working). <span className="text-ok">Green</span> = on your base. "%/s" = a percentage
          income booster.
        </p>
      </div>
    </div>,
    document.body,
  );
}
