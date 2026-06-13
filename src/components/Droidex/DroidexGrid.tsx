import { useMemo } from "react";
import { TIERS, RARITIES, CLASSES } from "../../constants";
import { DROID_DICT } from "../../data/droids.seed";
import { useAppStore } from "../../store/useAppStore";
import { useDroidexCompletion } from "../../store/selectors";
import type { CollectionCard, DroidClass, DroidDef, Rarity, Tier } from "../../types";

/**
 * The Droidex grid: every known droid × every tier as a tappable cell.
 *
 * Tap cycles each cell missing → owned → active → missing. Filters apply
 * to the row level (whole droid), with cells outside the droid's tier
 * range hidden (e.g. MYTHIC droids show only the DEFAULT cell).
 */
export function DroidexGrid() {
  const cards = useAppStore((s) => s.cards);
  const customDroids = useAppStore((s) => s.customDroids);
  const cycleCard = useAppStore((s) => s.cycleCard);
  const setUiPref = useAppStore((s) => s.setUiPref);
  const rarityFilter = useAppStore((s) => s.ui.rarityFilter ?? "ALL");
  const classFilter = useAppStore((s) => s.ui.classFilter ?? "ALL");
  const tierFilter = useAppStore((s) => s.ui.tierFilter ?? "ALL");
  const collectedFilter = useAppStore((s) => s.ui.collectedFilter ?? "ALL");
  const completion = useDroidexCompletion();

  const dict = useMemo(() => [...DROID_DICT, ...customDroids], [customDroids]);

  // Map of (name|tier) → card for O(1) lookup during render.
  const cardIndex = useMemo(() => {
    const m = new Map<string, CollectionCard>();
    for (const c of cards) m.set(key(c.name, c.tier), c);
    return m;
  }, [cards]);

  const rows = useMemo(() => {
    return dict.filter((d) => {
      if (rarityFilter !== "ALL" && d.rarity !== rarityFilter) return false;
      if (classFilter !== "ALL" && d.class !== classFilter) return false;
      if (collectedFilter !== "ALL") {
        const anyOwned = d.tiers.some((t) => cardIndex.get(key(d.canonical, t))?.owned);
        if (collectedFilter === "OWNED" && !anyOwned) return false;
        if (collectedFilter === "MISSING" && anyOwned) return false;
      }
      return true;
    });
  }, [dict, cardIndex, rarityFilter, classFilter, collectedFilter]);

  return (
    <div>
      <section className="card p-4 mb-4 space-y-3">
        <header className="flex items-baseline gap-2">
          <h2 className="font-display font-bold text-base">Droidex</h2>
          <span className="font-mono text-[10.5px] text-muted">
            {completion.ownedCards} / {completion.totalCards} cards · {completion.ownedDroids} /{" "}
            {completion.totalDroids} droids
          </span>
        </header>
        <div className="h-1.5 rounded-full bg-bg-alt overflow-hidden">
          <div
            className="h-full bg-holo transition-all"
            style={{
              width: `${Math.round((completion.ownedCards / Math.max(1, completion.totalCards)) * 100)}%`,
            }}
          />
        </div>
        <p className="font-mono text-[10.5px] text-muted">
          Tap a cell once for <b className="text-ink">owned</b>, again for{" "}
          <b className="text-holo">active</b> (Working / Lounge), again to clear.
        </p>
      </section>

      <section className="card p-3 mb-4 space-y-2.5">
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center">
          <FilterRow
            label="Rarity"
            value={rarityFilter}
            options={["ALL", ...RARITIES] as const}
            onChange={(v) => setUiPref("rarityFilter", v as Rarity | "ALL")}
          />
          <FilterRow
            label="Class"
            value={classFilter}
            options={["ALL", ...CLASSES.filter((c) => c !== "UNKNOWN")] as const}
            onChange={(v) => setUiPref("classFilter", v as DroidClass | "ALL")}
          />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center">
          <FilterRow
            label="Tier"
            value={tierFilter}
            options={["ALL", ...TIERS] as const}
            onChange={(v) => setUiPref("tierFilter", v as Tier | "ALL")}
          />
          <FilterRow
            label="Collected"
            value={collectedFilter}
            options={["ALL", "OWNED", "MISSING"] as const}
            onChange={(v) =>
              setUiPref("collectedFilter", v as "ALL" | "OWNED" | "MISSING")
            }
          />
        </div>
      </section>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-muted text-center py-6">No droids match those filters.</p>
        ) : (
          rows.map((d) => (
            <DroidRow
              key={d.canonical}
              droid={d}
              cardIndex={cardIndex}
              onCycle={(tier) => cycleCard(d.canonical, tier)}
              tierFilter={tierFilter}
            />
          ))
        )}
      </div>
    </div>
  );
}

