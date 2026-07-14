import { useMemo, useState } from "react";
import { TIERS, RARITIES, CLASSES } from "../../constants";
import { DROID_DICT } from "../../data/droids.seed";
import { haptic } from "../../lib/native";
import { isDroidSafeToSell } from "../../lib/cycleStrategy";
import { useAppStore } from "../../store/useAppStore";
import { useActiveCycle, useDroidexCompletion } from "../../store/selectors";
import type { CollectionCard, DroidClass, DroidDef, Rarity, Tier } from "../../types";

/**
 * The Droidex grid: every known droid × every tier as a tappable cell.
 *
 * Tap opens a per-cell editor with Owned + Working count + Lounge count.
 * Filters apply at the row level; cells outside a droid's tier range are
 * hidden (e.g. ICONIC droids show only the DEFAULT cell).
 */
export function DroidexGrid() {
  const cards = useAppStore((s) => s.cards);
  const customDroids = useAppStore((s) => s.customDroids);
  const setCardCounts = useAppStore((s) => s.setCardCounts);
  const setUiPref = useAppStore((s) => s.setUiPref);
  const rarityFilter = useAppStore((s) => s.ui.rarityFilter ?? "ALL");
  const classFilter = useAppStore((s) => s.ui.classFilter ?? "ALL");
  const tierFilter = useAppStore((s) => s.ui.tierFilter ?? "ALL");
  const collectedFilter = useAppStore((s) => s.ui.collectedFilter ?? "ALL");
  const strategyFilter = useAppStore((s) => s.ui.strategyFilter ?? "ALL");
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);
  const activeCycle = useActiveCycle();
  const completion = useDroidexCompletion();

  // Which (droid, tier) cell is being edited. Only one open at a time.
  const [openCell, setOpenCell] = useState<{ droid: string; tier: Tier } | null>(null);

  const dict = useMemo(() => [...DROID_DICT, ...customDroids], [customDroids]);

  const cardIndex = useMemo(() => {
    const m = new Map<string, CollectionCard>();
    for (const c of cards) m.set(cardKey(c.name, c.tier), c);
    return m;
  }, [cards]);

  const rows = useMemo(() => {
    return dict.filter((d) => {
      if (rarityFilter !== "ALL" && d.rarity !== rarityFilter) return false;
      if (classFilter !== "ALL" && d.class !== classFilter) return false;
      if (collectedFilter !== "ALL") {
        const anyOwned = d.tiers.some((t) => cardIndex.get(cardKey(d.canonical, t))?.owned);
        if (collectedFilter === "OWNED" && !anyOwned) return false;
        if (collectedFilter === "MISSING" && anyOwned) return false;
      }
      if (strategyFilter !== "ALL") {
        const safe = isDroidSafeToSell(d.canonical, activeCycle, currentLevel);
        if (strategyFilter === "KEEP" && safe) return false;
        if (strategyFilter === "SELL" && !safe) return false;
      }
      return true;
    });
  }, [dict, cardIndex, rarityFilter, classFilter, collectedFilter, strategyFilter, activeCycle, currentLevel]);

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
          Tap a cell to set counts for <b className="text-ink">owned</b>,{" "}
          <b className="text-holo">working</b> (mines credits), and{" "}
          <b className="text-sun">lounge</b> (parked, rebirth-eligible).
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
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center">
          <FilterRow
            label="Strategy"
            value={strategyFilter}
            options={["ALL", "KEEP", "SELL"] as const}
            onChange={(v) =>
              setUiPref("strategyFilter", v as "ALL" | "KEEP" | "SELL")
            }
          />
          {strategyFilter !== "ALL" ? (
            <span className="font-mono text-[9.5px] text-muted-alt">
              cycle {activeCycle} · RB {currentLevel}
            </span>
          ) : null}
        </div>
      </section>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-muted text-center py-6">No droids match those filters.</p>
        ) : (
          rows.map((d) => {
            const openTier = openCell?.droid === d.canonical ? openCell.tier : null;
            const openCard = openTier
              ? cardIndex.get(cardKey(d.canonical, openTier))
              : undefined;
            return (
              <div key={d.canonical}>
                <DroidRow
                  droid={d}
                  cardIndex={cardIndex}
                  openTier={openTier}
                  onCellTap={(tier) => {
                    haptic("light");
                    setOpenCell(
                      openCell?.droid === d.canonical && openCell.tier === tier
                        ? null
                        : { droid: d.canonical, tier },
                    );
                  }}
                  tierFilter={tierFilter}
                />
                {openTier ? (
                  <CellEditor
                    droid={d.canonical}
                    tier={openTier}
                    card={openCard}
                    onChange={(patch) => setCardCounts(d.canonical, openTier, patch)}
                    onClose={() => setOpenCell(null)}
                  />
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const cardKey = (name: string, tier: Tier) => `${name.trim().toLowerCase()}|${tier}`;

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
  openTier: Tier | null;
  onCellTap: (tier: Tier) => void;
  tierFilter: Tier | "ALL";
}

function DroidRow({ droid, cardIndex, openTier, onCellTap, tierFilter }: DroidRowProps) {
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
        {droid.companionEffect ? (
          <div className="font-mono text-[10px] text-holo-dim mt-1 leading-tight">
            <span className="uppercase tracking-wide text-muted-alt mr-1">Companion</span>
            {droid.companionEffect}
          </div>
        ) : null}
      </div>
      <div className="flex gap-1.5">
        {TIERS.map((t) => {
          const exists = droid.tiers.includes(t);
          const filtered = tierFilter !== "ALL" && tierFilter !== t;
          if (!exists || filtered) {
            return <div key={t} className="w-9 h-9 opacity-0 pointer-events-none" aria-hidden />;
          }
          const card = cardIndex.get(cardKey(droid.canonical, t));
          return (
            <TierCell
              key={t}
              tier={t}
              card={card}
              open={openTier === t}
              onClick={() => onCellTap(t)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface TierCellProps {
  tier: Tier;
  card?: CollectionCard;
  open: boolean;
  onClick: () => void;
}

const TIER_ACCENT: Record<Tier, string> = {
  DEFAULT: "text-tier-default",
  GOLD: "text-tier-gold",
  DIAMOND: "text-tier-diamond",
  RAINBOW: "text-white",
  BESKAR: "text-tier-beskar",
  FLAWLESS: "text-white",
};

const TIER_BG: Record<Tier, string> = {
  DEFAULT: "bg-tier-default/10",
  GOLD: "bg-tier-gold/15",
  DIAMOND: "bg-tier-diamond/15",
  RAINBOW: "bg-gradient-to-r from-[#ff5d5d] via-[#ffb84d] to-[#9b7bff] bg-opacity-20",
  BESKAR: "bg-tier-beskar/15",
  FLAWLESS: "bg-gradient-to-br from-fuchsia-400/30 to-cyan-300/30",
};

const TIER_LABEL: Record<Tier, string> = {
  DEFAULT: "DF",
  GOLD: "GO",
  DIAMOND: "DI",
  RAINBOW: "RB",
  BESKAR: "BK",
  FLAWLESS: "FL",
};

function TierCell({ tier, card, open, onClick }: TierCellProps) {
  const working = card?.working ?? 0;
  const lounge = card?.lounge ?? 0;
  const total = working + lounge;
  const owned = !!card?.owned;
  const state = working > 0 ? "working" : lounge > 0 ? "lounge" : owned ? "owned" : "missing";
  const border =
    open
      ? "border-holo ring-2 ring-holo/40"
      : state === "working"
        ? "border-holo shadow-[0_0_0_2px_rgba(70,199,224,0.15)]"
        : state === "lounge"
          ? "border-sun/70"
          : state === "owned"
            ? "border-line-alt"
            : "border-dashed border-line";
  const bg = state === "missing" ? "" : TIER_BG[tier];
  const text = state === "missing" ? "text-muted-alt" : TIER_ACCENT[tier];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${tier} (${state}${total ? ` ×${total}` : ""})`}
      title={`${tier} — ${state}${total > 1 ? ` ×${total}` : ""}`}
      aria-expanded={open}
      className={`relative w-9 h-9 rounded-md border-2 grid place-items-center font-mono text-[10px] font-bold transition ${border} ${bg} ${text}`}
    >
      {TIER_LABEL[tier]}
      {total > 1 ? (
        <span
          className={`absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full ${
            working > 0 ? "bg-holo text-[#04222B]" : "bg-sun text-[#221304]"
          } text-[9px] font-bold grid place-items-center ring-2 ring-bg`}
          aria-hidden
        >
          {total}
        </span>
      ) : total === 1 && state === "working" ? (
        <span
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-holo ring-2 ring-bg"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

interface CellEditorProps {
  droid: string;
  tier: Tier;
  card: CollectionCard | undefined;
  onChange: (patch: Partial<Pick<CollectionCard, "owned" | "working" | "lounge">>) => void;
  onClose: () => void;
}

function CellEditor({ droid, tier, card, onChange, onClose }: CellEditorProps) {
  const working = card?.working ?? 0;
  const lounge = card?.lounge ?? 0;
  const owned = !!card?.owned || working > 0 || lounge > 0;

  return (
    <div
      role="dialog"
      aria-label={`${droid} ${tier} deployment`}
      className="card mt-1 mb-2 px-3 py-3 border-holo-dim/60 view-enter"
    >
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display font-semibold text-[14px]">{droid}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-panel-alt text-muted-alt">
          {tier}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          className="text-muted hover:text-ink font-mono text-[10.5px] uppercase tracking-wider"
          onClick={onClose}
          aria-label="Close editor"
        >
          Done
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-alt w-16">
          Owned
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={owned}
          onClick={() => onChange({ owned: !owned })}
          className={`w-11 h-6 rounded-full transition-colors relative ${
            owned ? "bg-ok/70" : "bg-line-alt"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
              owned ? "translate-x-5" : ""
            }`}
          />
        </button>
        <span className="font-mono text-[10.5px] text-muted-alt">
          {working + lounge > 0 ? "auto-owned while deployed" : "toggle to mark collected"}
        </span>
      </div>

      <CountRow
        label="Working"
        accent="text-holo"
        hint="mines credits"
        value={working}
        onChange={(n) => onChange({ working: n })}
      />
      <CountRow
        label="Lounge"
        accent="text-sun"
        hint="parked, counts for rebirths"
        value={lounge}
        onChange={(n) => onChange({ lounge: n })}
      />
    </div>
  );
}

function CountRow({
  label,
  accent,
  hint,
  value,
  onChange,
}: {
  label: string;
  accent: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className={`font-mono text-[11px] uppercase tracking-wider w-16 ${accent}`}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="w-7 h-7 rounded-md border border-line-alt text-muted hover:text-ink disabled:opacity-30"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          −
        </button>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          className="w-14 text-center font-display font-bold text-lg bg-panel-alt border border-line rounded-md py-1"
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          aria-label={`${label} count`}
        />
        <button
          type="button"
          className="w-7 h-7 rounded-md border border-line-alt text-muted hover:text-ink"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          +
        </button>
      </div>
      <span className="font-mono text-[10.5px] text-muted-alt truncate">{hint}</span>
    </div>
  );
}
