import { useStandardRebirths, useStandardReadiness, useActiveCycle } from "../../store/selectors";
import { rosterCovers } from "../../lib/readiness";
import { cycleLabel } from "../../lib/rebirthCycles";
import { useAppStore } from "../../store/useAppStore";
import { ProgressBar } from "../common/ProgressBar";
import { TierPill } from "../common/TierPill";
import type { StandardRebirth } from "../../types";

/**
 * The Rebirths tab: shows the 23 levels of the active cycle. The active
 * cycle derives from the player's Super Rebirth count (or a manual
 * override set on the Profile tab).
 */
export function StandardRebirthList() {
  const list = useStandardRebirths();
  const ready = useStandardReadiness();
  const cycle = useActiveCycle();
  const cards = useAppStore((s) => s.cards);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const setCredits = useAppStore((s) => s.setCreditsCurrent);
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);

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

      {list.length === 0 ? (
        <EmptyState />
      ) : (
        list.map((rb) => (
          <RebirthRow
            key={`${rb.cycle}-${rb.level}`}
            rb={rb}
            cards={cards}
            credits={credits}
            isReady={ready.get(rb.level) ?? false}
            isCurrent={rb.level === currentLevel}
            isPast={rb.level <= currentLevel}
          />
        ))
      )}
    </div>
  );
}

function RebirthRow({
  rb,
  cards,
  credits,
  isReady,
  isCurrent,
  isPast,
}: {
  rb: StandardRebirth;
  cards: ReturnType<typeof useAppStore.getState>["cards"];
  credits: string;
  isReady: boolean;
  isCurrent: boolean;
  isPast: boolean;
}) {
  const sell = rb.sellList;
  const dnsell = sell.includes("DO_NOT_SELL");
  const slot = rb.rewards.slotUnlock;
  return (
    <div
      className={`card mb-3 ${isReady ? "card-ready" : ""} ${isPast && !isCurrent ? "opacity-60" : ""}`}
    >
      <header className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
        <span
          className={`font-display font-bold text-[15px] ${
            isReady ? "text-ok" : isCurrent ? "text-holo" : "text-sun"
          }`}
        >
          Rebirth {rb.level}
        </span>
        {isCurrent ? (
          <span className="font-mono font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-holo text-[#04222B]">
            You're here
          </span>
        ) : null}
        {isReady && !isCurrent ? (
          <span className="font-mono font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-ok text-[#04241a]">
            Ready
          </span>
        ) : null}
        <span className="flex-1" />
        <span className="font-display font-bold text-[15px] text-sun">{rb.credits || "—"}</span>
      </header>
      <div className="px-4 py-3">
        <div className="mb-3">
          <ProgressBar required={rb.credits || "0"} current={credits} />
        </div>
        <div className="section-label mb-2">Droids needed</div>
        {rb.needs.map((req, i) => {
          const cov = rosterCovers(req, cards);
          return (
            <div
              key={`${req.name}-${i}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-panel-alt border border-line mb-1.5 last:mb-0"
            >
              <span className="flex-1 truncate">{req.name}</span>
              <TierPill tier={req.tier} />
              <span className={`status-tag ${cov ? "ok" : "miss"}`}>
                {cov ? "In base" : "Need it"}
              </span>
            </div>
          );
        })}

        {/* Reward strip */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {rb.rewards.novaCrystals > 0 ? (
            <RewardChip label="Crystals" value={`+${rb.rewards.novaCrystals}`} />
          ) : null}
          {rb.rewards.creditMult > 0 ? (
            <RewardChip label="Credit" value={`×${(1 + rb.rewards.creditMult).toFixed(2)}`} />
          ) : null}
          {rb.rewards.xpMult > 0 ? (
            <RewardChip label="XP" value={`×${(1 + rb.rewards.xpMult).toFixed(1)}`} />
          ) : null}
          {slot ? <RewardChip label="Slot" value={slot} /> : null}
        </div>

        {/* Sell guidance */}
        {sell.length > 0 ? (
          <div
            className={`mt-3 pl-3 py-2 border-l-2 rounded-r-md text-[12px] whitespace-pre-wrap ${
              dnsell
                ? "border-warn bg-warn/5 text-warn"
                : "border-holo-dim bg-panel-alt text-muted"
            }`}
          >
            {dnsell
              ? "Do not sell anything yet — droids are needed for upcoming rebirths."
              : `Safe to sell: ${sell.join(", ")}`}
          </div>
        ) : null}

        {rb.notes ? (
          <div className="mt-3 pl-3 py-2 border-l-2 border-holo-dim bg-panel-alt rounded-r-md text-[13px] text-muted whitespace-pre-wrap">
            {rb.notes}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RewardChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="font-mono text-[10px] tracking-wide px-2.5 py-1.5 rounded-md bg-panel-alt border border-line text-muted">
      {label} <b className="text-ink font-bold">{value}</b>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="text-center px-5 py-10 rounded-2xl border border-dashed border-line-alt text-muted">
      <p>No rebirth data for this cycle.</p>
    </div>
  );
}
