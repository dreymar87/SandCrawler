import { useMemo } from "react";
import { formatChipCost } from "../../lib/chipCosts";
import {
  PRODUCTION_CLASSES,
  deployedByClass,
  dexLeaderboard,
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

/**
 * Credit strategy: ranks the droids you actually have DEPLOYED (working /
 * lounge / companion) per squad class, flags idle Lounge droids that would
 * earn more in a working slot, and lists the biggest tier-upgrade payoffs.
 * Sits on the Rebirths tab beside the cycle strategy since income is what
 * gates the next rebirth.
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

  const byClass = useMemo(
    () => deployedByClass({ cards, cycle, currentLevel, rebirthLevel: currentLevel }),
    [cards, cycle, currentLevel],
  );
  const leaderboard = useMemo(
    () => (showAll ? dexLeaderboard({ cards, cycle, currentLevel }) : []),
    [showAll, cards, cycle, currentLevel],
  );
  const upgrades = useMemo(
    () => upgradePayoffs({ cards, cycle, currentLevel }),
    [cards, cycle, currentLevel],
  );

  const nextRb = rebirths.find((r) => r.level === currentLevel + 1);

  const allRows = [...byClass.WORKER, ...byClass.ASTROMECH, ...byClass.BATTLE];
  const moveCount = allRows.filter((r) => r.moveHint).length;
  const summary =
    moveCount > 0
      ? `${moveCount} lounge droid${moveCount === 1 ? "" : "s"} to work`
      : allRows.length > 0
        ? `${allRows.length} deployed`
        : "nothing deployed";

  const accentFor = (cls: string) =>
    base.squads.find((s) => s.type === cls)?.accent ?? "text-muted-alt";

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

          <p className="font-mono text-[10px] text-muted-alt leading-snug">
            Ranked by what you have deployed now (not the Droidex). Lounge droids earn nothing
            until worked.
          </p>

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
              Show all droids (top earners to acquire)
            </span>
          </div>

          {/* Deployed droids by class */}
          {PRODUCTION_CLASSES.map((cls) => {
            const rows = byClass[cls];
            const squad = base.squads.find((s) => s.type === cls);
            return (
              <div key={cls}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className={`font-mono text-[10px] uppercase tracking-wider ${accentFor(cls)}`}>
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
                    No {(squad?.label ?? cls).toLowerCase()} droids deployed
                    {showAll ? "" : " — flip Show all for top earners"}.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rows.map((row) => (
                      <ActiveRow key={row.name} row={row} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Top earners you don't have deployed (acquire targets) */}
          {showAll ? (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-1.5">
                Top earners not on your base
              </div>
              <ul className="space-y-1">
                {leaderboard
                  .filter((e) => !e.active)
                  .slice(0, 10)
                  .map((e) => (
                    <li
                      key={e.name}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-panel-alt/30 border border-line/50"
                    >
                      <span className="flex-1 truncate text-[13px] text-muted">{e.name}</span>
                      <span className={`font-mono text-[9px] uppercase ${accentFor(e.class)}`}>
                        {e.class[0]}
                      </span>
                      <TierPill tier={e.tier} />
                      <span className="font-display font-bold text-[13px] text-muted tabular-nums shrink-0">
                        {e.incomeLabel}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {/* Upgrade payoffs */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-1.5">
              Top upgrade payoffs
            </div>
            {upgrades.length === 0 ? (
              <p className="font-mono text-[11px] text-muted-alt">
                Nothing working to upgrade — put some droids to work first.
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

function ActiveRow({ row }: { row: IncomeRow }) {
  const working = row.working > 0;
  return (
    <div
      className={`rounded-[10px] border px-3 py-1.5 ${
        row.moveHint ? "bg-sun/5 border-sun/40" : "bg-panel-alt border-line"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-[13px]">{row.name}</span>
        {row.working > 0 ? (
          <span className="font-mono text-[9px] text-holo shrink-0">×{row.working} working</span>
        ) : null}
        {row.lounge > 0 ? (
          <span className="font-mono text-[9px] text-sun shrink-0">×{row.lounge} lounge</span>
        ) : null}
        {row.companion > 0 ? (
          <span className="font-mono text-[9px] text-tier-galactic shrink-0">companion</span>
        ) : null}
        {row.needed ? (
          <span className="font-mono text-[9px] text-ok shrink-0">need→RB{row.neededThru}</span>
        ) : null}
        <TierPill tier={row.tier} />
        <span
          className={`font-display font-bold text-[13px] tabular-nums shrink-0 ${
            working ? "text-holo" : "text-muted"
          }`}
        >
          {row.incomeLabel || "—"}
        </span>
      </div>
      {row.moveHint ? (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-sun font-bold shrink-0">
            ↑ work it
          </span>
          <span className="text-[11px] text-ink">
            {row.moveHint.swapWith
              ? `swap out ${row.moveHint.swapWith.name} (${row.moveHint.swapWith.tier} · ${formatPerSecond(row.moveHint.swapWith.income)})`
              : "move to a free working slot"}{" "}
            · <span className="text-ok font-bold">+{formatPerSecond(row.moveHint.gain)}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
