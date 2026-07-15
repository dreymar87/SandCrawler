import { useState } from "react";
import { MAX_STANDARD_REBIRTH } from "../../constants";
import { SQUAD_DEFS } from "../../data/squads.seed";
import { formatPerSecond } from "../../lib/production";
import { ALL_CYCLES, cycleLabel } from "../../lib/rebirthCycles";
import { toast } from "../../lib/toast";
import { haptic } from "../../lib/native";
import {
  useActiveCycle,
  useNovaBalance,
  useProduction,
  useSquadCapacity,
  useSrbBonusAtCurrentRB,
} from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import type { RebirthCycle } from "../../types";
import { DataPanel } from "../Data/DataPanel";
import { Stepper } from "../common/Stepper";

/**
 * The Profile tab: the editable record of the player's base — name,
 * rebirth / super-rebirth levels, credits, chips, nova — plus the derived
 * squad capacity, production, and a Data & backup section.
 */
export function ProfilePanel() {
  const baseName = useAppStore((s) => s.profile.baseName ?? "");
  const upgradeChips = useAppStore((s) => s.profile.upgradeChips);
  const standardRebirth = useAppStore((s) => s.profile.standardRebirth);
  const superRebirthCount = useAppStore((s) => s.profile.superRebirthCount);
  const cycleOverride = useAppStore((s) => s.profile.cycleOverride);
  const novaEarned = useAppStore((s) => s.profile.novaEarned);
  const setBaseName = useAppStore((s) => s.setBaseName);
  const setUpgradeChips = useAppStore((s) => s.setUpgradeChips);
  const setStd = useAppStore((s) => s.setStandardRebirth);
  const setSrbCount = useAppStore((s) => s.setSuperRebirthCount);
  const setCycleOverride = useAppStore((s) => s.setCycleOverride);
  const setNovaEarned = useAppStore((s) => s.setNovaEarned);
  const credits = useAppStore((s) => s.profile.currentCredits);
  const setCredits = useAppStore((s) => s.setCreditsCurrent);
  const performSuperRebirth = useAppStore((s) => s.performSuperRebirth);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const setUiPref = useAppStore((s) => s.setUiPref);
  const hidePastRebirths = useAppStore((s) => s.ui.hidePastRebirths ?? false);
  const compactRebirths = useAppStore((s) => s.ui.compactRebirths ?? false);
  const hapticsEnabled = useAppStore((s) => s.ui.hapticsEnabled ?? true);

  const [confirmingSrb, setConfirmingSrb] = useState(false);

  const capacity = useSquadCapacity();
  const production = useProduction();
  const activeCycle = useActiveCycle();
  const nova = useNovaBalance();
  const srbBonus = useSrbBonusAtCurrentRB();

  const doSuperRebirth = () => {
    const result = performSuperRebirth();
    setConfirmingSrb(false);
    haptic("medium");
    if (result.crystalsAwarded > 0) {
      toast(`Super Rebirth #${result.newSrbCount} · +${result.crystalsAwarded} crystals`);
    } else {
      toast(`Super Rebirth #${result.newSrbCount}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Base identity */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">My base</h2>
        <label className="field-label" htmlFor="p-base-name">
          Base name (optional)
        </label>
        <input
          id="p-base-name"
          type="text"
          className="input mb-3"
          placeholder="e.g. Mos Eisley Depot"
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          maxLength={40}
        />
        <label className="field-label" htmlFor="p-chips">
          Upgrade chips
        </label>
        <Stepper
          id="p-chips"
          size="md"
          value={upgradeChips ?? 0}
          onChange={(n) => setUpgradeChips(n === 0 ? undefined : n)}
        />
        <p className="font-mono text-[10.5px] text-muted-alt mt-1.5">
          Track your chip stash to plan tier upgrades. Resets on Super Rebirth.
        </p>
      </section>

      {/* Current Standard Rebirth */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Standard Rebirth</h2>
        <Stepper
          size="md"
          value={standardRebirth}
          onChange={setStd}
          min={0}
          max={MAX_STANDARD_REBIRTH}
          ariaLabel="Standard Rebirth level"
        />
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={MAX_STANDARD_REBIRTH}
            value={standardRebirth}
            onChange={(e) => setStd(Number(e.target.value))}
            className="w-full accent-holo"
            aria-label="Standard Rebirth slider"
          />
          <p className="font-mono text-[10.5px] text-muted-alt mt-1.5">
            0 → {MAX_STANDARD_REBIRTH}. Next Unlock skips rebirths at or below this level.
          </p>
        </div>
      </section>

      {/* Super Rebirth + active cycle */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Super Rebirth &amp; cycle</h2>
        <label className="field-label" htmlFor="p-srb">
          Super Rebirths completed
        </label>
        <Stepper
          id="p-srb"
          size="md"
          value={superRebirthCount}
          onChange={setSrbCount}
        />
        <div className="mt-4">
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

        {/* "I Super Rebirthed" action — resets deployed roster + credits + chips, awards crystals. */}
        <div className="mt-4 pt-4 border-t border-line">
          {!confirmingSrb ? (
            <button
              type="button"
              onClick={() => setConfirmingSrb(true)}
              className="btn btn-ghost w-full border-holo/60 text-holo hover:bg-holo/10"
            >
              I Super Rebirthed
            </button>
          ) : (
            <div className="rounded-[10px] border border-holo/60 bg-holo/5 p-3">
              <p className="text-[12.5px] text-ink mb-2">
                Super Rebirth from <b className="text-holo">RB{standardRebirth}</b>?
              </p>
              <ul className="font-mono text-[10.5px] text-muted-alt space-y-0.5 mb-3">
                <li>
                  + {srbBonus?.crystals ?? 0} crystals{" "}
                  {srbBonus ? "" : "(no bonus below RB12)"}
                </li>
                <li>Working & Lounge counts reset to 0 (Droidex owned kept)</li>
                <li>Credits & upgrade chips reset to 0</li>
                <li>RB → 0, SRB count → {superRebirthCount + 1}</li>
              </ul>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingSrb(false)}
                  className="btn btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={doSuperRebirth}
                  className="btn btn-primary flex-1"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}
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
        <Stepper
          id="p-nova"
          size="md"
          value={novaEarned}
          onChange={setNovaEarned}
        />
        <p className="font-mono text-[10.5px] text-muted-alt mt-1.5">
          "Spent" is derived from your Nova Shop upgrade levels and ICONIC droid purchases.
        </p>
        {srbBonus ? (
          <div className="mt-3 pl-3 py-2 border-l-2 border-holo-dim bg-panel-alt rounded-r-md text-[12px] text-muted">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt">
              SRB at RB{standardRebirth}:
            </span>{" "}
            {srbBonus.crystals} crystals · {Math.round(srbBonus.creditMult * 100)}% credit mult ·{" "}
            {Math.round(srbBonus.xpMult * 100)}% XP mult
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

      {/* Preferences */}
      <section className="card p-4">
        <details>
          <summary className="font-display font-bold text-base cursor-pointer select-none">
            Preferences
          </summary>
          <div className="mt-3 space-y-3">
            <ToggleRow
              label="Hide past rebirths"
              hint="Skip rebirth rows below your current level"
              value={hidePastRebirths}
              onChange={(v) => setUiPref("hidePastRebirths", v)}
            />
            <ToggleRow
              label="Compact rebirths"
              hint="Denser rebirth list — hide credit bar & SRB hint"
              value={compactRebirths}
              onChange={(v) => setUiPref("compactRebirths", v)}
            />
            <ToggleRow
              label="Haptic feedback"
              hint="Vibrate on Droidex taps and other interactions"
              value={hapticsEnabled}
              onChange={(v) => setUiPref("hapticsEnabled", v)}
            />
            <div className="pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  resetOnboarding();
                  toast("Intro will reappear next launch.");
                }}
                className="btn btn-ghost btn-sm"
              >
                Reset onboarding
              </button>
              <p className="font-mono text-[10.5px] text-muted-alt mt-1.5">
                Shows the first-run intro again next time you open the app.
              </p>
            </div>
          </div>
        </details>
      </section>

      {/* Data & backup */}
      <section className="card p-4">
        <details>
          <summary className="font-display font-bold text-base cursor-pointer select-none">
            Data &amp; backup
          </summary>
          <div className="mt-3">
            <DataPanel />
          </div>
        </details>
      </section>

      {/* About */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-2">About</h2>
        <p className="text-[13px] text-muted leading-relaxed">
          SandCrawler is a fan-made companion for <b className="text-ink">Star Wars: Droid Tycoon</b>.
          It's unaffiliated with Lucasfilm, Epic Games, FOAD, or Blzn Studios. Rebirth, droid, and
          shop data are community-sourced — corrections welcome.
        </p>
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

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] text-ink">{label}</div>
        {hint ? (
          <div className="font-mono text-[10.5px] text-muted-alt mt-0.5 leading-tight">
            {hint}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
          value ? "bg-ok/70" : "bg-line-alt"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
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
