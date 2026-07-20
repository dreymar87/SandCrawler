import { useState } from "react";
import { createPortal } from "react-dom";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useAppStore, type Slot } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";
import { StartCraftModal } from "./StartCraftModal";
import type { StationFill } from "../../lib/baseView";
import type { StationType } from "../../types";

const GRAB_SLOTS: { slot: Slot; label: string }[] = [
  { slot: "working", label: "Working" },
  { slot: "lounge", label: "Lounge" },
  { slot: "companion", label: "Companion" },
];

/**
 * Base-tab section for the three droid crafting stations (Worker/Astromech/
 * Battle). Each station is a single slot: empty → tap to start a craft;
 * occupied → tap the droid for slot actions (mark ready, grab, swap
 * companion, clear). Locked when the player hasn't reached the station's
 * unlock RB.
 */
export function CraftingStations({ stations }: { stations: StationFill[] }) {
  const [startAt, setStartAt] = useState<StationType | null>(null);
  const [openAt, setOpenAt] = useState<StationType | null>(null);
  const openStation = openAt ? stations.find((s) => s.type === openAt) ?? null : null;

  return (
    <section className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display font-bold text-base">Crafting stations</h2>
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-muted-alt">one droid per station</span>
      </div>
      <div className="space-y-2.5">
        {stations.map((st) => (
          <StationCard
            key={st.type}
            station={st}
            onStart={() => setStartAt(st.type)}
            onOpen={() => setOpenAt(st.type)}
          />
        ))}
      </div>
      <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
        Crafting droids don't count as working / lounge / companion. Grab a finished droid to add it
        to your Droidex, or swap your companion in for the classic trick.
      </p>

      {startAt ? <StartCraftModal station={startAt} onClose={() => setStartAt(null)} /> : null}
      {openStation && openStation.slot ? (
        <StationSlotMenu station={openStation} onClose={() => setOpenAt(null)} />
      ) : null}
    </section>
  );
}

