import { createPortal } from "react-dom";
import { rosterCovers } from "../../lib/readiness";
import { srbBonusAt } from "../../lib/novaCrystals";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/useAppStore";
import { ProgressBar } from "../common/ProgressBar";
import { TierPill } from "../common/TierPill";
import type { CollectionCard, StandardRebirth } from "../../types";

/**
 * Per-rebirth detail window, opened by tapping a level chip on the Rebirths
 * tab. Holds everything the old tall RebirthRow card showed — credit cost +
 * progress, droid requirements with In base/Need it, slot unlock, Super
 * Rebirth bonus, sell guidance, notes — plus prev/next to step through
 * levels. Portaled to <body> so the fixed overlay escapes the tab's
 * `view-enter` transform.
 */
export function RebirthDetailModal({
  rb,
  cards,
  credits,
  isReady,
  isCurrent,
  onClose,
  onPrev,
  onNext,
}: {
  rb: StandardRebirth;
  cards: CollectionCard[];
  credits: string;
  isReady: boolean;
  isCurrent: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const bumpWorking = useAppStore((s) => s.bumpWorking);
  const sell = rb.sellList;
  const dnsell = sell.includes("DO_NOT_SELL");
  const slot = rb.slotUnlock;
  const srb = srbBonusAt(rb.level);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Rebirth ${rb.level} details`}
        className="relative w-full max-w-[440px] card p-5 m-3 view-enter max-h-[85vh] overflow-y-auto"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <h2 className="font-display font-bold text-lg">Rebirth {rb.level}</h2>
          {isCurrent ? (
            <span className="font-mono font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-holo text-[#04222B]">
              You're here
            </span>
          ) : isReady ? (
            <span className="font-mono font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-ok text-[#04241a]">
              Ready
            </span>
          ) : null}
          <span className="flex-1" />
          <button
            type="button"
            className="font-mono text-[10.5px] uppercase tracking-wider text-holo"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt">Cost</span>
          <span className="font-display font-bold text-sun text-[15px]">{rb.credits || "—"}</span>
        </div>
        <ProgressBar required={rb.credits || "0"} current={credits} />

        <div className="section-label mt-4 mb-2">Droids needed</div>
        {rb.needs.length === 0 ? (
          <p className="font-mono text-[11px] text-muted-alt">No droid requirements at this level.</p>
        ) : (
          rb.needs.map((req, i) => {
            const cov = rosterCovers(req, cards);
            return (
              <div
                key={`${req.name}-${i}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-panel-alt border border-line mb-1.5 last:mb-0"
              >
                <span className="flex-1 truncate">{req.name}</span>
                <TierPill tier={req.tier} />
                {cov ? (
                  <span className="status-tag ok">In base</span>
                ) : (
                  <button
                    type="button"
                    className="font-mono text-[9px] uppercase tracking-wider text-holo border border-holo/50 rounded-md px-2 py-1 hover:bg-holo/10"
                    onClick={() => {
                      bumpWorking(req.name, req.tier);
                      haptic("light");
                      toast(`${req.name} ${req.tier} → Working`);
                    }}
                  >
                    I have it
                  </button>
                )}
              </div>
            );
          })
        )}

        {/* Per-rebirth reward: slot unlock */}
        {slot ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <RewardChip label="Slot" value={slot} />
          </div>
        ) : null}

        {/* Super Rebirth bonus hint — what you'd earn if you SR'd at this level. */}
        {srb ? (
          <div className="mt-3 pl-3 py-2 border-l-2 border-sun/40 bg-sun/5 rounded-r-md text-[12px] text-muted">
            <span className="font-mono text-[10px] uppercase tracking-wider text-sun">SRB bonus here:</span>{" "}
            {srb.crystals} crystals · {Math.round(srb.creditMult * 100)}% credit mult ·{" "}
            {Math.round(srb.xpMult * 100)}% XP mult
          </div>
        ) : null}

        {/* Sell guidance */}
        {sell.length > 0 ? (
          <div
            className={`mt-3 pl-3 py-2 border-l-2 rounded-r-md text-[12px] whitespace-pre-wrap ${
              dnsell ? "border-warn bg-warn/5 text-warn" : "border-holo-dim bg-panel-alt text-muted"
            }`}
          >
            {dnsell
              ? "None of this rebirth's droids are done yet — they're all still needed ahead. Other droids you own may still be safe; see Safe to sell on the Base tab."
              : `Safe to sell: ${sell.join(", ")}`}
          </div>
        ) : null}

        {rb.notes ? (
          <div className="mt-3 pl-3 py-2 border-l-2 border-holo-dim bg-panel-alt rounded-r-md text-[13px] text-muted whitespace-pre-wrap">
            {rb.notes}
          </div>
        ) : null}

        {/* Prev / next navigation */}
        <div className="flex gap-2.5 mt-5">
          <button
            type="button"
            disabled={!onPrev}
            onClick={onPrev}
            className={`btn btn-ghost btn-sm flex-1 ${!onPrev ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            ◀ Prev
          </button>
          <button
            type="button"
            disabled={!onNext}
            onClick={onNext}
            className={`btn btn-ghost btn-sm flex-1 ${!onNext ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Next ▶
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function RewardChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="font-mono text-[10px] tracking-wide px-2.5 py-1.5 rounded-md bg-panel-alt border border-line text-muted">
      {label} <b className="text-ink font-bold">{value}</b>
    </span>
  );
}
