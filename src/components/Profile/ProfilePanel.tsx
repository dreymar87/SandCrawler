import { MAX_STANDARD_REBIRTH } from "../../constants";
import { SQUAD_DEFS } from "../../data/squads.seed";
import { formatPerSecond } from "../../lib/production";
import { ALL_CYCLES, cycleLabel } from "../../lib/rebirthCycles";
import {
  useActiveCycle,
  useNovaBalance,
  useProduction,
  useSquadCapacity,
  useSrbBonusAtCurrentRB,
} from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import type { RebirthCycle } from "../../types";

/**
 * The Profile tab: tell the app where you currently are, and the app
 * answers with squad capacity, production, and Nova balance.
 */
export function ProfilePanel() {
  const standardRebirth = useAppStore((s) => s.profile.standardRebirth);
  const superRebirthCount = useAppStore((s) => s.profile.superRebirthCount);
  const cycleOverride = useAppStore((s) => s.profile.cycleOverride);
  const novaEarned = useAppStore((s) => s.profile.novaEarned);
  const setStd = useAppStore((s) => s.setStandardRebirth);
  const setSrbCount = useAppStore((s) => s.setSuperRebirthCount);
  const setCycleOverride = useAppStore((s) => s.setCycleOverride);
  const setNovaEarned = useAppStore((s) => s.setNovaEarned);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const setCredits = useAppStore((s) => s.setCreditsCurrent);

  const capacity = useSquadCapacity();
  const production = useProduction();
  const activeCycle = useActiveCycle();
  const nova = useNovaBalance();
  const srbBonus = useSrbBonusAtCurrentRB();

  return (
    <div className="space-y-4">
      {/* Current Standard Rebirth */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Standard Rebirth</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={MAX_STANDARD_REBIRTH}
            className="input w-28 text-center font-display font-bold text-xl"
            value={standardRebirth}
            onChange={(e) => setStd(Number(e.target.value) || 0)}
          />
          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={MAX_STANDARD_REBIRTH}
              value={standardRebirth}
              onChange={(e) => setStd(Number(e.target.value))}
              className="w-full accent-holo"
              aria-label="Standard Rebirth level"
            />
            <p className="font-mono text-[10.5px] text-muted-alt mt-1.5">
              0 → {MAX_STANDARD_REBIRTH}. Next Unlock skips rebirths at or below this level.
            </p>
          </div>
        </div>
      </section>

      {/* Super Rebirth + active cycle */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Super Rebirth &amp; cycle</h2>
        <div className="grid grid-cols-[1fr_2fr] gap-3 items-end">
          <div>
            <label className="field-label" htmlFor="p-srb">
              Super Rebirths completed
            </label>
            <input
              id="p-srb"
              type="number"
              min={0}
              className="input text-center font-display font-bold text-xl"
              value={superRebirthCount}
              onChange={(e) => setSrbCount(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <span className="field-label">Active cycle</span>
            <div className="grid grid-cols-5 gap-1.5">
              <CyclePill
                label="Auto"
                active={cycleOverride === null}
                onClick={() => setCycleOverride(null)}
              />
              {ALL_CYCLES.map((c) => (
                <CyclePill
                  key={c}
                  label={`RBC${c}`}
                  active={cycleOverride === c}
                  onClick={() => setCycleOverride(c as RebirthCycle)}
                />
              ))}
            </div>
            <p className="font-mono text-[10.5px] text-muted-alt mt-1.5">
              {cycleLabel(activeCycle)} → cycles loop every 4 Super Rebirths.
            </p>
          </div>
        </div>
      </section>

      {/* Current credits */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Current credits</h2>
        <input
          type="text"
          className="input"
          placeholder="e.g. 21B"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        <p className="font-mono text-[10.5px] text-muted-alt mt-1.5">
          Used by rebirth progress bars and Next Unlock scoring.
        </p>
      </section>

      {/* Nova Crystals balance */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Nova Crystals</h2>
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          <StatBlock n={nova.earned} k="Earned" />
          <StatBlock n={nova.spent} k="Spent" />
          <StatBlock n={nova.balance} k="Balance" highlight />
        </div>
        <label className="field-label" htmlFor="p-nova">
          Total earned (manual)
        </label>
        <input
          id="p-nova"
          type="number"
          min={0}
          className="input"
          value={novaEarned}
          onChange={(e) => setNovaEarned(Number(e.target.value) || 0)}
        />
        <p className="font-mono text-[10.5px] text-muted-alt mt-1.5">
          "Spent" is derived from your Nova Shop upgrade levels and ICONIC droid purchases.
        </p>
        {srbBonus ? (
          <div className="mt-3 pl-3 py-2 border-l-2 border-holo-dim bg-panel-alt rounded-r-md text-[12px] text-muted">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt">
              SRB at RB{standardRebirth}:
            </span>{" "}
            +{srbBonus.crystals} crystals · ×{(1 + srbBonus.creditMult).toFixed(2)} credits · ×
            {(1 + srbBonus.xpMult).toFixed(1)} XP
          </div>
        ) : (
          <p className="font-mono text-[10.5px] text-muted-alt mt-2">
            Super Rebirth bonuses start at RB12. Currently at RB{standardRebirth}.
          </p>
        )}
      </section>

      {/* Production calculator */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Production</h2>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-display font-bold text-2xl text-holo">
            {formatPerSecond(production.flat)}
          </span>
          <span className="font-mono text-[10.5px] text-muted">
            from {production.contributors} active card{production.contributors === 1 ? "" : "s"}
          </span>
        </div>
        {production.percentLabels.length > 0 ? (
          <p className="font-mono text-[11px] text-sun">
            + {production.percentLabels.join(" + ")} booster
            {production.percentLabels.length === 1 ? "" : "s"} (multiplicative)
          </p>
        ) : null}
        {production.contributors === 0 ? (
          <p className="text-muted text-[13px]">
            Mark some cards Active on the Droidex tab to track your base's output.
          </p>
        ) : null}
      </section>

      {/* Squad capacity */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Squads &amp; slots</h2>
        <div className="space-y-2.5">
          {capacity.map((c) => {
            const def = SQUAD_DEFS[c.type];
            const max = def.baseSlots + def.unlocks.length;
            return (
              <div
                key={c.type}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-panel-alt border border-line"
              >
                <div className="flex-1 min-w-0">
                  <div className={`font-display font-semibold text-[14px] ${def.accent}`}>
                    {def.label}
                  </div>
                  <div className="font-mono text-[10px] text-muted-alt">
                    {def.description}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-lg">
                    {c.current}
                    <span className="text-muted-alt text-[12px] ml-1">/ {max}</span>
                  </div>
                  <div className="font-mono text-[10px] text-muted">
                    {c.next === null ? "max reached" : `next at RB${c.next}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CyclePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono text-[10.5px] uppercase tracking-wider px-2 py-2 rounded-md border ${
        active ? "border-holo text-holo bg-holo/10" : "border-line-alt text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function StatBlock({ n, k, highlight }: { n: number; k: string; highlight?: boolean }) {
  return (
    <div className="rounded-[10px] border border-line bg-panel-alt p-2.5 text-center">
      <div className={`font-display font-bold text-xl ${highlight ? "text-holo" : "text-ink"}`}>
        {n.toLocaleString()}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-alt mt-1">{k}</div>
    </div>
  );
}
