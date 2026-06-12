import { useStandardRebirths, useStandardReadiness } from "../../store/selectors";
import { rosterCovers } from "../../lib/readiness";
import { useAppStore } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";

export function StandardRebirthList() {
  const list = useStandardRebirths();
  const ready = useStandardReadiness();
  const roster = useAppStore((s) => s.roster);
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const setCredits = useAppStore((s) => s.setCreditsCurrent);

  return (
    <div>
      <section className="card mb-4 p-4">
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
          Used to flag a Standard Rebirth as "ready" once you've banked enough.
        </p>
      </section>

      {list.length === 0 ? (
        <EmptyState />
      ) : (
        list.map((rb) => {
          const isReady = ready.get(rb.level) ?? false;
          return (
            <div key={rb.level} className={`card ${isReady ? "card-ready" : ""} mb-3`}>
              <header className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
                <span
                  className={`font-display font-bold text-[15px] ${
                    isReady ? "text-ok" : "text-sun"
                  }`}
                >
                  Rebirth {rb.level}
                </span>
                {isReady ? (
                  <span className="font-mono font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-ok text-[#04241a]">
                    Ready
                  </span>
                ) : null}
                <span className="flex-1" />
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt">
                  {rb.source ?? "seed"}
                </span>
                <span className="font-display font-bold text-[15px] text-sun">
                  {rb.credits || "—"}
                </span>
              </header>
              <div className="px-4 py-3">
                <div className="section-label mb-2">Droids needed</div>
                {rb.needs.length === 0 ? (
                  <div className="text-muted text-sm">No droids logged for this rebirth yet.</div>
                ) : (
                  rb.needs.map((req, i) => {
                    const cov = rosterCovers(req, roster);
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
                  })
                )}
                {rb.notes ? (
                  <div className="mt-3 pl-3 py-2 border-l-2 border-holo-dim bg-panel-alt rounded-r-md text-[13px] text-muted whitespace-pre-wrap">
                    {rb.notes}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      <p className="font-mono text-[10.5px] text-muted-alt text-center mt-4">
        // Seed coverage is partial — entries are best-effort from community guides.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center px-5 py-10 rounded-2xl border border-dashed border-line-alt text-muted">
      <p>No Standard Rebirth data yet.</p>
    </div>
  );
}
