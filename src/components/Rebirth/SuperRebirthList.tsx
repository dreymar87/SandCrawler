import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { rankReady } from "../../lib/readiness";
import type { Rank, SuperRebirth } from "../../types";
import { RankCard } from "./RankCard";
import { SuperRebirthEditor } from "./SuperRebirthEditor";

export function SuperRebirthList() {
  const supers = useAppStore((s) => s.superRebirths);
  const roster = useAppStore((s) => s.roster);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ groupId: string; level: string; rank: Rank } | null>(null);

  const sorted = [...supers].sort(
    (a, b) => (parseFloat(a.level) || 0) - (parseFloat(b.level) || 0),
  );

  return (
    <div>
      <button
        type="button"
        className="btn btn-primary btn-block mb-4"
        onClick={() => {
          setAdding(true);
          setEditing(null);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Add a rebirth rank
      </button>

      {adding ? <SuperRebirthEditor onClose={() => setAdding(false)} /> : null}
      {editing ? (
        <SuperRebirthEditor initial={editing} onClose={() => setEditing(null)} />
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        sorted.map((g) => (
          <GroupBlock
            key={g.id}
            group={g}
            collapsed={!!collapsed[g.id]}
            onToggle={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}
            roster={roster}
            onEdit={(rank) => {
              setEditing({ groupId: g.id, level: g.level, rank });
              setAdding(false);
            }}
          />
        ))
      )}
    </div>
  );
}

interface GroupProps {
  group: SuperRebirth;
  collapsed: boolean;
  onToggle: () => void;
  roster: ReturnType<typeof useAppStore.getState>["roster"];
  onEdit: (rank: Rank) => void;
}

function GroupBlock({ group, collapsed, onToggle, roster, onEdit }: GroupProps) {
  const ranks = [...group.ranks].sort(
    (a, b) => (parseFloat(a.rank) || 0) - (parseFloat(b.rank) || 0),
  );
  const ready = ranks.filter((r) => rankReady(r, roster)).length;

  return (
    <div className="mb-5">
      <button
        type="button"
        className="w-full flex items-center gap-3 pb-3 select-none"
        onClick={onToggle}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className={`text-muted transition-transform ${collapsed ? "-rotate-90" : ""}`}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-mono font-bold text-[10px] tracking-wider px-2 py-1 rounded-md bg-holo text-[#04222B]">
          SR {group.level || "?"}
        </span>
        <span className="font-display font-bold text-[19px] flex-1 text-left">
          Super Rebirth {group.level || "?"}
        </span>
        <span className="font-mono text-[10.5px] text-muted">
          {ranks.length} rank{ranks.length === 1 ? "" : "s"} · {ready} ready
        </span>
      </button>
      {!collapsed ? (
        <div className="flex flex-col gap-3">
          {ranks.map((r) => (
            <RankCard key={r.id} groupId={group.id} rank={r} onEdit={() => onEdit(r)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center px-5 py-10 rounded-2xl border border-dashed border-line-alt text-muted">
      <div className="font-display text-[30px] text-holo-dim mb-2.5 tracking-widest">// : //</div>
      <p className="text-ink font-semibold">No ranks logged yet.</p>
      <p className="text-[13.5px] mt-1.5">
        Open a Super Rebirth's screen in the game, then tap <em>Add a rebirth rank</em> to record
        its NEED set. Super Rebirth requirements aren't publicly documented — this app crowd-sources them as you play.
      </p>
    </div>
  );
}
