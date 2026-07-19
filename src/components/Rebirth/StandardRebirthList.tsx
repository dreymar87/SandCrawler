import { useState } from "react";
import { SUPER_REBIRTH_BONUSES } from "../../data/superRebirthBonuses.seed";
import { useStandardRebirths, useStandardReadiness, useActiveCycle, useNextUnlock } from "../../store/selectors";
import { srbBonusAt } from "../../lib/novaCrystals";
import { cycleLabel } from "../../lib/rebirthCycles";
import { useAppStore } from "../../store/useAppStore";
import { GapList } from "../NextUnlock/GapList";
import { ProgressBar } from "../common/ProgressBar";
import { CycleStrategySection } from "./CycleStrategySection";
import { RebirthDetailModal } from "./RebirthDetailModal";
import type { StandardRebirth } from "../../types";

/**
 * The Rebirths tab: a compact grid of the active cycle's rebirth levels.
 * Tapping a level opens a detail window (RebirthDetailModal). The active
 * cycle derives from the player's Super Rebirth count (or a manual override
 * set on the Profile tab).
 */
export function StandardRebirthList() {
  const fullList = useStandardRebirths();
  const ready = useStandardReadiness();
  const cycle = useActiveCycle();
  const cards = useAppStore((s) => s.cards);
  const credits = useAppStore((s) => s.profile.currentCredits);
  const setCredits = useAppStore((s) => s.setCreditsCurrent);
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);
  const hidePastRebirths = useAppStore((s) => s.ui.hidePastRebirths ?? false);
  const setUiPref = useAppStore((s) => s.setUiPref);

  const [openLevel, setOpenLevel] = useState<number | null>(null);

  // Optionally hide RBs strictly below the current level (keeps current).
  const list = hidePastRebirths
    ? fullList.filter((rb) => rb.level >= currentLevel)
    : fullList;
  const hiddenCount = fullList.length - list.length;

  // Resolve the open level + its neighbours (for prev/next).
  const openIdx = openLevel != null ? list.findIndex((r) => r.level === openLevel) : -1;
  const openRb = openIdx >= 0 ? list[openIdx]! : null;
  const prevRb = openIdx > 0 ? list[openIdx - 1] : undefined;
  const nextRb = openIdx >= 0 && openIdx < list.length - 1 ? list[openIdx + 1] : undefined;

  return (
    <div>
      <section className="card mb-4 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-display font-bold text-base">Rebirth Plan</span>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-holo text-[#04222B] font-bold">
            {cycleLabel(cycle)}
          </span>
        </div>
        <div className="section-label mb-2">Current credits</div>
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
        <p className="font-mono text-[10px] text-muted-alt mt-1.5">
          Switch cycles or Super Rebirth count on the Profile tab.
        </p>
      </section>

      <ClosestSection credits={credits} />

      <CycleStrategySection />

      {hidePastRebirths && hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setUiPref("hidePastRebirths", false)}
          className="w-full text-left mb-3 px-3 py-2 rounded-md border border-line-alt bg-panel-alt/40 font-mono text-[10.5px] text-muted hover:text-ink hover:border-holo/50 transition"
        >
          <span className="text-muted-alt uppercase tracking-wider mr-1">Hidden</span>
          {hiddenCount} past rebirth{hiddenCount === 1 ? "" : "s"} — tap to show
        </button>
      ) : null}

      {list.length === 0 ? (
        <EmptyState />
      ) : (
        <RebirthGrid list={list} ready={ready} currentLevel={currentLevel} onOpen={setOpenLevel} />
      )}

      <SrbBonusesSection currentLevel={currentLevel} />

      {openRb ? (
        <RebirthDetailModal
          rb={openRb}
          cards={cards}
          credits={credits}
          isReady={ready.get(openRb.level) ?? false}
          isCurrent={openRb.level === currentLevel}
          onClose={() => setOpenLevel(null)}
          onPrev={prevRb ? () => setOpenLevel(prevRb.level) : undefined}
          onNext={nextRb ? () => setOpenLevel(nextRb.level) : undefined}
        />
      ) : null}
    </div>
  );
}

