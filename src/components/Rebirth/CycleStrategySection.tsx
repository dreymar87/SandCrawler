import { useMemo, useState } from "react";
import type { Rarity, RebirthCycle, Tier } from "../../types";
import { computeCycleStrategy, type CycleStrategy, type KeeperEntry } from "../../lib/cycleStrategy";
import { chipsBetween, formatChipCost } from "../../lib/chipCosts";
import { bestOwnedTier } from "../../lib/readiness";
import { satisfies } from "../../lib/tiers";
import { cycleLabel } from "../../lib/rebirthCycles";
import { useActiveCycle } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";

/** How many upcoming RBs count as "focus / urgent." */
const FOCUS_LOOKAHEAD = 3;

type Status = "HAVE" | "UPGRADE" | "MISSING";
const STATUS_ORDER: Record<Status, number> = { MISSING: 0, UPGRADE: 1, HAVE: 2 };

interface EnrichedEntry extends KeeperEntry {
  status: Status;
  ownedTier: Tier | null;
  remainingChips: number | null;
  /** True iff this droid is required within the next FOCUS_LOOKAHEAD RBs
   *  and isn't already HAVE — i.e. real to-do items. */
  urgent: boolean;
}

/**
 * Roll-up view for a whole SRB cycle: unique droids you need to keep,
 * target tier, RB levels where they appear, remaining chip cost, and
 * Have/Upgrade/Missing status vs your Droidex.
 *
 * Defaults to the active cycle. The 1|2|3|4 chips let you plan for a
 * different cycle without mutating profile.cycleOverride.
 */
export function CycleStrategySection() {
  const activeCycle = useActiveCycle();
  const cards = useAppStore((s) => s.cards);
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);
  const [pickedCycle, setPickedCycle] = useState<RebirthCycle>(activeCycle);
  const [hideCompleted, setHideCompleted] = useState(false);

  const strategy = useMemo(() => computeCycleStrategy(pickedCycle), [pickedCycle]);

  // Enrich each keeper with status, owned tier, remaining chips, and
  // urgency (first-needed within currentRB + FOCUS_LOOKAHEAD). Doing
  // this once here means every downstream view (Focus, Chip Budget,
  // grouped list) shares the exact same numbers.
  const enriched: EnrichedEntry[] = useMemo(() => {
    return strategy.keepers.map((k) => {
      const owned = bestOwnedTier(k.name, cards);
      const status: Status =
        owned === null ? "MISSING" : satisfies(k.targetTier, owned) ? "HAVE" : "UPGRADE";
      const remainingChips =
        status === "HAVE" ? 0 : chipsBetween(k.rarity, owned ?? "DEFAULT", k.targetTier);
      const urgent =
        status !== "HAVE" &&
        k.firstNeeded > currentLevel &&
        k.firstNeeded <= currentLevel + FOCUS_LOOKAHEAD;
      return { ...k, status, ownedTier: owned, remainingChips, urgent };
    });
  }, [strategy.keepers, cards, currentLevel]);

  const remainingTotals = useMemo(() => {
    const totals: Partial<Record<Exclude<Rarity, "ICONIC">, number>> = {};
    for (const k of enriched) {
      if (k.rarity === "ICONIC" || k.status === "HAVE" || !k.remainingChips) continue;
      const key = k.rarity as Exclude<Rarity, "ICONIC">;
      totals[key] = (totals[key] ?? 0) + k.remainingChips;
    }
    return totals;
  }, [enriched]);

  const totalChips = Object.values(remainingTotals).reduce<number>((a, b) => a + (b ?? 0), 0);
  const summary = `${strategy.keepers.length} droids · ${formatChipCost(totalChips)} chips to buy`;

  const urgentEntries = useMemo(
    () => enriched.filter((k) => k.urgent).sort((a, b) => a.firstNeeded - b.firstNeeded),
    [enriched],
  );

  return (
    <section className="card p-0 mt-4 mb-4">
      <details className="group" open>
        <summary className="cursor-pointer select-none px-4 py-3 flex items-baseline gap-2 list-none flex-wrap">
          <span className="font-display font-bold text-base">Cycle strategy</span>
          <span className="font-mono text-[10.5px] text-muted-alt">{summary}</span>
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-holo group-open:hidden">show</span>
          <span className="font-mono text-[10.5px] text-holo hidden group-open:inline">hide</span>
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <CyclePicker picked={pickedCycle} active={activeCycle} onPick={setPickedCycle} />
          {urgentEntries.length > 0 ? (
            <FocusSection
              entries={urgentEntries}
              currentLevel={currentLevel}
              pickedCycle={pickedCycle}
              activeCycle={activeCycle}
            />
          ) : null}
          <ChipBudget totals={remainingTotals} />
          <HideCompletedToggle value={hideCompleted} onChange={setHideCompleted} />
          <GroupedKeepersList entries={enriched} hideCompleted={hideCompleted} />
          <p className="font-mono text-[10.5px] text-muted-alt">
            Status compares against your Droidex. <b className="text-ok">Have</b> = you own the
            target tier (or higher) with a copy deployed.{" "}
            <b className="text-sun">Upgrade</b> = you own a lower tier deployed.{" "}
            <b className="text-muted">Missing</b> = no deployed copy. Rows marked{" "}
            <b className="text-danger">Urgent</b> are needed within your next {FOCUS_LOOKAHEAD}{" "}
            rebirths.
          </p>
        </div>
      </details>
    </section>
  );
}

