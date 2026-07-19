import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatPerSecond } from "../../lib/production";
import { cycleLabel } from "../../lib/rebirthCycles";
import { formatCredits, parseCredits } from "../../lib/credits";
import { normalizeName } from "../../lib/normalize";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useBaseView, useHomeSummary } from "../../store/selectors";
import { useAppStore, type Slot } from "../../store/useAppStore";
import { Stepper } from "../common/Stepper";
import { TierPill } from "../common/TierPill";
import { SearchInput } from "../common/SearchInput";
import { DroidActionMenu } from "./DroidActionMenu";
import { AddToBaseModal } from "./AddToBaseModal";
import { ActiveBonuses } from "./ActiveBonuses";
import type { CompanionSlot, DeployedDroid, LoungeFill, SellCandidate, SquadFill } from "../../lib/baseView";

type OpenMenu = { droid: DeployedDroid; slot: Slot };
type SellConfirm = { mode: "one"; candidate: SellCandidate } | { mode: "all" };

const matches = (name: string, q: string) => !q || normalizeName(name).includes(normalizeName(q));

/**
 * The Base tab — headline stats up top, then active bonuses, the deployed
 * roster (tap a droid to act on it), and a safe-to-sell list. A search
 * box filters the roster + sell list by name.
 */
export function BasePanel() {
  const s = useHomeSummary();
  const base = useBaseView();
  const setTab = useAppStore((s) => s.setActiveTab);
  const setLoungeCreditSlots = useAppStore((st) => st.setLoungeCreditSlots);
  const setCardCounts = useAppStore((st) => st.setCardCounts);
  const droidexPct = Math.round(
    (s.completion.ownedCards / Math.max(1, s.completion.totalCards)) * 100,
  );

  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);
  const [sellConfirm, setSellConfirm] = useState<SellConfirm | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Apply the search to the roster + sell list.
  const filteredSquads = useMemo(
    () => base.squads.map((sq) => ({ ...sq, droids: sq.droids.filter((d) => matches(d.name, search)) })),
    [base.squads, search],
  );
  const filteredLounge = useMemo(
    () => ({ ...base.lounge, droids: base.lounge.droids.filter((d) => matches(d.name, search)) }),
    [base.lounge, search],
  );
  const filteredCompanion = useMemo(
    () => ({ ...base.companion, droids: base.companion.droids.filter((d) => matches(d.name, search)) }),
    [base.companion, search],
  );
  const filteredSell = useMemo(
    () => base.sellCandidates.filter((c) => matches(c.name, search)),
    [base.sellCandidates, search],
  );

  const sellCard = (c: SellCandidate) => {
    setCardCounts(c.name, c.tier, { working: 0, lounge: 0, companion: 0 });
  };
  const confirmSell = () => {
    if (!sellConfirm) return;
    if (sellConfirm.mode === "one") {
      sellCard(sellConfirm.candidate);
      toast(`${sellConfirm.candidate.name} removed from base`);
    } else {
      const n = base.sellCandidates.length;
      base.sellCandidates.forEach(sellCard);
      toast(`Removed ${n} droid${n === 1 ? "" : "s"} from base`);
    }
    haptic("medium");
    setSellConfirm(null);
  };

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

      {/* Active bonuses */}
      <ActiveBonuses />

      {/* Search */}
      <SearchInput value={search} onChange={setSearch} placeholder="Find a droid on your base…" />

      {/* My base — squad fill; tap a droid to act on it */}
      <section className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display font-bold text-base">My base</h2>
          <span className="flex-1" />
          <button
            type="button"
            className="font-mono text-[10px] uppercase tracking-wider text-holo border border-holo/50 rounded-md px-2 py-1 hover:bg-holo/10"
            onClick={() => setShowAdd(true)}
          >
            + Add
          </button>
        </div>
        <div className="space-y-2.5">
          {filteredSquads.map((sq) => (
            <SquadFillCard
              key={sq.type}
              squad={sq}
              onOpenDroid={(d) => setOpenMenu({ droid: d, slot: "working" })}
            />
          ))}
          <LoungeCard
            lounge={filteredLounge}
            onSetCredit={setLoungeCreditSlots}
            onOpenDroid={(d) => setOpenMenu({ droid: d, slot: "lounge" })}
          />
          <CompanionCard
            companion={filteredCompanion}
            onOpenDroid={(d) => setOpenMenu({ droid: d, slot: "companion" })}
          />
        </div>
        <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
          Tap a droid to upgrade it, move it between slots, or remove it. Counts come from the
          working / lounge / companion numbers on the Droidex.
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
            <button
              type="button"
              className="font-mono text-[10px] uppercase tracking-wider text-danger border border-danger/40 rounded-md px-2 py-1 hover:bg-danger/10"
              onClick={() => setSellConfirm({ mode: "all" })}
            >
              Sell all · {base.sellTotal}
            </button>
          ) : null}
        </div>
        {filteredSell.length === 0 ? (
          <p className="text-muted text-[13px]">
            {base.sellCandidates.length === 0
              ? "Nothing deployed is safe to sell — every droid you have working or in the lounge is still needed later this cycle."
              : "No matches for your search."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filteredSell.map((c) => (
              <SellRow
                key={`${c.name}-${c.tier}`}
                candidate={c}
                onSell={() => setSellConfirm({ mode: "one", candidate: c })}
              />
            ))}
          </ul>
        )}
        <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
          Deployed droids (working or lounge) that no rebirth above RB{s.standardRebirth} in{" "}
          {cycleLabel(s.cycle)} needs. Selling frees the slot; the droid stays in your Droidex.
          ICONIC event droids are never listed.
        </p>
      </section>

      {showAdd ? <AddToBaseModal onClose={() => setShowAdd(false)} /> : null}

      {openMenu ? (
        <DroidActionMenu
          droid={openMenu.droid}
          slot={openMenu.slot}
          onClose={() => setOpenMenu(null)}
        />
      ) : null}

      {sellConfirm ? (
        <SellConfirmDialog
          confirm={sellConfirm}
          count={base.sellCandidates.length}
          total={base.sellTotal}
          onCancel={() => setSellConfirm(null)}
          onConfirm={confirmSell}
        />
      ) : null}
    </div>
  );
}