function StationCard({
  station,
  onStart,
  onOpen,
}: {
  station: StationFill;
  onStart: () => void;
  onOpen: () => void;
}) {
  if (!station.unlocked) {
    return (
      <div className="rounded-[10px] border border-dashed border-line bg-panel-alt/40 p-3 opacity-70">
        <div className="flex items-baseline gap-2">
          <span className={`font-display font-semibold text-[14px] ${station.accent}`}>
            {station.label}
          </span>
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-muted-alt">
            🔒 Unlocks at RB{station.unlockRb}
          </span>
        </div>
      </div>
    );
  }

  const slot = station.slot;
  return (
    <div className="rounded-[10px] border border-line bg-panel-alt p-3">
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`font-display font-semibold text-[14px] ${station.accent}`}>
          {station.label}
        </span>
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-muted-alt">
          {slot ? (slot.state === "crafting" ? "in progress" : "ready to grab") : "empty"}
        </span>
      </div>
      {slot ? (
        <button
          type="button"
          onClick={onOpen}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md border border-line bg-bg-alt/40 hover:bg-holo/5 transition text-left"
        >
          <span className="flex-1 min-w-0 font-mono text-[12px] truncate">{slot.name}</span>
          <TierPill tier={slot.tier} />
          <span
            className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
              slot.state === "ready"
                ? "border border-ok text-ok bg-ok/10"
                : "border border-sun text-sun bg-sun/10"
            }`}
          >
            {slot.state}
          </span>
          {slot.typeMatch ? (
            <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-holo text-holo bg-holo/10">
              ⚡ match
            </span>
          ) : null}
        </button>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="w-full py-2.5 rounded-md border border-dashed border-holo/40 text-holo font-mono text-[11px] uppercase tracking-wider hover:bg-holo/5 transition"
        >
          + Start a craft
        </button>
      )}
    </div>
  );
}

const STATION_LABEL: Record<StationType, string> = {
  WORKER: "Worker",
  ASTROMECH: "Astromech",
  BATTLE: "Battle",
};

function StationSlotMenu({ station, onClose }: { station: StationFill; onClose: () => void }) {
  const setStationState = useAppStore((s) => s.setStationState);
  const grabStation = useAppStore((s) => s.grabStation);
  const clearStation = useAppStore((s) => s.clearStation);
  const swapCompanionIntoStation = useAppStore((s) => s.swapCompanionIntoStation);
  const currentCompanion = useAppStore((s) => s.cards.find((c) => c.companion > 0));
  const slot = station.slot!;

  // When "Grab" is tapped, reveal a destination chooser (deploy vs just own).
  const [choosingGrab, setChoosingGrab] = useState(false);

  const doMarkReady = () => {
    setStationState(station.type, "ready");
    haptic("light");
    toast(`${slot.name} ${slot.tier} is ready`);
    onClose();
  };
  const doGrab = (target: Slot | null) => {
    grabStation(station.type, target);
    haptic("medium");
    toast(
      target
        ? `${slot.name} ${slot.tier} → ${GRAB_SLOTS.find((g) => g.slot === target)!.label}`
        : `Grabbed ${slot.name} ${slot.tier} → owned in Droidex`,
    );
    onClose();
  };
  const doClear = () => {
    clearStation(station.type);
    haptic("light");
    toast(`${STATION_LABEL[station.type]} station cleared`);
    onClose();
  };
  const doSwap = () => {
    swapCompanionIntoStation(station.type);
    haptic("medium");
    toast(
      currentCompanion
        ? `${slot.name} → Companion · ${currentCompanion.name} parked in ${STATION_LABEL[station.type]}`
        : `${slot.name} → Companion (station empty)`,
    );
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${STATION_LABEL[station.type]} station actions`}
        className="relative w-full max-w-[420px] card p-5 m-3 view-enter"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="flex items-baseline gap-2 mb-1">
          <h2 className="font-display font-bold text-lg truncate">{slot.name}</h2>
          <TierPill tier={slot.tier} />
          <span className="flex-1" />
          <button
            type="button"
            className="font-mono text-[10.5px] uppercase tracking-wider text-holo"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <p className="font-mono text-[10.5px] text-muted-alt mb-4">
          {STATION_LABEL[station.type]} station · currently {slot.state}
          {slot.typeMatch ? " · ⚡ type match" : ""}
        </p>

        {choosingGrab ? (
          <div>
            <p className="text-[13px] text-ink mb-3">
              Collect <b>{slot.name}</b> — put it where?
            </p>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {GRAB_SLOTS.map((g) => (
                <button
                  key={g.slot}
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => doGrab(g.slot)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-block btn-sm"
              onClick={() => doGrab(null)}
            >
              Just mark owned (Droidex only)
            </button>
            <button
              type="button"
              className="font-mono text-[10.5px] uppercase tracking-wider text-muted-alt mt-3"
              onClick={() => setChoosingGrab(false)}
            >
              ← Back
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Grab — available whether still crafting or ready */}
            <button
              type="button"
              className="w-full flex items-center gap-3 rounded-[10px] border border-ok/50 bg-ok/5 px-3 py-2.5 text-left hover:bg-ok/10"
              onClick={() => setChoosingGrab(true)}
            >
              <span className="font-display font-semibold text-[13.5px] text-ok">Grab / collect</span>
              <span className="flex-1" />
              <span className="font-mono text-[10px] text-muted-alt">own or deploy</span>
            </button>

            {slot.state === "crafting" ? (
              <button type="button" className="btn btn-block btn-ghost" onClick={doMarkReady}>
                Mark ready (finished crafting)
              </button>
            ) : (
              <button
                type="button"
                className="w-full flex items-center gap-3 rounded-[10px] border border-tier-galactic/50 bg-tier-galactic/5 px-3 py-2.5 text-left hover:bg-tier-galactic/10"
                onClick={doSwap}
              >
                <span className="font-display font-semibold text-[13.5px] text-tier-galactic">
                  Swap companion in
                </span>
                <span className="flex-1" />
                <span className="font-mono text-[10px] text-muted-alt">
                  {currentCompanion ? `${currentCompanion.name} → station` : "no companion set"}
                </span>
              </button>
            )}

            <div className="pt-2 mt-1 border-t border-line">
              <button
                type="button"
                className="w-full rounded-[10px] border border-danger/40 text-danger px-3 py-2 text-[12px] hover:bg-danger/10"
                onClick={doClear}
              >
                Discard — don't keep this droid
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
