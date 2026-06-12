import { useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { AddDroidDialog } from "./AddDroidDialog";
import { DroidRow } from "./DroidRow";

export function CollectionPanel() {
  const roster = useAppStore((s) => s.roster);
  const [adding, setAdding] = useState(false);

  const sorted = useMemo(
    () => [...roster].sort((a, b) => a.droidId.localeCompare(b.droidId)),
    [roster],
  );

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary btn-block mb-4"
        onClick={() => setAdding(true)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Add a droid to my base
      </button>

      {adding ? <AddDroidDialog onClose={() => setAdding(false)} /> : null}

      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        sorted.map((entry) => <DroidRow key={entry.droidId} entry={entry} />)
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center px-5 py-10 rounded-2xl border border-dashed border-line-alt text-muted">
      <div className="font-display text-[30px] text-holo-dim mb-2.5 tracking-widest">// : //</div>
      <p className="text-ink font-semibold">No droids in your base yet.</p>
      <p className="text-[13.5px] mt-1.5">
        Tap <em>Add a droid to my base</em> to list what you've got. Required droids in your plan
        tick off automatically.
      </p>
    </div>
  );
}