function SquadFillCard({
  squad,
  onOpenDroid,
}: {
  squad: SquadFill;
  onOpenDroid: (d: DeployedDroid) => void;
}) {
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
      <DroidChips droids={squad.droids} empty="No droids deployed here." onDroid={onOpenDroid} />
    </div>
  );
}

function LoungeCard({
  lounge,
  onSetCredit,
  onOpenDroid,
}: {
  lounge: LoungeFill;
  onSetCredit: (n: number) => void;
  onOpenDroid: (d: DeployedDroid) => void;
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

      <DroidChips droids={lounge.droids} empty="No droids parked in the lounge." onDroid={onOpenDroid} />
    </div>
  );
}

function CompanionCard({
  companion,
  onOpenDroid,
}: {
  companion: CompanionSlot;
  onOpenDroid: (d: DeployedDroid) => void;
}) {
  const over = companion.deployed > 1;
  return (
    <div className="rounded-[10px] border border-line bg-panel-alt p-3">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-display font-semibold text-[14px] text-tier-galactic">Companion</span>
        <span className="flex-1" />
        <span className="font-display font-bold text-[14px]">
          {Math.min(1, companion.deployed)}
          <span className="text-muted-alt text-[11px] ml-1">/ 1</span>
        </span>
      </div>
      {companion.droids.length === 0 ? (
        <p className="font-mono text-[10px] text-muted-alt italic">
          No companion set. Pick one in the Droidex to apply its buff.
        </p>
      ) : (
        <>
          <DroidChips droids={companion.droids} empty="" onDroid={onOpenDroid} />
          {companion.bonus ? (
            <p className="font-mono text-[10.5px] text-tier-galactic mt-2">{companion.bonus}</p>
          ) : null}
          {over ? (
            <p className="font-mono text-[10px] text-danger mt-1">
              Only one companion can be active — pick a single droid.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function DroidChips({
  droids,
  empty,
  onDroid,
}: {
  droids: DeployedDroid[];
  empty: string;
  onDroid: (d: DeployedDroid) => void;
}) {
  if (droids.length === 0) {
    return empty ? <p className="font-mono text-[10px] text-muted-alt italic">{empty}</p> : null;
  }
  // Aligned rows (name column · tier · count) so names line up uniformly
  // instead of the ragged content-width chips.
  return (
    <ul className="rounded-md border border-line bg-bg-alt/40 divide-y divide-line/60 overflow-hidden">
      {droids.map((d) => (
        <li key={`${d.name}-${d.tier}`}>
          <button
            type="button"
            onClick={() => onDroid(d)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-holo/5 transition"
          >
            <span className="flex-1 min-w-0 font-mono text-[11px] truncate">{d.name}</span>
            <TierPill tier={d.tier} />
            <span className="w-8 shrink-0 text-right font-mono text-[10px] text-holo font-bold tabular-nums">
              {d.count > 1 ? `×${d.count}` : ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SellRow({ candidate, onSell }: { candidate: SellCandidate; onSell: () => void }) {
  return (
    <li className="flex items-center gap-2.5 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-semibold text-[13.5px] truncate">{candidate.name}</span>
          {candidate.count > 1 ? (
            <span className="font-mono text-[10px] text-holo font-bold">×{candidate.count}</span>
          ) : null}
          <span className="font-mono text-[9px] uppercase tracking-wide text-muted-alt">
            {candidate.rarity}
          </span>
        </div>
      </div>
      <TierPill tier={candidate.tier} />
      <span className="font-mono text-[11.5px] text-sun tabular-nums w-16 text-right">
        {candidate.value ?? "—"}
      </span>
      <button
        type="button"
        className="font-mono text-[10px] uppercase tracking-wider text-danger border border-danger/40 rounded-md px-2 py-1 hover:bg-danger/10"
        onClick={onSell}
      >
        Sell
      </button>
    </li>
  );
}

function SellConfirmDialog({
  confirm,
  count,
  total,
  onCancel,
  onConfirm,
}: {
  confirm: SellConfirm;
  count: number;
  total: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isAll = confirm.mode === "all";
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm sell"
        className="relative w-full max-w-[400px] card p-5 m-3 view-enter"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <h2 className="font-display font-bold text-lg mb-2">
          {isAll ? "Sell all safe droids?" : `Sell ${confirm.candidate.name}?`}
        </h2>
        <p className="text-[13px] text-muted mb-4">
          {isAll ? (
            <>
              Removes <b className="text-ink">{count}</b> droid{count === 1 ? "" : "s"} from your base
              (≈ <span className="text-sun">{total}</span> recovered). They stay in your Droidex —
              only the base slots free up.
            </>
          ) : (
            <>
              Removes {confirm.candidate.count > 1 ? `all ×${confirm.candidate.count} ` : "it "}
              from your base
              {confirm.candidate.value ? (
                <>
                  {" "}(≈{" "}
                  <span className="text-sun">
                    {formatCredits(parseCredits(confirm.candidate.value) * BigInt(confirm.candidate.count))}
                  </span>{" "}
                  recovered)
                </>
              ) : null}
              . It stays in your Droidex — only the slot frees up.
            </>
          )}
        </p>
        <div className="flex gap-2.5">
          <button type="button" className="btn btn-ghost flex-1" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn flex-1 border-danger/50 text-danger hover:bg-danger/10"
            onClick={onConfirm}
          >
            {isAll ? "Sell all" : "Sell"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
