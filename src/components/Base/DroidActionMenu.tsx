import { useState } from "react";
import { createPortal } from "react-dom";
import { TIERS } from "../../constants";
import { chipsBetween, formatChipCost } from "../../lib/chipCosts";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useAppStore, type Slot } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";
import type { DeployedDroid } from "../../lib/baseView";

const SLOT_LABEL: Record<Slot, string> = {
  working: "Working",
  lounge: "Lounge",
  companion: "Companion",
};
const ALL_SLOTS: Slot[] = ["working", "lounge", "companion"];

/**
 * Tap-a-deployed-droid action menu. Every action affects exactly ONE
 * copy; when count > 1 that's called out. Actions: upgrade (with a
 * redeploy chooser), move to another slot, remove from base.
 */
export function DroidActionMenu({
  droid,
  slot,
  onClose,
}: {
  droid: DeployedDroid;
  slot: Slot;
  onClose: () => void;
}) {
  const moveDeployed = useAppStore((s) => s.moveDeployed);
  const removeDeployed = useAppStore((s) => s.removeDeployed);
  const upgradeDeployed = useAppStore((s) => s.upgradeDeployed);

  // When "Upgrade" is tapped, reveal the redeploy chooser instead of acting immediately.
  const [choosingRedeploy, setChoosingRedeploy] = useState(false);

  const tierIdx = (TIERS as readonly string[]).indexOf(droid.tier);
  const atTop = tierIdx < 0 || tierIdx >= TIERS.length - 1;
  const nextTier = atTop ? null : TIERS[tierIdx + 1]!;
  const stepCost = nextTier ? chipsBetween(droid.rarity, droid.tier, nextTier) : null;
  const isIconic = droid.rarity === "ICONIC";
  const multiple = droid.count > 1;

  const doUpgrade = (to: Slot | null) => {
    upgradeDeployed(droid.name, droid.tier, slot, to);
    haptic("medium");
    toast(
      `${droid.name} → ${nextTier}${to ? ` · ${SLOT_LABEL[to]}` : " · left out"}`,
    );
    onClose();
  };

  const doMove = (to: Slot) => {
    moveDeployed(droid.name, droid.tier, slot, to);
    haptic("light");
    toast(`${droid.name} moved to ${SLOT_LABEL[to]}`);
    onClose();
  };

  const doRemove = () => {
    removeDeployed(droid.name, droid.tier, slot);
    haptic("light");
    toast(`${droid.name} removed from ${SLOT_LABEL[slot]}`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${droid.name} actions`}
        className="relative w-full max-w-[420px] card p-5 m-3 view-enter"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="flex items-baseline gap-2 mb-1">
          <h2 className="font-display font-bold text-lg truncate">{droid.name}</h2>
          <TierPill tier={droid.tier} />
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
          In {SLOT_LABEL[slot]}
          {multiple ? ` · you have ×${droid.count} here — actions affect 1 copy` : ""}.
        </p>

        {choosingRedeploy && nextTier ? (
          <div>
            <p className="text-[13px] text-ink mb-3">
              Upgraded to <b className="text-tier-galactic">{nextTier}</b>. Put it back as:
            </p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {ALL_SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => doUpgrade(s)}
                >
                  {SLOT_LABEL[s]}
                </button>
              ))}
              <button type="button" className="btn btn-ghost text-muted" onClick={() => doUpgrade(null)}>
                Leave out
              </button>
            </div>
            <button
              type="button"
              className="font-mono text-[10.5px] uppercase tracking-wider text-muted-alt"
              onClick={() => setChoosingRedeploy(false)}
            >
              ← Back
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Upgrade */}
            {isIconic ? (
              <div className="rounded-[10px] border border-line bg-panel-alt px-3 py-2.5 text-[12px] text-muted">
                ICONIC droids don't upgrade — event-locked.
              </div>
            ) : atTop ? (
              <div className="rounded-[10px] border border-line bg-panel-alt px-3 py-2.5 text-[12px] text-muted">
                Already at the top tier (GALACTIC).
              </div>
            ) : (
              <button
                type="button"
                className="w-full flex items-center gap-3 rounded-[10px] border border-holo/50 bg-holo/5 px-3 py-2.5 text-left hover:bg-holo/10"
                onClick={() => setChoosingRedeploy(true)}
              >
                <span className="font-display font-semibold text-[13.5px] text-holo">
                  Upgrade → {nextTier}
                </span>
                <span className="flex-1" />
                <span className="font-mono text-[11px] text-muted-alt">
                  {stepCost == null ? "? chips" : `${formatChipCost(stepCost)} chips`}
                  {multiple ? " · 1 copy" : ""}
                </span>
              </button>
            )}

            {/* Move */}
            <div className="rounded-[10px] border border-line bg-panel-alt px-3 py-2.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-2">
                Move to
              </div>
              <div className="flex gap-2">
                {ALL_SLOTS.filter((s) => s !== slot).map((s) => (
                  <button key={s} type="button" className="btn btn-ghost btn-sm flex-1" onClick={() => doMove(s)}>
                    {SLOT_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Remove */}
            <button
              type="button"
              className="w-full rounded-[10px] border border-danger/40 text-danger px-3 py-2.5 text-[13px] hover:bg-danger/10"
              onClick={doRemove}
            >
              Remove from {SLOT_LABEL[slot]}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
