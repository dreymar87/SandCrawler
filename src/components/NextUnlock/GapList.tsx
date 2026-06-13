import type { Gap } from "../../lib/readiness";
import { useAppStore } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";

export function GapList({ gaps }: { gaps: Gap[] }) {
  const setCardState = useAppStore((s) => s.setCardState);
  return (
    <ul className="space-y-1.5 mt-2">
      {gaps.map((g, i) => (
        <li
          key={`${g.name}-${i}`}
          className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-panel-alt border border-line"
        >
          <span className="flex-1 truncate text-[14px]">{g.name}</span>
          <TierPill tier={g.requiredTier} />
          <span className="font-mono text-[10px] text-muted">
            {g.ownedTier ? `have ${g.ownedTier}` : "missing"}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setCardState(g.name, g.requiredTier, { owned: true, active: true })}
            title="Mark this card as owned and active at the required tier"
          >
            I have it
          </button>
        </li>
      ))}
    </ul>
  );
}
