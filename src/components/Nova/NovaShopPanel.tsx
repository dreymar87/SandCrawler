import { nextLevelCost } from "../../lib/novaCrystals";
import { useNovaBalance, useNovaLevels, useNovaShop } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import type { NovaUpgrade } from "../../types";

/**
 * Nova Shop tab: two upgrade trees (Core / Workshop). Each upgrade
 * shows its current level, the cost of the next level, and a stepper
 * that won't go past data we have.
 */
export function NovaShopPanel() {
  const { core, workshop } = useNovaShop();
  const levels = useNovaLevels();
  const balance = useNovaBalance();
  const setLevel = useAppStore((s) => s.setNovaUpgradeLevel);

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">Nova Crystals balance</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <Stat n={balance.earned} k="Earned" />
          <Stat n={balance.spent} k="Spent" />
          <Stat n={balance.balance} k="Balance" highlight />
        </div>
        <p className="font-mono text-[10.5px] text-muted-alt mt-2">
          Spent is derived from purchased upgrade levels. Update earned on the Profile tab.
        </p>
      </section>

      <Tree title="Core Upgrades" items={core} levels={levels} balance={balance.balance} onLevel={setLevel} />
      <Tree title="Workshop Upgrades" items={workshop} levels={levels} balance={balance.balance} onLevel={setLevel} />
    </div>
  );
}

function Tree({
  title,
  items,
  levels,
  balance,
  onLevel,
}: {
  title: string;
  items: NovaUpgrade[];
  levels: Map<string, number>;
  balance: number;
  onLevel: (id: string, level: number) => void;
}) {
  return (
    <section className="card p-4">
      <h2 className="font-display font-bold text-base mb-3">{title}</h2>
      <div className="space-y-2">
        {items.map((u) => {
          const lvl = levels.get(u.id) ?? 0;
          const maxKnown = u.costs.length;
          const nextCost = nextLevelCost(u, lvl);
          const canAfford = nextCost !== null && nextCost <= balance;
          return (
            <div
              key={u.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-panel-alt border border-line"
            >
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-[14px] truncate">{u.name}</div>
                <div className="font-mono text-[10px] text-muted-alt">
                  Level {lvl} / {maxKnown}
                  {nextCost !== null ? (
                    <>
                      {" · next "}
                      <span className={canAfford ? "text-ok" : "text-warn"}>{nextCost} ◆</span>
                    </>
                  ) : (
                    " · max"
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="w-7 h-7 rounded-md border border-line-alt text-muted hover:text-ink disabled:opacity-30"
                  onClick={() => onLevel(u.id, lvl - 1)}
                  disabled={lvl === 0}
                  aria-label="Decrease"
                >
                  −
                </button>
                <span className="w-7 text-center font-display font-bold">{lvl}</span>
                <button
                  type="button"
                  className="w-7 h-7 rounded-md border border-line-alt text-muted hover:text-ink disabled:opacity-30"
                  onClick={() => onLevel(u.id, lvl + 1)}
                  disabled={nextCost === null}
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ n, k, highlight }: { n: number; k: string; highlight?: boolean }) {
  return (
    <div className="rounded-[10px] border border-line bg-panel-alt p-2.5 text-center">
      <div className={`font-display font-bold text-xl ${highlight ? "text-holo" : "text-ink"}`}>
        {n.toLocaleString()}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-alt mt-1">{k}</div>
    </div>
  );
}
