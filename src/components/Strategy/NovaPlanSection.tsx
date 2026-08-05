import { useMemo, useState } from "react";
import { STRATEGY_TRACKS, type StrategyGoal } from "../../data/strategyTracks.seed";
import { planNovaPurchases, type PlanStep } from "../../lib/novaPlan";
import { useNovaBalance } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

/**
 * "What should I buy next in the Nova Shop?" — the editorial priority track
 * (strategyTracks.seed.ts) applied to what the player already owns, priced
 * from the real cost ladder and checked against their crystal balance.
 *
 * Deliberately labelled as judgement rather than a computed optimum: the
 * workbooks publish crystal costs but not effect magnitudes, so there is no
 * honest way to compute this the way the SR-timing table is computed.
 */
export function NovaPlanSection() {
  const upgrades = useAppStore((s) => s.novaUpgrades);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const { balance } = useNovaBalance();
  const [goal, setGoal] = useState<StrategyGoal>("CRYSTALS_PER_HOUR");
  const [showSkip, setShowSkip] = useState(false);

  const plan = useMemo(
    () => planNovaPurchases({ upgrades, goal, balance, limit: 8 }),
    [upgrades, goal, balance],
  );

  return (
    <section className="card p-4 mb-4">
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="font-display font-bold text-base">What to buy next</h2>
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-muted-alt">{balance} ◆ available</span>
      </div>

      {/* Goal selector — the right order genuinely differs by objective. */}
      <div className="flex gap-1.5 mb-3">
        {STRATEGY_TRACKS.map((t) => (
          <button
            key={t.goal}
            type="button"
            onClick={() => setGoal(t.goal)}
            className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border transition ${
              goal === t.goal
                ? "border-holo bg-holo/10 text-holo"
                : "border-line-alt text-muted hover:text-ink hover:border-holo-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="font-mono text-[10px] text-muted-alt mb-3">{plan.summary}</p>

      {plan.steps.length === 0 ? (
        <p className="font-mono text-[11px] text-ok">
          Everything on this track is bought. Nice.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {plan.steps.map((s, i) => (
            <Step key={`${s.id}-${s.toLevel}`} step={s} index={i + 1} />
          ))}
        </ol>
      )}

      {plan.steps.length > 0 ? (
        <div className="flex items-baseline gap-2 mt-3">
          <span className="font-mono text-[10px] text-muted-alt">
            {plan.affordableCount} of {plan.steps.length} affordable now · {plan.totalCost} ◆ for
            the lot
          </span>
          <span className="flex-1" />
          <button
            type="button"
            className="font-mono text-[10px] uppercase tracking-wider text-holo"
            onClick={() => setActiveTab("shop")}
          >
            Nova Shop →
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-alt hover:text-ink"
        onClick={() => setShowSkip((v) => !v)}
      >
        {showSkip ? "Hide" : "Show"} what to skip ({plan.skip.length}) {showSkip ? "▲" : "▼"}
      </button>
      {showSkip ? (
        <ul className="mt-2 space-y-1.5">
          {plan.skip.map((s) => (
            <li key={s.id} className="pl-3 border-l-2 border-danger/40">
              <span className="font-mono text-[11px] text-ink">{s.name}</span>
              <p className="font-mono text-[10px] text-muted-alt leading-snug">{s.why}</p>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
        This ordering is judgement, not maths — the community sheets publish crystal costs but not
        how much each level actually does. The reasoning is in STRATEGY.md.
      </p>
    </section>
  );
}

function Step({ step, index }: { step: PlanStep; index: number }) {
  return (
    <li
      className={`flex items-baseline gap-2 px-2.5 py-1.5 rounded-md border ${
        step.affordable ? "border-ok/40 bg-ok/5" : "border-line bg-panel-alt/40"
      }`}
    >
      <span className="font-mono text-[10px] text-muted-alt w-4 shrink-0">{index}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[11.5px] text-ink truncate">{step.name}</span>
          <span className="font-mono text-[9.5px] text-muted-alt shrink-0">
            {step.levels === 1 ? `L${step.toLevel}` : `L${step.fromLevel}→L${step.toLevel}`}
          </span>
        </div>
        <p className="font-mono text-[9.5px] text-muted-alt leading-snug">{step.why}</p>
      </div>
      <span
        className={`font-mono text-[11px] tabular-nums shrink-0 ${
          step.affordable ? "text-ok" : "text-muted"
        }`}
      >
        {step.cost}
        {step.hasUnknownCost ? "+?" : ""} ◆
      </span>
    </li>
  );
}
