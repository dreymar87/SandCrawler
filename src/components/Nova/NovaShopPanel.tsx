import { ICONIC_MERCHANT_COST, NOVA_ICONIC_PURCHASES } from "../../data/novaShop.seed";
import { formatCredits } from "../../lib/credits";
import { haptic } from "../../lib/native";
import { nextLevelCost } from "../../lib/novaCrystals";
import {
  useIconicMerchant,
  useIconicPurchases,
  useNovaBalance,
  useNovaLevels,
  useNovaShop,
} from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";
import type { NovaUpgrade } from "../../types";

const MERCHANT_PRICE = formatCredits(BigInt(ICONIC_MERCHANT_COST));

/**
 * Nova Shop tab: two upgrade trees (Core / Workshop), plus one-shot
 * ICONIC droid purchases. Each upgrade row shows current/max level,
 * next-level cost (with "?" when unknown), and affordability.
 */
export function NovaShopPanel() {
  const { featured, core, workshop } = useNovaShop();
  const levels = useNovaLevels();
  const balance = useNovaBalance();
  const iconicOwned = useIconicPurchases();
  const merchantBought = useIconicMerchant();
  const setLevel = useAppStore((s) => s.setNovaUpgradeLevel);
  const setIconicPurchased = useAppStore((s) => s.setIconicPurchased);
  const setIconicMerchantBought = useAppStore((s) => s.setIconicMerchantBought);
  const unlockedIconics = NOVA_ICONIC_PURCHASES.filter((p) =>
    iconicOwned.get(p.droid.toUpperCase()),
  );

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
          Spent counts upgrade levels + ICONIC droid purchases. Update earned on the Profile tab.
        </p>
      </section>

      <Tree
        title="Featured Upgrades"
        items={featured}
        levels={levels}
        balance={balance.balance}
        onLevel={(id, lvl) => {
          haptic("light");
          setLevel(id, lvl);
        }}
      />
      <Tree
        title="Core Upgrades"
        items={core}
        levels={levels}
        balance={balance.balance}
        onLevel={(id, lvl) => {
          haptic("light");
          setLevel(id, lvl);
        }}
      />
      <Tree
        title="Workshop Upgrades"
        items={workshop}
        levels={levels}
        balance={balance.balance}
        onLevel={(id, lvl) => {
          haptic("light");
          setLevel(id, lvl);
        }}
      />

      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-3">ICONIC Droids</h2>
        <p className="font-mono text-[10.5px] text-muted-alt mb-3">
          Unlock with crystals (permanent). Unlocking enables the droid in the Iconic Droid
          Merchant below, where each copy costs {MERCHANT_PRICE} credits per cycle.
        </p>
        <div className="space-y-2">
          {NOVA_ICONIC_PURCHASES.map((p) => {
            const owned = !!iconicOwned.get(p.droid.toUpperCase());
            const canAfford = balance.balance >= p.crystals;
            return (
              <button
                key={p.droid}
                type="button"
                onClick={() => {
                  haptic("light");
                  setIconicPurchased(p.droid, !owned);
                }}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition ${
                  owned
                    ? "border-ok/40 bg-ok/5"
                    : "border-line bg-panel-alt hover:border-line-alt"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-[14px] truncate">{p.droid}</div>
                  <div className="font-mono text-[10px] text-muted-alt">
                    {p.crystals} ◆
                    {!owned && !canAfford ? (
                      <span className="text-warn"> · short {p.crystals - balance.balance}</span>
                    ) : null}
                  </div>
                </div>
                <span className={`status-tag ${owned ? "ok" : "miss"}`}>
                  {owned ? "Unlocked" : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-display font-bold text-base mb-1">Iconic Droid Merchant</h2>
        <p className="font-mono text-[10.5px] text-muted-alt mb-3">
          Buy an unlocked iconic here for <span className="text-sun">{MERCHANT_PRICE}</span> credits
          each. These purchases reset on Super Rebirth.
        </p>
        {unlockedIconics.length === 0 ? (
          <p className="text-muted text-[13px]">
            Unlock iconic droids above to buy them from the merchant.
          </p>
        ) : (
          <div className="space-y-2">
            {unlockedIconics.map((p) => {
              const bought = !!merchantBought.get(p.droid.toUpperCase());
              return (
                <button
                  key={p.droid}
                  type="button"
                  onClick={() => {
                    haptic("light");
                    setIconicMerchantBought(p.droid, !bought);
                  }}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-[10px] border transition ${
                    bought
                      ? "border-ok/40 bg-ok/5"
                      : "border-line bg-panel-alt hover:border-line-alt"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-[14px] truncate">{p.droid}</div>
                    <div className="font-mono text-[10px] text-muted-alt">
                      {MERCHANT_PRICE} credits
                    </div>
                  </div>
                  <span className={`status-tag ${bought ? "ok" : "miss"}`}>
                    {bought ? "Bought" : "Buy"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
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
          const next = nextLevelCost(u, lvl);
          const isMax = next.kind === "max";
          const canAfford = next.kind === "known" && next.cost <= balance;
          return (
            <div
              key={u.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-panel-alt border border-line"
            >
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-[14px] truncate">{u.name}</div>
                <div className="font-mono text-[10px] text-muted-alt">
                  Level {lvl} / {maxKnown}
                  {next.kind === "known" ? (
                    <>
                      {" · next "}
                      <span className={canAfford ? "text-ok" : "text-warn"}>{next.cost} ◆</span>
                    </>
                  ) : next.kind === "unknown" ? (
                    <> · next <span className="text-muted">? ◆</span></>
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
                  disabled={isMax}
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
