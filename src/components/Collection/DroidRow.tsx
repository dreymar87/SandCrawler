import { useDroidDict } from "../../hooks/useDroidDict";
import { TIERS } from "../../constants";
import type { RosterEntry, Tier } from "../../types";
import { useAppStore } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";
import { ClassPill } from "../common/ClassPill";

interface Props {
  entry: RosterEntry;
}

export function DroidRow({ entry }: Props) {
  const { index } = useDroidDict();
  const setTier = useAppStore((s) => s.setTier);
  const toggleActive = useAppStore((s) => s.toggleActive);
  const removeDroid = useAppStore((s) => s.removeDroid);

  const def = index.resolve(entry.droidId);
  const klass = def?.class ?? "UNKNOWN";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2.5 mb-2">
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium truncate">{entry.droidId || "Unnamed"}</div>
        <div className="mt-1 flex items-center gap-1.5">
          <ClassPill kind={klass} />
          {def === null ? (
            <span className="status-tag miss">Custom</span>
          ) : null}
        </div>
      </div>

      <select
        className="select w-24"
        value={entry.tier}
        onChange={(e) => setTier(entry.droidId, e.target.value as Tier)}
        aria-label={`Tier for ${entry.droidId}`}
      >
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <TierPill tier={entry.tier} className="hidden sm:inline-flex" />

      <button
        type="button"
        className={`font-display font-semibold text-[11px] tracking-wide px-2.5 py-1.5 rounded-md border ${
          entry.active
            ? "text-holo border-holo-dim bg-holo/10"
            : "text-muted border-line-alt bg-panel-alt"
        }`}
        onClick={() => toggleActive(entry.droidId)}
        title={entry.active ? "Working / Lounge — counts for rebirths" : "Not active — doesn't count"}
      >
        {entry.active ? "ACTIVE" : "STORED"}
      </button>

      <button
        type="button"
        className="text-muted hover:text-danger w-8 h-8 rounded-md grid place-items-center hover:bg-panel-alt"
        onClick={() => {
          if (confirm(`Remove ${entry.droidId} from your collection?`)) removeDroid(entry.droidId);
        }}
        aria-label={`Remove ${entry.droidId}`}
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
    </div>
  );
}
