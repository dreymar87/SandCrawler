import { SUPER_REBIRTH_BONUSES } from "../../data/superRebirthBonuses.seed";
import { useStandardRebirths, useStandardReadiness, useActiveCycle, useNextUnlock } from "../../store/selectors";
import { rosterCovers } from "../../lib/readiness";
import { srbBonusAt } from "../../lib/novaCrystals";
import { cycleLabel } from "../../lib/rebirthCycles";
import { useAppStore } from "../../store/useAppStore";
import { GapList } from "../NextUnlock/GapList";
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
  const credits = useAppStore((s) => s.profile.currentCredits);
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

      <ClosestSection credits={credits} />

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

      <SrbBonusesSection currentLevel={currentLevel} />
    </div>
  );
}

/**
 * Full RB12–27 Super Rebirth bonus table, collapsible. Highlights the row
 * for your current RB so you can compare "SR here vs one more" at a glance.
 */
function SrbBonusesSection({ currentLevel }: { currentLevel: number }) {
  return (
    <section className="card p-0 mt-6">
      <details className="group">
        <summary className="cursor-pointer select-none px-4 py-3 flex items-baseline gap-2 list-none">
          <span className="font-display font-bold text-base">Super Rebirth bonuses</span>
          <span className="font-mono text-[10.5px] text-muted-alt">RB12 – RB27</span>
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-holo group-open:hidden">show</span>
          <span className="font-mono text-[10.5px] text-holo hidden group-open:inline">hide</span>
        </summary>
        <div className="px-4 pb-4">
          <p className="font-mono text-[10.5px] text-muted-alt mb-3">
            One-time bonus earned when you Super Rebirth at that RB level. Multipliers stack
            additively with your existing multipliers.
          </p>
          <div className="rounded-[10px] border border-line overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-panel-alt font-mono text-[10px] uppercase tracking-wider text-muted-alt">
                  <th className="text-left px-3 py-2">RB</th>
                  <th className="text-right px-2 py-2">Crystals</th>
                  <th className="text-right px-2 py-2">Credit ×</th>
                  <th className="text-right px-3 py-2">XP ×</th>
                </tr>
              </thead>
              <tbody>
                {SUPER_REBIRTH_BONUSES.map((b) => {
                  const isCurrent = b.rbLevel === currentLevel;
                  return (
                    <tr
                      key={b.rbLevel}
                      className={`border-t border-line ${
                        isCurrent ? "bg-holo/10 text-holo" : ""
                      }`}
                    >
                      <td className="px-3 py-1.5 font-display font-bold">RB{b.rbLevel}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        +{b.crystals}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        ×{(1 + b.creditMult).toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono">
                        ×{(1 + b.xpMult).toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {currentLevel >= 12 && currentLevel <= 27 ? (
            <p className="font-mono text-[10.5px] text-holo mt-2">
              You're at RB{currentLevel} — highlighted row above.
            </p>
          ) : (
            <p className="font-mono text-[10.5px] text-muted-alt mt-2">
              Set your current RB on the Profile tab to highlight it here.
            </p>
          )}
        </div>
      </details>
    </section>
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
  const slot = rb.slotUnlock;
  const srb = srbBonusAt(rb.level);
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

        {/* Per-rebirth reward: slot unlock */}
        {slot ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <RewardChip label="Slot" value={slot} />
          </div>
        ) : null}

        {/* Super Rebirth bonus hint — what you'd earn if you SR'd at this level */}
        {srb ? (
          <div className="mt-3 pl-3 py-2 border-l-2 border-sun/40 bg-sun/5 rounded-r-md text-[12px] text-muted">
            <span className="font-mono text-[10px] uppercase tracking-wider text-sun">
              SRB bonus here:
            </span>{" "}
            +{srb.crystals} crystals · ×{(1 + srb.creditMult).toFixed(2)} credits · ×
            {(1 + srb.xpMult).toFixed(1)} XP
          </div>
        ) : null}

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

/** "Closest to ready" — the folded-in Next Unlock, scoped to this cycle. */
function ClosestSection({ credits }: { credits: string }) {
  const { ready, near } = useNextUnlock(3);
  if (ready.length === 0 && near.length === 0) return null;
  return (
    <section className="card p-4 mb-4 border-holo-dim/50">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="font-display font-bold text-base">Closest to ready</h2>
        {ready.length > 0 ? (
          <span className="font-mono text-[10px] text-ok font-bold">{ready.length} ready now</span>
        ) : null}
      </div>
      {ready.slice(0, 2).map((s) => (
        <div
          key={`r-${s.rb.level}`}
          className="rounded-[10px] border border-ok/40 bg-ok/5 px-3 py-2 mb-2 flex items-center gap-2"
        >
          <span className="font-display font-bold text-ok text-[14px]">Rebirth {s.rb.level}</span>
          <span className="font-mono text-[10px] text-muted">ready</span>
          <span className="flex-1" />
          <span className="font-display font-bold text-[14px] text-sun">{s.rb.credits}</span>
        </div>
      ))}
      {near.slice(0, 2).map((s) => (
        <div key={`n-${s.rb.level}`} className="mb-3 last:mb-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-display font-bold text-[14px] text-sun">Rebirth {s.rb.level}</span>
            <span className="flex-1" />
            <span className="font-display font-bold text-[13px] text-sun">{s.rb.credits}</span>
          </div>
          <ProgressBar required={s.rb.credits || "0"} current={credits} />
          {s.creditsOnly ? (
            <p className="text-[12px] text-muted mt-1.5">All droids covered — bank credits.</p>
          ) : (
            <GapList gaps={s.gaps} />
          )}
        </div>
      ))}
    </section>
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
