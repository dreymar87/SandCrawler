import { formatCredits, parseCredits, progressPercent } from "../../lib/credits";

interface Props {
  required: string;
  current: string;
  /** Optional label override (defaults to "Credits"). */
  label?: string;
}

/**
 * Credits progress bar: shows current/required, the percent filled, and
 * either "Ready" (≥100%) or "short by X" (where X is formatted as the game
 * displays it).
 */
export function ProgressBar({ required, current, label = "Credits" }: Props) {
  const pct = progressPercent(required, current);
  const ready = pct >= 100;
  const have = parseCredits(current);
  const need = parseCredits(required);
  const shortBy = ready ? 0n : need - have;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2 font-mono text-[10.5px] uppercase tracking-wider">
        <span className="text-muted-alt">{label}</span>
        <span className="ml-auto text-ink font-bold normal-case tracking-normal">
          {current || "0"} <span className="text-muted-alt">/ {required || "—"}</span>
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-bg-alt overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div
          className={`h-full transition-all ${ready ? "bg-ok" : "bg-holo"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className={`font-mono text-[10px] ${ready ? "text-ok" : "text-muted"}`}>
        {ready ? "Credits ready" : `Short by ${formatCredits(shortBy)}`}
      </p>
    </div>
  );
}
