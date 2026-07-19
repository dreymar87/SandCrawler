import { useMemo } from "react";
import { NOVA_UPGRADES } from "../../data/novaShop.seed";
import { formatPerSecond } from "../../lib/production";
import {
  useBaseView,
  useNovaLevels,
  useProduction,
  useSrbBonusAtCurrentRB,
} from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

/**
 * One place for "what bonuses do I have right now" — production, the
 * companion buff, every owned Nova-shop upgrade, and the Super Rebirth
 * multiplier at the current RB. Collapsible; composes existing hooks.
 */
export function ActiveBonuses() {
  const production = useProduction();
  const base = useBaseView();
  const novaLevels = useNovaLevels();
  const srb = useSrbBonusAtCurrentRB();
  const standardRebirth = useAppStore((s) => s.profile.standardRebirth);

  const ownedUpgrades = useMemo(
    () =>
      NOVA_UPGRADES.map((u) => ({ name: u.name, level: novaLevels.get(u.id) ?? 0 }))
        .filter((u) => u.level > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [novaLevels],
  );

  return (
    <section className="card p-0">
      <details className="group" open>
        <summary className="cursor-pointer select-none px-4 py-3 flex items-baseline gap-2 list-none">
          <span className="font-display font-bold text-base">Active bonuses</span>
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-holo group-open:hidden">show</span>
          <span className="font-mono text-[10.5px] text-holo hidden group-open:inline">hide</span>
        </summary>
        <div className="px-4 pb-4 space-y-3">
          {/* Production */}
          <BonusRow label="Production">
            <span className="font-display font-bold text-holo">
              {formatPerSecond(production.flat)}
            </span>
            {production.percentLabels.length > 0 ? (
              <span className="font-mono text-[10.5px] text-sun ml-2">
                + {production.percentLabels.join(" + ")}
              </span>
            ) : null}
          </BonusRow>

          {/* Companion */}
          <BonusRow label="Companion">
            {base.companion.bonus ? (
              <span className="text-[13px] text-tier-galactic">{base.companion.bonus}</span>
            ) : (
              <span className="font-mono text-[11px] text-muted-alt">none set</span>
            )}
          </BonusRow>

          {/* Super Rebirth multiplier */}
          <BonusRow label="Super Rebirth">
            {srb ? (
              <span className="font-mono text-[12px]">
                <span className="text-holo">{Math.round(srb.creditMult * 100)}%</span> credits ·{" "}
                <span className="text-holo">{Math.round(srb.xpMult * 100)}%</span> XP
              </span>
            ) : (
              <span className="font-mono text-[11px] text-muted-alt">
                starts at RB12 (you're at RB{standardRebirth})
              </span>
            )}
          </BonusRow>

          {/* Nova upgrades owned */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-1.5">
              Nova upgrades
            </div>
            {ownedUpgrades.length === 0 ? (
              <p className="font-mono text-[11px] text-muted-alt">
                None yet — buy some on the Shop tab.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {ownedUpgrades.map((u) => (
                  <span
                    key={u.name}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel-alt px-2 py-1"
                  >
                    <span className="font-mono text-[10.5px]">{u.name}</span>
                    <span className="font-mono text-[10px] text-holo font-bold">L{u.level}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}

function BonusRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt w-24 shrink-0">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
