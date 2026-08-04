import { useMemo, useState } from "react";
import { TIERS, RARITIES, CLASSES, CLASS_COLOR } from "../../constants";
import { DROID_DICT } from "../../data/droids.seed";
import { haptic } from "../../lib/native";
import { isDroidSafeToSell } from "../../lib/cycleStrategy";
import { droidCycles } from "../../lib/droidCycles";
import { companionBuffLabel } from "../../data/companionBuffs.seed";
import { normalizeName } from "../../lib/normalize";
import { useAppStore } from "../../store/useAppStore";
import { companionCapacity, NOVA_COMPANION_SLOT_ID } from "../../lib/baseView";
import { useActiveCycle, useDroidexCompletion } from "../../store/selectors";
import type { CollectionCard, DroidClass, DroidDef, Rarity, RebirthCycle, Tier } from "../../types";
import { Stepper } from "../common/Stepper";
import { SearchInput } from "../common/SearchInput";
import { DroidDetailModal } from "./DroidDetailModal";

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
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const rarityFilter = useAppStore((s) => s.ui.rarityFilter ?? "ALL");
  const classFilter = useAppStore((s) => s.ui.classFilter ?? "ALL");
  const tierFilter = useAppStore((s) => s.ui.tierFilter ?? "ALL");
  const collectedFilter = useAppStore((s) => s.ui.collectedFilter ?? "ALL");
  const strategyFilter = useAppStore((s) => s.ui.strategyFilter ?? "ALL");
  const rbcFilter = useAppStore((s) => s.ui.rbcFilter ?? "ALL");
  const rbcMissingOnly = useAppStore((s) => s.ui.rbcMissingOnly ?? false);
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);
  const activeCycle = useActiveCycle();
  const completion = useDroidexCompletion();

  // Which (droid, tier) cell is being edited. Only one open at a time.
  const [openCell, setOpenCell] = useState<{ droid: string; tier: Tier } | null>(null);
  // Which droid's read-only detail modal is open (by canonical name).
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const dict = useMemo(() => [...DROID_DICT, ...customDroids], [customDroids]);

  const cardIndex = useMemo(() => {
    const m = new Map<string, CollectionCard>();
    for (const c of cards) m.set(cardKey(c.name, c.tier), c);
    return m;
  }, [cards]);

  const rows = useMemo(() => {
    const q = normalizeName(search);
    return dict.filter((d) => {
      if (q) {
        const nameHit = normalizeName(d.canonical).includes(q);
        const aliasHit = (d.aliases ?? []).some((a) => normalizeName(a).includes(q));
        if (!nameHit && !aliasHit) return false;
      }
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
      // "SMART" resolves to the player's current active cycle.
      const effectiveRbc =
        rbcFilter === "ALL" ? null : rbcFilter === "SMART" ? activeCycle : rbcFilter;
      if (effectiveRbc !== null && !droidCycles(d.canonical).includes(effectiveRbc)) return false;
      // "Missing" sub-toggle (only meaningful with an RBC active): drop droids
      // already collected in the Droidex.
      if (rbcMissingOnly && effectiveRbc !== null) {
        const owned = d.tiers.some((t) => cardIndex.get(cardKey(d.canonical, t))?.owned);
        if (owned) return false;
      }
      return true;
    });
  }, [dict, cardIndex, search, rarityFilter, classFilter, collectedFilter, strategyFilter, rbcFilter, rbcMissingOnly, activeCycle, currentLevel]);

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
        <SearchInput value={search} onChange={setSearch} placeholder="Search the Droidex…" />
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
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center">
          <FilterRow
            label="RBC"
            value={rbcFilter === "ALL" ? "ALL" : rbcFilter === "SMART" ? "SMART" : String(rbcFilter)}
            options={["ALL", "SMART", "1", "2", "3", "4"] as const}
            onChange={(v) =>
              setUiPref(
                "rbcFilter",
                v === "ALL" ? "ALL" : v === "SMART" ? "SMART" : (Number(v) as RebirthCycle),
              )
            }
          />
          <button
            type="button"
            disabled={rbcFilter === "ALL"}
            onClick={() => setUiPref("rbcMissingOnly", !rbcMissingOnly)}
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border ${
              rbcFilter === "ALL"
                ? "border-line-alt text-muted-alt opacity-40 cursor-not-allowed"
                : rbcMissingOnly
                  ? "border-warn text-warn bg-warn/10"
                  : "border-line-alt text-muted hover:text-ink"
            }`}
          >
            Missing
          </button>
          <span className="font-mono text-[9.5px] text-muted-alt">
            {rbcFilter === "ALL"
              ? "filter by rebirth cycle that needs the droid"
              : rbcMissingOnly
                ? `not-yet-collected droids ${rbcFilter === "SMART" ? `RBC${activeCycle} (smart)` : `RBC${rbcFilter}`} needs`
                : rbcFilter === "SMART"
                  ? `= your current cycle (RBC${activeCycle})`
                  : "toggle Missing to hide ones you own"}
          </span>
          {rbcFilter !== "ALL" ? (
            <button
              type="button"
              className="font-mono text-[9.5px] uppercase tracking-wider text-holo underline"
              onClick={() => setActiveTab("rebirths")}
            >
              full plan →
            </button>
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
                  onOpenDetail={() => {
                    haptic("light");
                    setOpenDetail(d.canonical);
                  }}
                  tierFilter={tierFilter}
                />
                {openTier ? (
                  <CellEditor
                    def={d}
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

      {openDetail
        ? (() => {
            const detailDef = dict.find((d) => d.canonical === openDetail);
            if (!detailDef) return null;
            // Which tiers of this droid are on the base (working / lounge).
            const deployed: Partial<Record<Tier, { working: number; lounge: number }>> = {};
            for (const t of TIERS) {
              const c = cardIndex.get(cardKey(detailDef.canonical, t));
              if (c && (c.working > 0 || c.lounge > 0)) {
                deployed[t] = { working: c.working, lounge: c.lounge };
              }
            }
            return (
              <DroidDetailModal
                def={detailDef}
                deployed={deployed}
                activeCycle={activeCycle}
                onClose={() => setOpenDetail(null)}
              />
            );
          })()
        : null}
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
  onOpenDetail: () => void;
  tierFilter: Tier | "ALL";
}

function DroidRow({ droid, cardIndex, openTier, onCellTap, onOpenDetail, tierFilter }: DroidRowProps) {
  const cycles = droidCycles(droid.canonical);
  return (
    <div className="card px-3 py-2.5 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={onOpenDetail}
          className={`font-display font-semibold text-[14.5px] truncate max-w-full text-left transition-opacity hover:opacity-70 ${CLASS_COLOR[droid.class]}`}
          aria-label={`${droid.canonical} details`}
        >
          {droid.canonical}
        </button>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
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
          {cycles.length > 0 ? (
            <span className="font-mono text-[9px] uppercase tracking-wide text-holo-dim border border-holo-dim/40 rounded px-1 py-0.5">
              RBC {cycles.length === 4 ? "all" : cycles.join(",")}
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
  GALACTIC: "text-tier-galactic",
};

const TIER_BG: Record<Tier, string> = {
  DEFAULT: "bg-tier-default/10",
  GOLD: "bg-tier-gold/15",
  DIAMOND: "bg-tier-diamond/15",
  RAINBOW: "bg-gradient-to-r from-[#ff5d5d] via-[#ffb84d] to-[#9b7bff] bg-opacity-20",
  BESKAR: "bg-tier-beskar/15",
  GALACTIC: "bg-gradient-to-br from-fuchsia-500/25 to-amber-300/25",
};

const TIER_LABEL: Record<Tier, string> = {
  DEFAULT: "DF",
  GOLD: "GO",
  DIAMOND: "DI",
  RAINBOW: "RB",
  BESKAR: "BK",
  GALACTIC: "GA",
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
  def: DroidDef;
  tier: Tier;
  card: CollectionCard | undefined;
  onChange: (patch: Partial<Pick<CollectionCard, "owned" | "working" | "lounge" | "companion">>) => void;
  onClose: () => void;
}

function CellEditor({ def, tier, card, onChange, onClose }: CellEditorProps) {
  const droid = def.canonical;
  const working = card?.working ?? 0;
  const lounge = card?.lounge ?? 0;
  const companion = card?.companion ?? 0;
  const owned = !!card?.owned || working > 0 || lounge > 0 || companion > 0;
  const companionBonus =
    def.companionEffect ?? companionBuffLabel(def.class, def.rarity, tier);
  // Base slot + any bought from the Nova Shop.
  const companionCap = useAppStore((s) =>
    companionCapacity(s.novaUpgrades.find((u) => u.id === NOVA_COMPANION_SLOT_ID)?.level ?? 0),
  );

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

      <Stepper
        label="Working"
        accent="text-holo"
        hint="mines credits"
        value={working}
        onChange={(n) => onChange({ working: n })}
      />
      <Stepper
        label="Lounge"
        accent="text-sun"
        hint="parked, counts for rebirths"
        value={lounge}
        onChange={(n) => onChange({ lounge: n })}
      />
      <Stepper
        label="Companion"
        accent="text-tier-galactic"
        hint={
          companionBonus
            ? `${companionCap} slot${companionCap === 1 ? "" : "s"} · buff below`
            : `${companionCap} companion slot${companionCap === 1 ? "" : "s"}`
        }
        value={companion}
        min={0}
        max={companionCap}
        onChange={(n) => onChange({ companion: n })}
      />
      {companion > 0 && companionBonus ? (
        <div className="mt-1 pl-3 py-1.5 border-l-2 border-tier-galactic/50 bg-tier-galactic/5 rounded-r-md">
          <span className="font-mono text-[10px] uppercase tracking-wider text-tier-galactic">
            Companion buff
          </span>{" "}
          <span className="text-[12px] text-ink">{companionBonus}</span>
        </div>
      ) : null}
    </div>
  );
}