const key = (name: string, tier: Tier) => `${name.trim().toLowerCase()}|${tier}`;

interface FilterRowProps<V extends string> {
  label: string;
  value: V;
  options: readonly V[];
  onChange: (v: V) => void;
}

function FilterRow<V extends string>({ label, value, options, onChange }: FilterRowProps<V>) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mr-1">
        {label}
      </span>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border ${
            value === opt
              ? "border-holo text-holo bg-holo/10"
              : "border-line-alt text-muted hover:text-ink"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

interface DroidRowProps {
  droid: DroidDef;
  cardIndex: Map<string, CollectionCard>;
  onCycle: (tier: Tier) => void;
  tierFilter: Tier | "ALL";
}

function DroidRow({ droid, cardIndex, onCycle, tierFilter }: DroidRowProps) {
  return (
    <div className="card px-3 py-2.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-[14.5px] truncate">{droid.canonical}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="font-mono text-[9px] uppercase tracking-wide text-muted-alt">
            {droid.rarity}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wide text-muted">·</span>
          <span className="font-mono text-[9px] uppercase tracking-wide text-muted">{droid.class}</span>
          {droid.eventLocked ? (
            <span className="font-mono text-[9px] uppercase tracking-wide text-sun ml-1">
              Event
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex gap-1.5">
        {TIERS.map((t) => {
          const exists = droid.tiers.includes(t);
          const filtered = tierFilter !== "ALL" && tierFilter !== t;
          if (!exists || filtered) {
            return <div key={t} className="w-9 h-9 opacity-0 pointer-events-none" aria-hidden />;
          }
          const card = cardIndex.get(key(droid.canonical, t));
          return (
            <TierCell
              key={t}
              tier={t}
              owned={!!card?.owned}
              active={!!card?.active}
              onClick={() => onCycle(t)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface TierCellProps {
  tier: Tier;
  owned: boolean;
  active: boolean;
  onClick: () => void;
}

const TIER_ACCENT: Record<Tier, string> = {
  DEFAULT: "text-tier-default",
  GOLD: "text-tier-gold",
  DIAMOND: "text-tier-diamond",
  RAINBOW: "text-white",
  BESKAR: "text-tier-beskar",
};

const TIER_BG: Record<Tier, string> = {
  DEFAULT: "bg-tier-default/10",
  GOLD: "bg-tier-gold/15",
  DIAMOND: "bg-tier-diamond/15",
  RAINBOW: "bg-gradient-to-r from-[#ff5d5d] via-[#ffb84d] to-[#9b7bff] bg-opacity-20",
  BESKAR: "bg-tier-beskar/15",
};

const TIER_LABEL: Record<Tier, string> = {
  DEFAULT: "DF",
  GOLD: "GO",
  DIAMOND: "DI",
  RAINBOW: "RB",
  BESKAR: "BK",
};

function TierCell({ tier, owned, active, onClick }: TierCellProps) {
  const state = active ? "active" : owned ? "owned" : "missing";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${tier} (${state})`}
      title={`${tier} — ${state}`}
      className={`relative w-9 h-9 rounded-md border-2 grid place-items-center font-mono text-[10px] font-bold transition ${
        active
          ? `border-ok ${TIER_ACCENT[tier]} ${TIER_BG[tier]} shadow-[0_0_0_2px_rgba(86,208,138,0.15)]`
          : owned
            ? `border-line-alt ${TIER_ACCENT[tier]} ${TIER_BG[tier]}`
            : `border-dashed border-line text-muted-alt`
      }`}
    >
      {TIER_LABEL[tier]}
      {active ? (
        <span
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-ok ring-2 ring-bg"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