// ── Cycle picker ─────────────────────────────────────────────────────────

function CyclePicker({
  picked,
  active,
  onPick,
}: {
  picked: RebirthCycle;
  active: RebirthCycle;
  onPick: (c: RebirthCycle) => void;
}) {
  const cycles: RebirthCycle[] = [1, 2, 3, 4];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mr-1">
        Planning for
      </span>
      {cycles.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className={`font-mono text-[10.5px] uppercase tracking-wider px-2.5 py-1 rounded-md border transition ${
            picked === c
              ? "border-holo text-holo bg-holo/10"
              : "border-line-alt text-muted hover:text-ink"
          }`}
        >
          {cycleLabel(c)}
          {c === active ? <span className="ml-1 text-[9px] text-holo-dim">·now</span> : null}
        </button>
      ))}
    </div>
  );
}

// ── Focus on next N rebirths ─────────────────────────────────────────────

function FocusSection({
  entries,
  currentLevel,
  pickedCycle,
  activeCycle,
}: {
  entries: EnrichedEntry[];
  currentLevel: number;
  pickedCycle: RebirthCycle;
  activeCycle: RebirthCycle;
}) {
  const aspirational = pickedCycle !== activeCycle;
  // Group entries by the next RB level where they appear.
  const byLevel = new Map<number, EnrichedEntry[]>();
  for (const e of entries) {
    const level = e.firstNeeded;
    (byLevel.get(level) ?? byLevel.set(level, []).get(level)!).push(e);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  return (
    <div className="rounded-[10px] border border-danger/40 bg-danger/5 overflow-hidden">
      <div className="px-3 py-2 bg-danger/10 font-mono text-[10px] uppercase tracking-wider text-danger flex items-baseline gap-2 flex-wrap">
        <span className="font-bold">Focus · next {FOCUS_LOOKAHEAD} rebirths</span>
        <span className="text-danger/70 normal-case">
          from RB{currentLevel + 1}
          {aspirational ? ` (planning cycle ${pickedCycle})` : ""}
        </span>
      </div>
      <ul className="divide-y divide-danger/20">
        {levels.map((level) => {
          const rows = byLevel.get(level)!;
          return (
            <li key={level} className="px-3 py-2 flex items-baseline gap-3">
              <span className="font-display font-bold text-[13px] text-danger min-w-[3.5rem]">
                RB{level}
              </span>
              <div className="flex flex-wrap gap-x-3 gap-y-1 min-w-0">
                {rows.map((r) => (
                  <span key={r.name} className="font-mono text-[11px] leading-tight">
                    <span className="text-ink">{r.name}</span>
                    <span className={`ml-1 text-[9px] uppercase tracking-wide ${statusColor(r.status)}`}>
                      {r.status === "MISSING" ? "need" : `up→${r.targetTier.slice(0, 2)}`}
                    </span>
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Chip budget grid ─────────────────────────────────────────────────────

const RARITY_ORDER_DESC: readonly Rarity[] = ["MYTHIC", "LEGENDARY", "EPIC", "RARE", "COMMON"];
const RARITY_ORDER_ASC: readonly Rarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];

function ChipBudget({
  totals,
}: {
  totals: CycleStrategy["chipTotals"];
}) {
  const rows = RARITY_ORDER_DESC.filter((r) => (totals[r as Exclude<Rarity, "ICONIC">] ?? 0) > 0);
  if (rows.length === 0) {
    return (
      <div className="rounded-[10px] border border-ok/30 bg-ok/5 px-3 py-2 font-mono text-[11px] text-ok">
        You already own every droid in this cycle at its target tier.
      </div>
    );
  }
  return (
    <div className="rounded-[10px] border border-line overflow-hidden">
      <div className="px-3 py-2 bg-panel-alt font-mono text-[10px] uppercase tracking-wider text-muted-alt">
        Chips still to buy (based on what you own)
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-2 px-3 py-2.5">
        {rows.map((r) => (
          <div key={r} className="flex flex-col">
            <span className={`font-mono text-[10px] uppercase tracking-wider ${rarityAccent(r)}`}>
              {r}
            </span>
            <span className="font-display font-bold text-[15px]">
              {formatChipCost(totals[r as Exclude<Rarity, "ICONIC">] ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hide-completed toggle ────────────────────────────────────────────────

function HideCompletedToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-colors relative ${
          value ? "bg-holo/70" : "bg-line-alt"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-4" : ""
          }`}
        />
      </button>
      <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-alt">
        Hide completed
      </span>
    </div>
  );
}

// ── Grouped keepers list ─────────────────────────────────────────────────

function GroupedKeepersList({
  entries,
  hideCompleted,
}: {
  entries: EnrichedEntry[];
  hideCompleted: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="font-mono text-[10.5px] text-muted-alt italic">
        No requirements found for this cycle.
      </p>
    );
  }
  // Filter + group + sort within each rarity: MISSING → UPGRADE → HAVE,
  // then earliest RB first.
  const groups: Array<{ rarity: Rarity; rows: EnrichedEntry[]; counts: Record<Status, number> }> = [];
  for (const rarity of RARITY_ORDER_ASC) {
    const all = entries.filter((e) => e.rarity === rarity);
    if (all.length === 0) continue;
    const counts: Record<Status, number> = { HAVE: 0, UPGRADE: 0, MISSING: 0 };
    for (const e of all) counts[e.status] += 1;
    const visible = hideCompleted ? all.filter((e) => e.status !== "HAVE") : all;
    if (visible.length === 0 && hideCompleted) continue; // whole rarity is done — hide
    const rows = [...visible].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.firstNeeded - b.firstNeeded,
    );
    groups.push({ rarity, rows, counts });
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-[10px] border border-ok/30 bg-ok/5 px-3 py-3 font-mono text-[11px] text-ok text-center">
        All keepers accounted for — nothing left to do this cycle.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <div key={g.rarity} className="rounded-[10px] border border-line overflow-hidden">
          <div className="px-3 py-2 bg-panel-alt flex items-baseline gap-2 flex-wrap">
            <span className={`font-display font-bold text-[12.5px] ${rarityAccent(g.rarity)}`}>
              {g.rarity}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt">
              {sumCounts(g.counts)} droids
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider">
              {g.counts.HAVE > 0 ? (
                <span className="text-ok mr-2">{g.counts.HAVE} have</span>
              ) : null}
              {g.counts.UPGRADE > 0 ? (
                <span className="text-sun mr-2">{g.counts.UPGRADE} upgrade</span>
              ) : null}
              {g.counts.MISSING > 0 ? (
                <span className="text-muted mr-2">{g.counts.MISSING} missing</span>
              ) : null}
            </span>
          </div>
          <ul className="divide-y divide-line">
            {g.rows.map((k) => (
              <KeeperRow key={k.name} entry={k} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function sumCounts(c: Record<Status, number>): number {
  return c.HAVE + c.UPGRADE + c.MISSING;
}

function KeeperRow({ entry }: { entry: EnrichedEntry }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-display font-semibold text-[13.5px] truncate">{entry.name}</span>
          {entry.urgent ? (
            <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-danger/60 text-danger bg-danger/10">
              Urgent
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <StatusChip status={entry.status} />
          <span className="font-mono text-[10px] text-muted-alt">
            RB {entry.appearsAt.join(", ")}
          </span>
          {entry.status === "UPGRADE" && entry.ownedTier ? (
            <span className="font-mono text-[10px] text-sun">have {entry.ownedTier}</span>
          ) : null}
        </div>
      </div>
      <TierPill tier={entry.targetTier} />
      <span
        className={`font-mono text-[11.5px] font-semibold tabular-nums text-right ${
          entry.status === "HAVE" ? "text-muted-alt" : ""
        }`}
      >
        {formatChipCost(entry.remainingChips)}
      </span>
    </li>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────

function StatusChip({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    HAVE: "border-ok/50 text-ok bg-ok/10",
    UPGRADE: "border-sun/50 text-sun bg-sun/10",
    MISSING: "border-line-alt text-muted",
  };
  const label: Record<Status, string> = {
    HAVE: "Have",
    UPGRADE: "Upgrade",
    MISSING: "Missing",
  };
  return (
    <span
      className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${styles[status]}`}
    >
      {label[status]}
    </span>
  );
}

function statusColor(s: Status): string {
  switch (s) {
    case "HAVE":
      return "text-ok";
    case "UPGRADE":
      return "text-sun";
    case "MISSING":
    default:
      return "text-muted-alt";
  }
}

function rarityAccent(r: Rarity): string {
  switch (r) {
    case "MYTHIC":
      return "text-fuchsia-300";
    case "LEGENDARY":
      return "text-amber-300";
    case "EPIC":
      return "text-violet-300";
    case "RARE":
      return "text-cyan-300";
    case "ICONIC":
      return "text-holo";
    case "COMMON":
    default:
      return "text-muted";
  }
}
