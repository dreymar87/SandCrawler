import { useMemo, useState } from "react";
import type { CollectionCard, Rarity, RebirthCycle, Tier } from "../../types";
import { computeCycleStrategy, type CycleStrategy, type KeeperEntry } from "../../lib/cycleStrategy";
import { chipsBetween, formatChipCost } from "../../lib/chipCosts";
import { bestOwnedTier } from "../../lib/readiness";
import { satisfies } from "../../lib/tiers";
import { cycleLabel } from "../../lib/rebirthCycles";
import { useActiveCycle } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import { TierPill } from "../common/TierPill";

/**
 * Roll-up view for a whole SRB cycle: unique droids you need to keep,
 * target tier, RB levels where they appear, chip cost to reach the
 * target, and Have/Upgrade/Missing status against the player's roster.
 *
 * Defaults to the active cycle. The 1|2|3|4 chips let you plan for a
 * different cycle without mutating profile.cycleOverride.
 */
export function CycleStrategySection() {
  const activeCycle = useActiveCycle();
  const cards = useAppStore((s) => s.cards);
  const [pickedCycle, setPickedCycle] = useState<RebirthCycle>(activeCycle);

  const strategy = useMemo(() => computeCycleStrategy(pickedCycle), [pickedCycle]);

  // Per-rarity chip totals for what YOU still owe — accounts for what
  // you already own so the budget matches the individual row costs.
  const remainingTotals = useMemo(() => {
    const totals: Partial<Record<Exclude<Rarity, "ICONIC">, number>> = {};
    for (const k of strategy.keepers) {
      if (k.rarity === "ICONIC") continue;
      const owned = bestOwnedTier(k.name, cards);
      if (owned && satisfies(k.targetTier, owned)) continue; // already covered
      const chips = chipsBetween(k.rarity, owned ?? "DEFAULT", k.targetTier);
      if (chips === null || chips <= 0) continue;
      const key = k.rarity as Exclude<Rarity, "ICONIC">;
      totals[key] = (totals[key] ?? 0) + chips;
    }
    return totals;
  }, [strategy.keepers, cards]);

  const totalChips = Object.values(remainingTotals).reduce<number>((a, b) => a + (b ?? 0), 0);
  const summary = `${strategy.keepers.length} droids · ${formatChipCost(totalChips)} chips to buy`;

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
          <ChipBudget totals={remainingTotals} />
          <KeepersList entries={strategy.keepers} cards={cards} />
          <p className="font-mono text-[10.5px] text-muted-alt">
            Status compares against your Droidex. <b className="text-ink">Have</b> = you own the
            target tier (or higher) with a copy deployed.{" "}
            <b className="text-sun">Upgrade</b> = you own a lower tier deployed.{" "}
            <b className="text-muted">Missing</b> = no deployed copy.
          </p>
        </div>
      </details>
    </section>
  );
}

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

const RARITY_ORDER: readonly Rarity[] = ["MYTHIC", "LEGENDARY", "EPIC", "RARE", "COMMON"];

function ChipBudget({
  totals,
}: {
  totals: CycleStrategy["chipTotals"];
}) {
  const rows = RARITY_ORDER.filter((r) => (totals[r as Exclude<Rarity, "ICONIC">] ?? 0) > 0);
  if (rows.length === 0) return null;
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

function KeepersList({
  entries,
  cards,
}: {
  entries: KeeperEntry[];
  cards: readonly CollectionCard[];
}) {
  if (entries.length === 0) {
    return (
      <p className="font-mono text-[10.5px] text-muted-alt italic">
        No requirements found for this cycle.
      </p>
    );
  }
  return (
    <div className="rounded-[10px] border border-line overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 gap-y-1 px-3 py-2 bg-panel-alt font-mono text-[10px] uppercase tracking-wider text-muted-alt">
        <span>Droid</span>
        <span className="text-right">Target</span>
        <span className="text-right">Chips</span>
      </div>
      <ul className="divide-y divide-line">
        {entries.map((k) => (
          <KeeperRow key={k.name} entry={k} cards={cards} />
        ))}
      </ul>
    </div>
  );
}

function KeeperRow({ entry, cards }: { entry: KeeperEntry; cards: readonly CollectionCard[] }) {
  const owned = bestOwnedTier(entry.name, cards);
  const status = keeperStatus(owned, entry.targetTier);
  // Chips YOU still need to spend, given your current best tier — the
  // whole point of the strategy view is "what work remains," not
  // "what the full cost would have been from scratch."
  const remainingChips =
    status === "HAVE"
      ? 0
      : chipsBetween(entry.rarity, owned ?? "DEFAULT", entry.targetTier);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display font-semibold text-[13.5px] truncate">{entry.name}</span>
          <span className={`font-mono text-[9px] uppercase tracking-wide ${rarityAccent(entry.rarity)}`}>
            {entry.rarity}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <StatusChip status={status} />
          <span className="font-mono text-[10px] text-muted-alt">
            RB {entry.appearsAt.map((n) => n).join(", ")}
          </span>
          {status === "UPGRADE" && owned ? (
            <span className="font-mono text-[10px] text-sun">
              have {owned}
            </span>
          ) : null}
        </div>
      </div>
      <TierPill tier={entry.targetTier} />
      <span
        className={`font-mono text-[11.5px] font-semibold tabular-nums text-right ${
          status === "HAVE" ? "text-muted-alt" : ""
        }`}
      >
        {formatChipCost(remainingChips)}
      </span>
    </li>
  );
}

type Status = "HAVE" | "UPGRADE" | "MISSING";

function keeperStatus(owned: Tier | null, target: Tier): Status {
  if (owned === null) return "MISSING";
  if (satisfies(target, owned)) return "HAVE";
  return "UPGRADE";
}

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

