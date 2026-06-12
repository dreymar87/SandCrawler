import type { Rank } from "../../types";
import { rankReady, rosterCovers } from "../../lib/readiness";
import { useAppStore } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";

interface Props {
  groupId: string;
  rank: Rank;
  onEdit: () => void;
}

export function RankCard({ groupId, rank, onEdit }: Props) {
  const roster = useAppStore((s) => s.roster);
  const toggleCredits = useAppStore((s) => s.toggleRankCredits);
  const deleteRank = useAppStore((s) => s.deleteSuperRank);

  const ready = rankReady(rank, roster);
  const gain = rank.gain ?? {};

  return (
    <div className={`card ${ready ? "card-ready" : ""}`}>
      <header className="flex items-center gap-2.5 px-4 py-3 border-b border-line">
        <span
          className={`font-display font-bold text-[15px] ${ready ? "text-ok" : "text-sun"}`}
        >
          Rank {rank.rank || "?"}
        </span>
        {ready ? (
          <span className="font-mono font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-ok text-[#04241a]">
            Ready
          </span>
        ) : null}
        <span className="flex-1" />
        <button
          type="button"
          className="text-muted hover:text-ink w-8 h-8 rounded-md grid place-items-center hover:bg-panel-alt"
          onClick={onEdit}
          aria-label="Edit rank"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M11.5 2.5l2 2L6 12l-3 1 1-3 7.5-7.5z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="text-muted hover:text-danger w-8 h-8 rounded-md grid place-items-center hover:bg-panel-alt"
          onClick={() => {
            if (confirm("Delete this rank?")) deleteRank(groupId, rank.id);
          }}
          aria-label="Delete rank"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 4h10M6.5 4V2.5h3V4M5 4l.5 9h5L11 4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

      <div className="px-4 pt-3 pb-4">
        <button
          type="button"
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border mb-3 ${
            rank.creditsReady
              ? "bg-ok/5 border-ok/40"
              : "bg-panel-alt border-line"
          }`}
          onClick={() => toggleCredits(groupId, rank.id)}
        >
          <span
            className={`w-5.5 h-5.5 rounded-md border-2 grid place-items-center ${
              rank.creditsReady ? "bg-ok border-ok" : "border-line-alt"
            }`}
            style={{ width: 22, height: 22 }}
          >
            {rank.creditsReady ? (
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2.5 7.5l3 3 6-7"
                  stroke="#04222B"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-alt">
            Credits
          </span>
          <span className="ml-auto font-display font-bold text-[17px] text-sun">
            {rank.credits || "—"}
          </span>
        </button>

        <div className="section-label mb-2">Droids needed</div>
        {rank.droids.length === 0 ? (
          <div className="text-muted text-sm">No droids recorded</div>
        ) : (
          rank.droids.map((req, i) => {
            const cov = rosterCovers(req, roster);
            return (
              <div
                key={`${req.name}-${i}`}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-panel-alt border border-line mb-1.5 last:mb-0"
              >
                <span className="flex-1 truncate">{req.name || "Unnamed droid"}</span>
                <TierPill tier={req.tier} />
                <span className={`status-tag ${cov ? "ok" : "miss"}`}>
                  {cov ? "In base" : "Need it"}
                </span>
              </div>
            );
          })
        )}

        {gain.credits || gain.multiplier || gain.slot || gain.force ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {gain.credits ? <GainTag k="Credits" v={gain.credits} /> : null}
            {gain.multiplier ? <GainTag k="Mult" v={gain.multiplier} /> : null}
            {gain.slot ? <GainTag k="Slot" v={gain.slot} /> : null}
            {gain.force ? <GainTag k="Force" v={gain.force} /> : null}
          </div>
        ) : null}

        {rank.notes ? (
          <div className="mt-3 pl-3 py-2.5 border-l-2 border-holo-dim bg-panel-alt rounded-r-md text-[13px] text-muted whitespace-pre-wrap">
            {rank.notes}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GainTag({ k, v }: { k: string; v: string }) {
  return (
    <span className="font-mono text-[10px] tracking-wide px-2.5 py-1.5 rounded-md bg-panel-alt border border-line text-muted">
      {k} <b className="text-ink font-bold">{v}</b>
    </span>
  );
}