/** Compact grid of the cycle's rebirth levels — tap a chip to open its detail. */
function RebirthGrid({
  list,
  ready,
  currentLevel,
  onOpen,
}: {
  list: StandardRebirth[];
  ready: Map<number, boolean>;
  currentLevel: number;
  onOpen: (level: number) => void;
}) {
  return (
    <section className="card p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display font-bold text-base">Rebirth levels</h2>
        <span className="flex-1" />
        <span className="font-mono text-[9px] uppercase tracking-wider flex items-center gap-2.5">
          <span className="text-ok">ready</span>
          <span className="text-holo">here</span>
          <span className="text-muted-alt">past</span>
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {list.map((rb) => {
          const isReady = ready.get(rb.level) ?? false;
          const isCurrent = rb.level === currentLevel;
          const isPast = rb.level < currentLevel;
          const hasSrb = !!srbBonusAt(rb.level);
          const state = isCurrent ? "current" : isReady ? "ready" : isPast ? "past" : "upcoming";
          const cls = isCurrent
            ? "border-holo bg-holo/10 text-holo ring-2 ring-holo/40"
            : isReady
              ? "border-ok bg-ok/10 text-ok"
              : isPast
                ? "border-line text-muted opacity-60"
                : "border-line-alt text-sun";
          return (
            <button
              key={`${rb.cycle}-${rb.level}`}
              type="button"
              onClick={() => onOpen(rb.level)}
              aria-label={`Rebirth ${rb.level} — ${state}`}
              title={`Rebirth ${rb.level}${rb.credits ? ` · ${rb.credits}` : ""} — ${state}`}
              className={`relative aspect-square rounded-md border-2 grid place-items-center font-display font-bold text-[15px] transition hover:border-holo/60 ${cls}`}
            >
              {rb.level}
              {hasSrb ? (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sun" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
        Tap a level for its droid requirements, credit cost, sell guidance, and Super Rebirth bonus.
        <span className="text-sun"> ●</span> marks levels with a Super Rebirth bonus (RB12+).
      </p>
    </section>
  );
}

/**
 * Full RB12–27 Super Rebirth bonus table, collapsible. Highlights the row
 * for your current RB so you can compare "SR here vs one more" at a glance.
 */
function SrbBonusesSection({ currentLevel }: { currentLevel: number }) {
  return (
    <section className="card p-0 mt-6">
      <details className="group">
        <summary className="cursor-pointer select-none px-4 py-3 flex items-baseline gap-2 list-none">
          <span className="font-display font-bold text-base">Super Rebirth bonuses</span>
          <span className="font-mono text-[10.5px] text-muted-alt">RB12 – RB27</span>
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-holo group-open:hidden">show</span>
          <span className="font-mono text-[10.5px] text-holo hidden group-open:inline">hide</span>
        </summary>
        <div className="px-4 pb-4">
          <p className="font-mono text-[10.5px] text-muted-alt mb-3">
            One-time bonus earned when you Super Rebirth at that RB level. Values match the
            community sheet's "NOVA CRYSTALS / RB LEVEL" table.
          </p>
          <div className="rounded-[10px] border border-line overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-panel-alt font-mono text-[10px] uppercase tracking-wider text-muted-alt">
                  <th className="text-left px-3 py-2">RB</th>
                  <th className="text-right px-2 py-2">Crystals</th>
                  <th className="text-right px-2 py-2">Credit Mult</th>
                  <th className="text-right px-3 py-2">XP Mult</th>
                </tr>
              </thead>
              <tbody>
                {SUPER_REBIRTH_BONUSES.map((b) => {
                  const isCurrent = b.rbLevel === currentLevel;
                  return (
                    <tr
                      key={b.rbLevel}
                      className={`border-t border-line ${isCurrent ? "bg-holo/10 text-holo" : ""}`}
                    >
                      <td className="px-3 py-1.5 font-display font-bold">RB{b.rbLevel}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{b.crystals}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {Math.round(b.creditMult * 100)}%
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        {Math.round(b.xpMult * 100)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {currentLevel >= 12 && currentLevel <= 27 ? (
            <p className="font-mono text-[10.5px] text-holo mt-2">
              You're at RB{currentLevel} — highlighted row above.
            </p>
          ) : (
            <p className="font-mono text-[10.5px] text-muted-alt mt-2">
              Set your current RB on the Profile tab to highlight it here.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}

/** "Closest to ready" — the folded-in Next Unlock, scoped to this cycle. */
function ClosestSection({ credits }: { credits: string }) {
  const { ready, near } = useNextUnlock(3);
  if (ready.length === 0 && near.length === 0) return null;
  return (
    <section className="card p-4 mb-4 border-holo-dim/50">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="font-display font-bold text-base">Closest to ready</h2>
        {ready.length > 0 ? (
          <span className="font-mono text-[10px] text-ok font-bold">{ready.length} ready now</span>
        ) : null}
      </div>
      {ready.slice(0, 2).map((s) => (
        <div
          key={`r-${s.rb.level}`}
          className="rounded-[10px] border border-ok/40 bg-ok/5 px-3 py-2 mb-2 flex items-center gap-2"
        >
          <span className="font-display font-bold text-ok text-[14px]">Rebirth {s.rb.level}</span>
          <span className="font-mono text-[10px] text-muted">ready</span>
          <span className="flex-1" />
          <span className="font-display font-bold text-[14px] text-sun">{s.rb.credits}</span>
        </div>
      ))}
      {near.slice(0, 2).map((s) => (
        <div key={`n-${s.rb.level}`} className="mb-3 last:mb-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-bold text-[14px] text-sun">Rebirth {s.rb.level}</span>
            <span className="flex-1" />
            <span className="font-display font-bold text-[13px] text-sun">{s.rb.credits}</span>
          </div>
          <ProgressBar required={s.rb.credits || "0"} current={credits} />
          {s.creditsOnly ? (
            <p className="text-[12px] text-muted mt-1.5">All droids covered — bank credits.</p>
          ) : (
            <GapList gaps={s.gaps} />
          )}
        </div>
      ))}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="text-center px-5 py-10 rounded-2xl border border-dashed border-line-alt text-muted">
      <p>No rebirth data for this cycle.</p>
    </div>
  );
}
