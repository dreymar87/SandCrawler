import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { TIERS } from "../../constants";
import { craftTimeFor } from "../../lib/droidStats";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/useAppStore";
import { Autocomplete } from "../common/Autocomplete";
import { TierPill } from "../common/TierPill";
import type { DroidDef, StationType, Tier } from "../../types";

const STATION_LABEL: Record<StationType, string> = {
  WORKER: "Worker",
  ASTROMECH: "Astromech",
  BATTLE: "Battle",
};

/**
 * "Start a craft" wizard: pick a droid + tier for a specific station. The
 * station is fixed (passed in) — a station is a single slot, and this modal
 * only opens when that slot is empty. Class-matching droids get a bonus
 * hint. Portaled to <body> so the fixed overlay escapes any transformed
 * ancestor.
 */
export function StartCraftModal({
  station,
  onClose,
}: {
  station: StationType;
  onClose: () => void;
}) {
  const startCraft = useAppStore((s) => s.startCraft);
  const [raw, setRaw] = useState("");
  const [resolved, setResolved] = useState<DroidDef | null>(null);
  const [tier, setTier] = useState<Tier>("DEFAULT");

  const legalTiers = useMemo(
    () => (resolved ? TIERS.filter((t) => resolved.tiers.includes(t)) : [...TIERS]),
    [resolved],
  );
  const activeTier = legalTiers.includes(tier) ? tier : legalTiers[0]!;
  const canStart = !!resolved;
  const typeMatch = !!resolved && resolved.class === station;

  const doStart = () => {
    if (!resolved) return;
    startCraft(station, resolved.canonical, activeTier);
    haptic("medium");
    toast(`${resolved.canonical} ${activeTier} → crafting at ${STATION_LABEL[station]}`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Start a craft at the ${STATION_LABEL[station]} station`}
        className="relative w-full max-w-[440px] card p-5 m-3 view-enter"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="font-display font-bold text-lg">Start a craft</h2>
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-alt">
            @ {STATION_LABEL[station]}
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

        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-1">Droid</div>
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
          <p className="font-mono text-[10px] text-warn mt-1">
            Pick a droid from the list to start crafting.
          </p>
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
                    activeTier === t ? "border-holo bg-holo/10" : "border-line-alt hover:border-holo-dim"
                  }`}
                >
                  <TierPill tier={t} />
                </button>
              ))}
            </div>

            {craftTimeFor(resolved, activeTier) ? (
              <p className="font-mono text-[10px] text-muted-alt mt-3">
                Build time{" "}
                <span className="text-holo font-bold">{craftTimeFor(resolved, activeTier)}</span>{" "}
                at {activeTier} — before any crafting-speed bonuses.
              </p>
            ) : null}

            {typeMatch ? (
              <p className="font-mono text-[10px] text-ok mt-1.5">
                ⚡ Type match — this droid gets a crafting-speed bonus at the {STATION_LABEL[station]} station.
              </p>
            ) : (
              <p className="font-mono text-[10px] text-muted-alt mt-3">
                Class mismatch — no crafting-speed bonus (but still valid).
              </p>
            )}
          </>
        ) : null}

        <div className="flex gap-2.5 mt-5">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canStart}
            onClick={doStart}
            className={`btn flex-1 ${
              canStart ? "btn-primary" : "border border-line text-muted opacity-40 cursor-not-allowed"
            }`}
          >
            Start craft
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
