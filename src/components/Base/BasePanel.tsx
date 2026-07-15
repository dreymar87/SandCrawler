import { formatPerSecond } from "../../lib/production";
import { cycleLabel } from "../../lib/rebirthCycles";
import { useBaseView, useHomeSummary } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { Stepper } from "../common/Stepper";
import { TierPill } from "../common/TierPill";
import type { DeployedDroid, LoungeFill, SellCandidate, SquadFill } from "../../lib/baseView";

/**
 * The Base tab — replaces Home. Folds Home's headline stats (rebirth,
 * production, crystals) into the top, then shows what's deployed by squad
 * and what's safe to sell this cycle.
 */
export function BasePanel() {
  const s = useHomeSummary();
  const base = useBaseView();
  const setTab = useAppStore((s) => s.setActiveTab);
  const setLoungeCreditSlots = useAppStore((st) => st.setLoungeCreditSlots);
  const droidexPct = Math.round(
    (s.completion.ownedCards / Math.max(1, s.completion.totalCards)) * 100,
  );

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
            {s.production.contributors} working card{s.production.contributors === 1 ? "" : "s"}
          </div>
        </button>
        <button type="button" onClick={() => setTab("shop")} className="card p-4 text-left">
          <div className="section-label mb-1.5">Nova Crystals</div>
          <div className="font-display font-bold text-xl text-holo">
            {s.nova.balance.toLocaleString()}
          </div>
          <div className="font-mono text-[10px] text-muted-alt mt-1">
            {s.nova.earned.toLocaleString()} earned · {s.nova.spent.toLocaleString()} spent
          </div>
        </button>
      </section>

      {/* My base — squad fill */}
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">My base</h2>
        <div className="space-y-2.5">
          {base.squads.map((sq) => (
            <SquadFillCard key={sq.type} squad={sq} />
          ))}
          <LoungeCard lounge={base.lounge} onSetCredit={setLoungeCreditSlots} />
        </div>
        <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
          Deployed counts come from the working / lounge numbers you set on the Droidex.
          Companion droids aren't tracked yet.
        </p>
      </section>

      {/* Safe to sell */}
      <section className="card p-4">
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="font-display font-bold text-base">Safe to sell</h2>
          <span className="font-mono text-[10.5px] text-muted-alt">
            {base.sellCandidates.length} droid{base.sellCandidates.length === 1 ? "" : "s"}
          </span>
          <span className="flex-1" />
          {base.sellCandidates.length > 0 ? (
            <span className="font-mono text-[10.5px] text-sun">≈ {base.sellTotal}</span>
          ) : null}
        </div>
        {base.sellCandidates.length === 0 ? (
          <p className="text-muted text-[13px]">
            Nothing owned is safe to sell yet — every droid you own is still needed later this
            cycle, or you haven't marked any as owned.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {base.sellCandidates.map((c) => (
              <SellRow key={`${c.name}-${c.tier}`} candidate={c} />
            ))}
          </ul>
        )}
        <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
          These droids appear in no rebirth above RB{s.standardRebirth} in {cycleLabel(s.cycle)}.
          Mirrors the Droidex SELL filter.
        </p>
      </section>
    </div>
  );
}

function SquadFillCard({ squad }: { squad: SquadFill }) {
  const pct = squad.capacity > 0 ? Math.min(100, (squad.deployed / squad.capacity) * 100) : 0;
  const over = squad.deployed > squad.capacity;
  return (
    <div className="rounded-[10px] border border-line bg-panel-alt p-3">
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`font-display font-semibold text-[14px] ${squad.accent}`}>
          {squad.label}
        </span>
        <span className="flex-1" />
        <span className="font-display font-bold text-[14px]">
          {squad.deployed}
          <span className="text-muted-alt text-[11px] ml-1">/ {squad.capacity}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-alt overflow-hidden mb-2">
        <div
          className={`h-full transition-all ${over ? "bg-danger" : "bg-holo"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <DroidChips droids={squad.droids} empty="No droids deployed here." />
    </div>
  );
}

function LoungeCard({
  lounge,
  onSetCredit,
}: {
  lounge: LoungeFill;
  onSetCredit: (n: number) => void;
}) {
  const pct = lounge.capacity > 0 ? Math.min(100, (lounge.deployed / lounge.capacity) * 100) : 0;
  const over = lounge.deployed > lounge.capacity;
  return (
    <div className="rounded-[10px] border border-line bg-panel-alt p-3">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-display font-semibold text-[14px] text-sun">Lounge</span>
        <span className="flex-1" />
        <span className="font-display font-bold text-[14px]">
          {lounge.deployed}
          <span className="text-muted-alt text-[11px] ml-1">/ {lounge.capacity}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-alt overflow-hidden mb-3">
        <div
          className={`h-full transition-all ${over ? "bg-danger" : "bg-sun"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center gap-3 mb-1.5">
        <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-alt flex-1">
          Credit slots
        </span>
        <Stepper
          value={lounge.creditSlots}
          onChange={onSetCredit}
          min={0}
          max={lounge.maxCreditSlots}
          ariaLabel="Lounge credit slots"
        />
      </div>
      <p className="font-mono text-[10px] text-muted-alt leading-snug mb-2">
        Base + rebirth unlocks (max {lounge.maxCreditSlots}). Resets on Super Rebirth.
        {" + "}
        <span className="text-holo-dim">{lounge.novaSlots} from Nova shop</span>
        {lounge.nextUnlock !== null ? ` · next unlock at RB${lounge.nextUnlock}` : ""}
      </p>

      <DroidChips droids={lounge.droids} empty="No droids parked in the lounge." />
    </div>
  );
}

function DroidChips({ droids, empty }: { droids: DeployedDroid[]; empty: string }) {
  if (droids.length === 0) {
    return <p className="font-mono text-[10px] text-muted-alt italic">{empty}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {droids.map((d) => (
        <span
          key={`${d.name}-${d.tier}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-alt px-2 py-1"
        >
          <span className="font-mono text-[10.5px] truncate max-w-[8rem]">{d.name}</span>
          <TierPill tier={d.tier} />
          {d.count > 1 ? (
            <span className="font-mono text-[10px] text-holo font-bold">×{d.count}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function SellRow({ candidate }: { candidate: SellCandidate }) {
  return (
    <li className="flex items-center gap-2.5 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-semibold text-[13.5px] truncate">{candidate.name}</span>
          <span className="font-mono text-[9px] uppercase tracking-wide text-muted-alt">
            {candidate.rarity}
          </span>
        </div>
      </div>
      <TierPill tier={candidate.tier} />
      <span className="font-mono text-[11.5px] text-sun tabular-nums w-16 text-right">
        {candidate.value ?? "—"}
      </span>
    </li>
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
