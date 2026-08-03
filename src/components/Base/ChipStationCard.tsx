import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CLASS_COLOR, TIERS } from "../../constants";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/useAppStore";
import { Autocomplete } from "../common/Autocomplete";
import { TierPill } from "../common/TierPill";
import type { ChipStationFill } from "../../lib/baseView";
import type { DroidDef, Tier } from "../../types";

/** Crystal cost of the Nova Shop unlock, shown in the locked state. */
const UNLOCK_COST = 120;

/**
 * Base-tab card for the Upgrade Chip Station — a Nova Shop unlock holding one
 * droid that generates upgrade CHIPS rather than credits.
 *
 * The community workbooks publish no chip rates, so the rate is entered by
 * hand and remembered per (droid, tier); the card derives the hourly figure,
 * which is also the storage cap.
 */
export function ChipStationCard({ station }: { station: ChipStationFill }) {
  const [assigning, setAssigning] = useState(false);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const clearChipStation = useAppStore((s) => s.clearChipStation);

  if (!station.unlocked) {
    return (
      <section className="card p-4">
        <Header />
        <div className="rounded-[10px] border border-dashed border-line bg-panel-alt/40 p-3 opacity-80">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-muted-alt">🔒 Not unlocked</span>
            <span className="flex-1" />
            <button
              type="button"
              className="font-mono text-[10px] uppercase tracking-wider text-holo underline"
              onClick={() => setActiveTab("shop")}
            >
              Nova Shop · {UNLOCK_COST} ◆ →
            </button>
          </div>
        </div>
      </section>
    );
  }

  const occ = station.occupant;
  return (
    <section className="card p-4">
      <Header />
      {occ ? (
        <OccupiedSlot station={station} onClear={clearChipStation} onSwap={() => setAssigning(true)} />
      ) : (
        <button
          type="button"
          onClick={() => setAssigning(true)}
          className="w-full rounded-[10px] border border-dashed border-line-alt hover:border-holo-dim bg-panel-alt/40 px-3 py-3 font-mono text-[11px] text-muted-alt hover:text-holo transition"
        >
          + Assign a droid
        </button>
      )}
      <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
        Makes upgrade chips, not credits. Storage caps at about an hour, and it doesn't run while
        you're offline — so collect at least hourly to avoid wasting output.
      </p>

      {assigning ? <AssignChipDroidModal onClose={() => setAssigning(false)} /> : null}
    </section>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="font-display font-bold text-base">Upgrade chip station</h2>
      <span className="flex-1" />
      <span className="font-mono text-[10px] text-muted-alt">one droid</span>
    </div>
  );
}

function OccupiedSlot({
  station,
  onClear,
  onSwap,
}: {
  station: ChipStationFill;
  onClear: () => void;
  onSwap: () => void;
}) {
  const occ = station.occupant!;
  const setChipRate = useAppStore((s) => s.setChipRate);
  // Local draft so a half-typed number doesn't fight the store on each keypress.
  const [draft, setDraft] = useState(station.perMin === null ? "" : String(station.perMin));
  useEffect(() => {
    setDraft(station.perMin === null ? "" : String(station.perMin));
  }, [station.perMin, occ.name, occ.tier]);

  const commit = (raw: string) => {
    const n = Number(raw.trim());
    setChipRate(occ.name, occ.tier, raw.trim() === "" || !Number.isFinite(n) ? null : n);
  };

  return (
    <div className="rounded-[10px] border border-line bg-panel-alt p-3">
      <div className="flex items-center gap-2">
        <span className={`flex-1 min-w-0 font-mono text-[12px] truncate ${CLASS_COLOR[occ.class]}`}>
          {occ.name}
        </span>
        <TierPill tier={occ.tier} />
        <button
          type="button"
          className="font-mono text-[10px] uppercase tracking-wider text-holo"
          onClick={onSwap}
        >
          Swap
        </button>
        <button
          type="button"
          className="font-mono text-[10px] uppercase tracking-wider text-muted-alt hover:text-danger"
          onClick={onClear}
        >
          Remove
        </button>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <label
          className="font-mono text-[10px] uppercase tracking-wider text-muted-alt"
          htmlFor="chip-rate"
        >
          Chips / min
        </label>
        <input
          id="chip-rate"
          type="text"
          inputMode="decimal"
          className="input w-20 text-right tabular-nums"
          value={draft}
          placeholder="—"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        <span className="flex-1" />
        {station.perHour !== null ? (
          <span className="font-mono text-[11px] tabular-nums text-holo">
            {station.perHour.toLocaleString()}
            <span className="text-muted-alt"> / hr</span>
          </span>
        ) : (
          <span className="font-mono text-[10px] text-muted-alt">enter the in-game rate</span>
        )}
      </div>
      {station.perHour !== null ? (
        <p className="font-mono text-[9.5px] text-muted-alt mt-1.5">
          That's also the ~1 h storage cap — {station.perHour.toLocaleString()} chips banked before
          it stops.
        </p>
      ) : null}
    </div>
  );
}

/** Droid + tier picker for the chip station's single slot. */
function AssignChipDroidModal({ onClose }: { onClose: () => void }) {
  const setChipStationDroid = useAppStore((s) => s.setChipStationDroid);
  const [raw, setRaw] = useState("");
  const [resolved, setResolved] = useState<DroidDef | null>(null);
  const [tier, setTier] = useState<Tier>("DEFAULT");

  const legalTiers = useMemo(
    () => (resolved ? TIERS.filter((t) => resolved.tiers.includes(t)) : [...TIERS]),
    [resolved],
  );
  const activeTier = legalTiers.includes(tier) ? tier : legalTiers[0]!;

  const doAssign = () => {
    if (!resolved) return;
    setChipStationDroid(resolved.canonical, activeTier);
    haptic("medium");
    toast(`${resolved.canonical} ${activeTier} → upgrade chip station`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Assign a droid to the upgrade chip station"
        className="relative w-full max-w-[440px] card p-5 m-3 view-enter"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="font-display font-bold text-lg">Assign a droid</h2>
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-alt">
            @ chip station
          </span>
          <span className="flex-1" />
          <button
            type="button"
            className="font-mono text-[10.5px] uppercase tracking-wider text-holo"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-1">
          Droid
        </div>
        <Autocomplete
          value={raw}
          onChange={(v, def) => {
            setRaw(v);
            setResolved(def);
          }}
          onSelect={(def) => {
            setResolved(def);
            if (!def.tiers.includes(tier)) setTier(def.tiers[0]!);
          }}
          placeholder="Search a droid…"
        />
        {raw.trim() && !resolved ? (
          <p className="font-mono text-[10px] text-warn mt-1">Pick a droid from the list.</p>
        ) : null}

        {resolved ? (
          <>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mt-4 mb-1.5">
              Tier
            </div>
            <div className="flex flex-wrap gap-1.5">
              {legalTiers.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={`rounded-md border px-1.5 py-1 transition ${
                    activeTier === t
                      ? "border-holo bg-holo/10"
                      : "border-line-alt hover:border-holo-dim"
                  }`}
                >
                  <TierPill tier={t} />
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-muted-alt mt-3">
              You'll enter this droid's chips/min on the card — the game doesn't publish a table,
              and the rate is remembered per droid and tier.
            </p>
          </>
        ) : null}

        <div className="flex gap-2.5 mt-5">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={!resolved}
            onClick={doAssign}
          >
            Assign
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
