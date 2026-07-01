import { formatPerSecond } from "../../lib/production";
import { cycleLabel } from "../../lib/rebirthCycles";
import { useHomeSummary, useNextUnlock } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { GapList } from "../NextUnlock/GapList";
import { ProgressBar } from "../common/ProgressBar";

/**
 * The Home dashboard — a read-only, at-a-glance view of where the player
 * is and what's next. Everything here is editable elsewhere; this screen
 * just surfaces it and links out.
 */
export function HomePanel() {
  const s = useHomeSummary();
  const { ready, near } = useNextUnlock(1);
  const setTab = useAppStore((s) => s.setActiveTab);
  const droidexPct = Math.round((s.completion.ownedCards / Math.max(1, s.completion.totalCards)) * 100);
  const nextRb = near[0];

  return (
    <div className="space-y-4">
      {/* Status hero */}
      <section className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-holo text-[#04222B] font-bold">
            {cycleLabel(s.cycle)}
          </span>
          {s.baseName ? (
            <span className="font-display font-semibold text-[15px] truncate">{s.baseName}</span>
          ) : (
            <button
              type="button"
              className="font-mono text-[11px] text-muted hover:text-ink"
              onClick={() => setTab("profile")}
            >
              + name your base
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <Metric n={s.standardRebirth} k="Rebirth" onClick={() => setTab("rebirths")} />
          <Metric n={s.superRebirthCount} k="Super Rebirths" onClick={() => setTab("profile")} />
          <Metric n={`${droidexPct}%`} k="Droidex" onClick={() => setTab("droidex")} />
        </div>
      </section>

      {/* Economy row */}
      <section className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setTab("profile")} className="card p-4 text-left">
          <div className="section-label mb-1.5">Production</div>
          <div className="font-display font-bold text-xl text-holo">
            {formatPerSecond(s.production.flat)}
          </div>
          <div className="font-mono text-[10px] text-muted-alt mt-1">
            {s.production.contributors} active card{s.production.contributors === 1 ? "" : "s"}
          </div>
        </button>
        <button type="button" onClick={() => setTab("shop")} className="card p-4 text-left">
          <div className="section-label mb-1.5">Nova Crystals</div>
          <div className="font-display font-bold text-xl text-holo">{s.nova.balance.toLocaleString()}</div>
          <div className="font-mono text-[10px] text-muted-alt mt-1">
            {s.nova.earned.toLocaleString()} earned · {s.nova.spent.toLocaleString()} spent
          </div>
        </button>
      </section>

      {/* Next unlock */}
      <section className="card p-4">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="font-display font-bold text-base">Next unlock</h2>
          <span className="flex-1" />
          <button
            type="button"
            className="font-mono text-[10.5px] text-holo hover:underline"
            onClick={() => setTab("rebirths")}
          >
            all rebirths →
          </button>
        </div>
        {ready.length > 0 ? (
          <div className="rounded-[10px] border border-ok/40 bg-ok/5 px-3 py-2.5 mb-2">
            <span className="font-display font-bold text-ok text-[14px]">
              Rebirth {ready[0]!.rb.level} is ready!
            </span>
            <span className="font-mono text-[10.5px] text-muted ml-2">
              {ready.length} ready now
            </span>
          </div>
        ) : null}
        {nextRb ? (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display font-bold text-[14px] text-sun">
                Rebirth {nextRb.rb.level}
              </span>
              <span className="flex-1" />
              <span className="font-display font-bold text-[14px] text-sun">{nextRb.rb.credits}</span>
            </div>
            <ProgressBar required={nextRb.rb.credits || "0"} current={s.currentCredits} />
            {nextRb.creditsOnly ? (
              <p className="text-sm text-muted mt-2">All droids covered — keep banking credits.</p>
            ) : (
              <GapList gaps={nextRb.gaps} />
            )}
          </div>
        ) : ready.length === 0 ? (
          <p className="text-muted text-sm">
            Set your current rebirth on the{" "}
            <button className="text-holo hover:underline" onClick={() => setTab("profile")}>
              Profile
            </button>{" "}
            tab to see what's next.
          </p>
        ) : null}
      </section>

      {/* Droidex progress */}
      <button type="button" onClick={() => setTab("droidex")} className="card p-4 text-left w-full block">
        <div className="flex items-baseline gap-2 mb-2">
          <h2 className="font-display font-bold text-base">Droidex</h2>
          <span className="font-mono text-[10.5px] text-muted">
            {s.completion.ownedCards} / {s.completion.totalCards} cards
          </span>
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-holo font-bold">{droidexPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-alt overflow-hidden">
          <div className="h-full bg-holo transition-all" style={{ width: `${droidexPct}%` }} />
        </div>
      </button>
    </div>
  );
}

function Metric({ n, k, onClick }: { n: number | string; k: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[10px] border border-line bg-panel-alt p-2.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo/60"
    >
      <div className="font-display font-bold text-2xl leading-none text-holo">{n}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-alt mt-1.5">{k}</div>
    </button>
  );
}
