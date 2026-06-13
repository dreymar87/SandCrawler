import { MAX_STANDARD_REBIRTH } from "../../constants";
import { SQUAD_DEFS } from "../../data/squads.seed";
import { formatPerSecond } from "../../lib/production";
import { useProduction, useSquadCapacity } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

/**
 * The Profile tab: where the player tells the app where they currently
 * are, and the app shows what that unlocks (squad capacity) and how much
 * they're earning (production).
 */
export function ProfilePanel() {
  const standardRebirth = useAppStore((s) => s.profile.standardRebirth);
  const superMarker = useAppStore((s) => s.profile.superRebirth);
  const setStd = useAppStore((s) => s.setStandardRebirth);
  const setSuperMarker = useAppStore((s) => s.setSuperRebirthMarker);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const setCredits = useAppStore((s) => s.setCreditsCurrent);

  const capacity = useSquadCapacity();
  const production = useProduction();

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
              0 → {MAX_STANDARD_REBIRTH}. Next Unlock will hide rebirths at or below this level.
            </p>
          </div>
        </div>
      </section>

      {/* Current Super Rebirth */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Super Rebirth</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label" htmlFor="p-sr-level">
              Level
            </label>
            <input
              id="p-sr-level"
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="e.g. 2"
              value={superMarker.level}
              onChange={(e) => setSuperMarker(e.target.value, superMarker.rank)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="p-sr-rank">
              Rank
            </label>
            <input
              id="p-sr-rank"
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="e.g. 1"
              value={superMarker.rank}
              onChange={(e) => setSuperMarker(superMarker.level, e.target.value)}
            />
          </div>
        </div>
        <p className="font-mono text-[10.5px] text-muted-alt mt-2">
          Super Rebirth requirements aren't publicly documented — log them as you encounter them on
          the Super tab.
        </p>
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
          Used by Standard Rebirth progress bars and Next Unlock scoring.
        </p>
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
            Mark some cards Active on the Droidex tab to start tracking your base's output.
          </p>
        ) : null}
      </section>

      {/* Squad slot capacity */}
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
