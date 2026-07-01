import { haptic } from "../../lib/native";
import { useCosmeticOwnership, useCosmeticsByKind } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import type { CosmeticItem, CosmeticKind } from "../../types";

const SECTION_LABEL: Record<CosmeticKind, string> = {
  HAT: "Hats",
  PAINT: "Paints",
  EFFECT: "Droid Effects",
};

/**
 * Cosmetics tab: three sections (Hats / Paints / Effects). Each item is
 * a tappable row showing the verbatim unlock requirement and an
 * owned/missing pill.
 */
export function CosmeticsPanel() {
  const grouped = useCosmeticsByKind();
  const ownership = useCosmeticOwnership();
  const setOwned = useAppStore((s) => s.setCosmeticOwned);

  return (
    <div className="space-y-4">
      {(["HAT", "PAINT", "EFFECT"] as CosmeticKind[]).map((kind) => {
        const items = grouped[kind];
        const ownedCount = items.filter((i) => ownership.get(i.id)).length;
        const pct = items.length ? Math.round((ownedCount / items.length) * 100) : 0;
        return (
          <section key={kind} className="card p-4">
            <header className="flex items-baseline gap-2 mb-3">
              <h2 className="font-display font-bold text-base">{SECTION_LABEL[kind]}</h2>
              <span className="font-mono text-[10.5px] text-muted">
                {ownedCount} / {items.length}
              </span>
              <span className="flex-1" />
              <span className="font-mono text-[10.5px] text-holo font-bold">{pct}%</span>
            </header>
            <div className="h-1.5 rounded-full bg-bg-alt overflow-hidden mb-3">
              <div className="h-full bg-holo transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="space-y-1.5">
              {items.map((item) => (
                <CosmeticRow
                  key={item.id}
                  item={item}
                  owned={!!ownership.get(item.id)}
                  onToggle={() => {
                    haptic("light");
                    setOwned(item.id, !ownership.get(item.id));
                  }}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CosmeticRow({
  item,
  owned,
  onToggle,
}: {
  item: CosmeticItem;
  owned: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-[10px] border transition ${
        owned
          ? "border-ok/40 bg-ok/5"
          : "border-line bg-panel-alt hover:border-line-alt"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium truncate">{item.name}</div>
        <div className="font-mono text-[10px] text-muted-alt truncate">{item.requirement}</div>
      </div>
      <span
        className={`status-tag ${owned ? "ok" : "miss"}`}
        aria-label={owned ? "owned" : "missing"}
      >
        {owned ? "Owned" : "—"}
      </span>
    </button>
  );
}
