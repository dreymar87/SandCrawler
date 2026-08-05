import { useMemo } from "react";
import { cumulativeValue, efficientOrder } from "../../lib/upgradeValue";
import { MEASURED_EFFECTS } from "../../data/strategyTracks.seed";
import { useNovaBalance } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

const DEFAULT_UPTIME = 0.5;
const UPTIME_CHOICES = [
  { value: 1, label: "Always" },
  { value: 0.5, label: "Half" },
  { value: 0.25, label: "Rarely" },
  { value: 0, label: "Never" },
];

/**
 * The computed half of the buy order.
 *
 * Where an upgrade's effect magnitude is actually known, its levels can be
 * converted to one currency — percent of base credits/s per crystal — and
 * ranked by arithmetic rather than argument. Only a couple of upgrades qualify
 * so far, which is exactly why this sits beside the editorial track instead of
 * replacing it.
 */
export function MeasuredValueSection() {
  const upgrades = useAppStore((s) => s.novaUpgrades);
  const setUiPref = useAppStore((s) => s.setUiPref);
  const stored = useAppStore((s) => s.ui.swingUptime);
  const { balance } = useNovaBalance();
  const uptime = stored ?? DEFAULT_UPTIME;

  const order = useMemo(
    () => efficientOrder({ upgrades, swingUptime: uptime, limit: 14 }),
    [upgrades, uptime],
  );

  // How far the current balance reaches down the ranked list.
  const affordableThrough = useMemo(() => {
    let spent = 0;
    let n = 0;
    for (const l of order) {
      if (spent + l.cost > balance) break;
      spent += l.cost;
      n++;
    }
    return n;
  }, [order, balance]);

  const totals = cumulativeValue(order);

  return (
    <section className="card p-4 mb-4">
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="font-display font-bold text-base">Measured value</h2>
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-ok">✓ computed</span>
      </div>
      <p className="font-mono text-[10px] text-muted-alt mb-3 leading-snug">
        Ranked by percent of your base credits/s gained per crystal spent. Covers only the{" "}
        {MEASURED_EFFECTS.length} upgrades whose in-game effect has actually been measured —
        everything else is in the list above, ordered by argument.
      </p>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mr-1">
          Swinging
        </span>
        {UPTIME_CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setUiPref("swingUptime", c.value)}
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border transition ${
              uptime === c.value
                ? "border-holo bg-holo/10 text-holo"
                : "border-line-alt text-muted hover:text-ink hover:border-holo-dim"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full font-mono text-[11px] tabular-nums">
          <thead>
            <tr className="text-muted-alt text-[9.5px] uppercase tracking-wider">
              <th className="text-left font-normal pb-1.5">#</th>
              <th className="text-left font-normal pb-1.5">Buy</th>
              <th className="text-right font-normal pb-1.5">Cost</th>
              <th className="text-right font-normal pb-1.5" title="Percent of base credits/s added">
                Gain
              </th>
              <th className="text-right font-normal pb-1.5" title="Percent of base per crystal">
                Per ◆
              </th>
            </tr>
          </thead>
          <tbody>
            {order.map((l, i) => (
              <tr
                key={`${l.id}-${l.level}`}
                className={`border-t border-line/60 ${
                  i < affordableThrough ? "text-ok" : "text-muted"
                }`}
              >
                <td className="py-1.5 text-left text-muted-alt">{i + 1}</td>
                <td className="py-1.5 text-left">
                  {l.name} <span className="text-muted-alt">L{l.level}</span>
                  {l.activeOnly ? (
                    <span className="text-[9px] text-sun ml-1" title="Only pays while actively playing">
                      ⚡
                    </span>
                  ) : null}
                </td>
                <td className="py-1.5 text-right">{l.cost} ◆</td>
                <td className="py-1.5 text-right">+{Math.round(l.gain * 100)}%</td>
                <td className="py-1.5 text-right">{(l.gain * 100 / l.cost).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.length > 0 ? (
        <p className="font-mono text-[10px] text-muted-alt mt-3 leading-snug">
          All {order.length}: <span className="text-holo">{totals.crystals} ◆</span> for{" "}
          <span className="text-ok">+{Math.round(totals.gain * 100)}%</span> of your base rate.
          {affordableThrough > 0 ? ` You can afford the first ${affordableThrough}.` : ""}{" "}
          <span className="text-sun">⚡</span> marks upgrades that only pay while you're actively
          swinging — the ranking already scales them by the setting above.
        </p>
      ) : (
        <p className="font-mono text-[11px] text-ok">
          Every measured upgrade is maxed out for this playstyle.
        </p>
      )}
    </section>
  );
}
