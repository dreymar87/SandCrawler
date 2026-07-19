import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { TIERS } from "../../constants";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useAppStore, type Slot } from "../../store/useAppStore";
import { Autocomplete } from "../common/Autocomplete";
import { TierPill } from "../common/TierPill";
import type { DroidDef, Tier } from "../../types";

const SLOT_LABEL: Record<Slot, string> = {
  working: "Working",
  lounge: "Lounge",
  companion: "Companion",
};
const SLOTS: Slot[] = ["working", "lounge", "companion"];

/**
 * "Add a droid to your base" wizard, opened from the My-base section.
 * Pick a droid (reusing the shared Autocomplete), a tier, and a slot; the
 * add goes through `addDeployed` (which routes companion adds through the
 * single-slot swap). Portaled to <body> like the other Base modals.
 */
export function AddToBaseModal({ onClose }: { onClose: () => void }) {
  const addDeployed = useAppStore((s) => s.addDeployed);
  const [raw, setRaw] = useState("");
  const [resolved, setResolved] = useState<DroidDef | null>(null);
  const [tier, setTier] = useState<Tier>("DEFAULT");
  const [slot, setSlot] = useState<Slot>("working");

  const legalTiers = useMemo(
    () => (resolved ? TIERS.filter((t) => resolved.tiers.includes(t)) : [...TIERS]),
    [resolved],
  );
  const activeTier = legalTiers.includes(tier) ? tier : legalTiers[0]!;
  const canAdd = !!resolved;

  const doAdd = () => {
    if (!resolved) return;
    addDeployed(resolved.canonical, activeTier, slot);
    haptic("medium");
    toast(`${resolved.canonical} ${activeTier} → ${SLOT_LABEL[slot]}`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add a droid to your base"
        className="relative w-full max-w-[440px] card p-5 m-3 view-enter"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="font-display font-bold text-lg">Add a droid</h2>
          <span className="flex-1" />
          <button
            type="button"
            className="font-mono text-[10.5px] uppercase tracking-wider text-holo"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Droid picker */}
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
            Pick a droid from the list to add it to your base.
          </p>
        ) : null}

        {resolved ? (
          <>
            {/* Tier */}
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

            {/* Slot */}
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mt-4 mb-1.5">
              Put in
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={`btn btn-sm ${slot === s ? "btn-primary" : "btn-ghost"}`}
                >
                  {SLOT_LABEL[s]}
                </button>
              ))}
            </div>
            {slot === "companion" ? (
              <p className="font-mono text-[10px] text-tier-galactic mt-2">
                Companion is a single slot — this swaps out any current companion.
              </p>
            ) : null}
          </>
        ) : null}

        <div className="flex gap-2.5 mt-5">
          <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!canAdd}
            onClick={doAdd}
            className={`btn flex-1 ${
              canAdd ? "btn-primary" : "border border-line text-muted opacity-40 cursor-not-allowed"
            }`}
          >
            Add to base
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
