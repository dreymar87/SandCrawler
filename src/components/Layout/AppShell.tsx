import type { ReactNode } from "react";
import { useReadyCounts } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

export function AppShell({ children }: { children: ReactNode }) {
  const counts = useReadyCounts();
  const rosterCount = useAppStore((s) => s.roster.length);
  const activeCount = useAppStore((s) => s.roster.filter((d) => d.active).length);
  const tab = useAppStore((s) => s.ui.activeTab);

  return (
    <div className="max-w-[760px] mx-auto px-4 pt-5 pb-16">
      <header className="relative card scan-overlay p-5 pb-4 overflow-hidden">
        <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-holo flex items-center gap-2 mb-2">
          <span className="w-[7px] h-[7px] rounded-full bg-ok shadow-[0_0_8px_#56D08A] animate-holo-pulse" />
          SandCrawler Manifest
        </div>
        <h1 className="font-display font-bold leading-[1.02] tracking-wide text-[clamp(25px,6.6vw,36px)]">
          Droid Tycoon
          <span className="block text-sun font-semibold text-[0.44em] tracking-[0.26em] uppercase mt-2">
            Rebirth Companion
          </span>
        </h1>
        <p className="text-muted text-[13.5px] mt-3 max-w-[54ch]">
          Track your droid collection against the requirements of every rebirth — Standard and
          Super. Tier substitution and active-droid status are handled automatically.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2.5 my-4">
        {tab === "collection" ? (
          <>
            <Stat n={rosterCount} k="Droids Logged" />
            <Stat n={activeCount} k="Active" />
            <Stat n={rosterCount - activeCount} k="Stored" />
          </>
        ) : (
          <>
            <Stat n={counts.superReady} k="Super Ready" sub={`of ${counts.superTotal}`} />
            <Stat n={counts.standardReady} k="Standard Ready" sub={`of ${counts.standardTotal}`} />
            <Stat n={activeCount} k="Active Droids" />
          </>
        )}
      </section>

      {children}

      <footer className="mt-8 text-center font-mono text-[10.5px] tracking-wider text-muted-alt">
        // Fan-made companion · Unaffiliated with Lucasfilm, Epic Games, FOAD or Blzn Studios
      </footer>
    </div>
  );
}

function Stat({ n, k, sub }: { n: number; k: string; sub?: string }) {
  return (
    <div className="card p-3.5">
      <div className="font-display font-bold text-2xl leading-none text-holo">{n}</div>
      <div className="font-mono text-[9px] tracking-wider uppercase text-muted-alt mt-1.5">
        {k}
        {sub ? <span className="ml-1 normal-case tracking-normal opacity-70">{sub}</span> : null}
      </div>
    </div>
  );
}
