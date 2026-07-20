import { useMemo } from "react";
import { formatChipCost } from "../../lib/chipCosts";
import {
  PRODUCTION_CLASSES,
  rankIncome,
  upgradePayoffs,
  type IncomeRow,
} from "../../lib/incomeStrategy";
import { formatPerSecond } from "../../lib/production";
import {
  useActiveCycle,
  useBaseView,
  useProduction,
  useStandardRebirths,
} from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";

/** How many rows to show per class before a "+N more" note. */
const PER_CLASS = 8;

/**
 * Credit strategy: ranks your best credit-earning droids per squad class,
 * flags which are also needed for upcoming rebirths (double-duty in a working
 * slot), and lists the highest-payoff tier upgrades. Collapsible; lives on the
 * Rebirths tab beside the cycle strategy since income is what gates the next
 * rebirth.
 */
export function CreditStrategySection() {
  const cards = useAppStore((s) => s.cards);
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);
  const showAll = useAppStore((s) => s.ui.strategyShowAll ?? false);
  const setUiPref = useAppStore((s) => s.setUiPref);
  const cycle = useActiveCycle();
  const production = useProduction();
  const base = useBaseView();
  const rebirths = useStandardRebirths();

  const ranked = useMemo(
    () => rankIncome({ cards, cycle, currentLevel, includeAll: showAll }),
    [cards, cycle, currentLevel, showAll],
  );
  const upgrades = useMemo(
    () => upgradePayoffs({ cards, cycle, currentLevel }),
    [cards, cycle, currentLevel],
  );

  const nextRb = rebirths.find((r) => r.level === currentLevel + 1);

  // Summary metric: best owned earner + count of upgrade opportunities.
  const topOwned = useMemo(() => {
    let top: IncomeRow | null = null;
    for (const cls of PRODUCTION_CLASSES) {
      for (const r of ranked[cls]) {
        if (r.owned && (!top || r.income > top.income)) top = r;
      }
    }
    return top;
  }, [ranked]);

  const summary = `${topOwned ? `best ${topOwned.incomeLabel}` : "no earners yet"} · ${
    upgrades.length
  } upgrade${upgrades.length === 1 ? "" : "s"}`;

  return (
    <section className="card p-0 mb-4">
      <details className="group">
        <summary className="cursor-pointer select-none px-4 py-3 flex items-baseline gap-2 list-none">
          <span className="font-display font-bold text-base">Credit strategy</span>
          <span className="font-mono text-[10.5px] text-muted-alt">{summary}</span>
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-holo group-open:hidden">show</span>
          <span className="font-mono text-[10.5px] text-holo hidden group-open:inline">hide</span>
        </summary>

        <div className="px-4 pb-4 space-y-3">
          {/* Headline: current income + the next rebirth's cost target */}
          <div className="rounded-[10px] border border-holo-dim/40 bg-holo/5 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt">Now</span>
              <span className="font-display font-bold text-holo">
                {formatPerSecond(production.flat)}
              </span>
              {production.percentLabels.length > 0 ? (
                <span className="font-mono text-[10px] text-sun">
                  + {production.percentLabels.join(" + ")}
                </span>
              ) : null}
            </div>
            {nextRb ? (
              <p className="font-mono text-[10.5px] text-muted-alt mt-1">
                Next: RB{nextRb.level} needs <span className="text-sun font-bold">{nextRb.credits}</span> credits
              </p>
            ) : null}
          </div>

          {/* Show-all toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={showAll}
              onClick={() => setUiPref("strategyShowAll", !showAll)}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                showAll ? "bg-holo/70" : "bg-line-alt"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  showAll ? "translate-x-4" : ""
                }`}
              />
            </button>
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-alt">
              Show all droids (not just owned)
            </span>
          </div>

          {/* Best income by class */}
          {PRODUCTION_CLASSES.map((cls) => {
            const rows = ranked[cls];
            const squad = base.squads.find((s) => s.type === cls);
            const shown = rows.slice(0, PER_CLASS);
            return (
              <div key={cls}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${squad?.accent ?? "text-muted-alt"}`}>
                    {squad?.label ?? cls}
                  </span>
                  {squad ? (
                    <span className="font-mono text-[10px] text-muted-alt">
                      {squad.deployed}/{squad.capacity} slots
                    </span>
                  ) : null}
                </div>
                {rows.length === 0 ? (
                  <p className="font-mono text-[11px] text-muted-alt">
                    No owned {(squad?.label ?? cls).toLowerCase()} droids
                    {showAll ? "" : " — flip “Show all” to see top earners"}.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {shown.map((row) => (
                      <IncomeRowView key={`${row.name}-${row.tier}`} row={row} />
                    ))}
                    {rows.length > shown.length ? (
                      <p className="font-mono text-[10px] text-muted-alt pl-1">
                        +{rows.length - shown.length} more
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

          {/* Upgrade payoffs */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-1.5">
              Top upgrade payoffs
            </div>
            {upgrades.length === 0 ? (
              <p className="font-mono text-[11px] text-muted-alt">
                Nothing working to upgrade — deploy some droids first.
              </p>
            ) : (
              <ul className="space-y-1">
                {upgrades.slice(0, 6).map((u) => (
                  <li
                    key={`${u.name}-${u.tier}`}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-panel-alt border border-line"
                  >
                    <span className="flex-1 truncate text-[13px]">{u.name}</span>
                    <span className="font-mono text-[10px] text-muted-alt">
                      {u.tier}→{u.nextTier}
                    </span>
                    <span className="font-display font-bold text-[13px] text-ok tabular-nums">
                      +{formatPerSecond(u.totalGain)}
                    </span>
                    <span className="font-mono text-[9px] text-sun shrink-0">
                      {formatChipCost(u.chips)} chips
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}

function IncomeRowView({ row }: { row: IncomeRow }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] border ${
        row.owned ? "bg-panel-alt border-line" : "bg-panel-alt/30 border-line/50"
      }`}
    >
      <span className={`flex-1 truncate text-[13px] ${row.owned ? "" : "text-muted"}`}>
        {row.name}
      </span>
      {row.working > 0 ? (
        <span className="font-mono text-[9px] text-holo shrink-0">×{row.working} working</span>
      ) : null}
      {row.needed ? (
        <span className="font-mono text-[9px] text-ok shrink-0">need→RB{row.neededThru}</span>
      ) : null}
      {!row.owned ? (
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-alt shrink-0">acquire</span>
      ) : null}
      <TierPill tier={row.tier} />
      <span className="font-display font-bold text-[13px] text-holo tabular-nums shrink-0">
        {row.incomeLabel || formatPerSecond(row.income)}
      </span>
    </div>
  );
}
