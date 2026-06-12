import { useAppStore } from "../../store/useAppStore";
import { useNextUnlock, type ScoredAny } from "../../store/selectors";
import { GapList } from "./GapList";

export function NextUnlockPanel() {
  const credits = useAppStore((s) => s.ui.creditsCurrent);
  const setCredits = useAppStore((s) => s.setCreditsCurrent);
  const { ready, near } = useNextUnlock();

  return (
    <div>
      <section className="card p-4 mb-4">
        <div className="section-label mb-2">Current credits</div>
        <input
          type="text"
          className="input"
          placeholder="e.g. 1.2M"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
          autoCapitalize="characters"
        />
        <p className="font-mono text-[10px] text-muted-alt mt-1.5">
          Used by Standard Rebirth scoring and "credits-only" detection.
        </p>
      </section>

      <SectionHeader title="Ready now" count={ready.length} />
      {ready.length === 0 ? (
        <p className="text-muted text-sm mb-4">Nothing's queued up yet. Keep grinding.</p>
      ) : (
        ready.map((s, i) => <Row key={`r-${i}`} scored={s} />)
      )}

      <SectionHeader title="Closest to ready" count={near.length} />
      {near.length === 0 ? (
        <p className="text-muted text-sm">Add some rebirth ranks to start tracking gaps.</p>
      ) : (
        near.map((s, i) => <Row key={`n-${i}`} scored={s} />)
      )}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 mt-2 mb-3">
      <h3 className="font-display font-bold text-base">{title}</h3>
      <span className="font-mono text-[10.5px] text-muted">({count})</span>
    </div>
  );
}

function Row({ scored }: { scored: ScoredAny }) {
  const isReady = scored.ready;
  const title =
    scored.kind === "standard"
      ? `Standard Rebirth ${scored.rb.level}`
      : `Super Rebirth ${scored.group.level} · Rank ${scored.rank.rank || "?"}`;
  const credits = scored.kind === "standard" ? scored.rb.credits : scored.rank.credits;

  return (
    <div className={`card ${isReady ? "card-ready" : ""} p-4 mb-3`}>
      <header className="flex items-center gap-2.5 mb-2">
        <span
          className={`font-display font-bold text-[15px] ${isReady ? "text-ok" : "text-sun"}`}
        >
          {title}
        </span>
        {isReady ? (
          <span className="font-mono font-bold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md bg-ok text-[#04241a]">
            Ready
          </span>
        ) : null}
        <span className="flex-1" />
        <span className="font-display font-bold text-[15px] text-sun">{credits || "—"}</span>
      </header>
      {isReady ? null : scored.creditsOnly ? (
        <p className="text-sm text-muted">All droids covered — keep banking credits.</p>
      ) : (
        <GapList gaps={scored.gaps} />
      )}
    </div>
  );
}
