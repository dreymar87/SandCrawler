import { useMemo } from "react";
import { bestSrStop, srTimingTable } from "../../lib/srTiming";
import { planNovaPurchases } from "../../lib/novaPlan";
import { pickaxeLevelsKept } from "../../data/strategyTracks.seed";
import { NOVA_UPGRADES } from "../../data/novaShop.seed";
import { formatPerSecond } from "../../lib/production";
import { useActiveCycle, useNovaBalance, useProduction } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

const DEFAULT_SETUP_HOURS = 2;

/**
 * "What do I do right now" — the one card that answers the question the rest
 * of the tab supports with detail.
 *
 * Everything here is derived from sections further down; this exists so the
 * answer doesn't require scrolling through five of them.
 */
export function StrategySummary() {
  const cycle = useActiveCycle();
  const production = useProduction();
  const { balance } = useNovaBalance();
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);
  const pickaxeLevel = useAppStore((s) => s.profile.pickaxeLevel) ?? 0;
  const pickaxePeak = useAppStore((s) => s.profile.pickaxePeak) ?? 0;
  const novaUpgrades = useAppStore((s) => s.novaUpgrades);
  const setupHours = useAppStore((s) => s.ui.srSetupHours) ?? DEFAULT_SETUP_HOURS;
  const storedMult = useAppStore((s) => s.ui.creditMultiplier);
  const storedRate = useAppStore((s) => s.ui.measuredCreditsPerSec);

  const rate =
    storedRate && storedRate > 0
      ? BigInt(Math.round(storedRate))
      : storedMult && storedMult > 0
        ? BigInt(Math.round(Number(production.flat) * storedMult))
        : production.flat;

  const best = useMemo(() => {
    const rows = srTimingTable({
      cycle,
      creditsPerSec: rate,
      setupHours,
      multiplier:
        storedMult && storedMult > 0 ? { atCurrentLevel: storedMult, currentLevel } : undefined,
    });
    return bestSrStop(rows);
  }, [cycle, rate, setupHours, storedMult, currentLevel]);

  const nextBuy = useMemo(
    () =>
      planNovaPurchases({ upgrades: novaUpgrades, goal: "CRYSTALS_PER_HOUR", balance, limit: 1 })
        .steps[0],
    [novaUpgrades, balance],
  );

  // Mastery below your peak means you hand back pickaxe levels every Super
  // Rebirth — a loss that otherwise happens silently.
  const mastery = novaUpgrades.find((u) => u.id === "core.pickaxe-mastery")?.level ?? 0;
  const kept = pickaxeLevelsKept(mastery);
  const masteryGap = useMemo(() => {
    if (pickaxePeak <= kept) return null;
    const def = NOVA_UPGRADES.find((u) => u.id === "core.pickaxe-mastery");
    if (!def) return null;
    // Cheapest mastery level that covers the peak, and what it costs from here.
    let target = mastery;
    while (target < def.costs.length && pickaxeLevelsKept(target) < pickaxePeak) target++;
    let cost = 0;
    for (let lvl = mastery + 1; lvl <= target; lvl++) cost += def.costs[lvl - 1] ?? 0;
    return { lost: pickaxePeak - kept, target, cost };
  }, [pickaxePeak, kept, mastery]);

  const atBest = best && currentLevel >= best.level;

  return (
    <section className="card p-4 mb-4 border-holo-dim/50">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="font-display font-bold text-base">Right now</h2>
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-muted-alt">
          RB{currentLevel} · {balance} ◆
        </span>
      </div>

      <div className="space-y-2">
        {/* 1. The Super Rebirth call. */}
        {best ? (
          <Row
            label="Rebirth"
            tone={atBest ? "ok" : "holo"}
            value={atBest ? `Super Rebirth now` : `Push to RB${best.level}`}
            detail={
              atBest
                ? `You're at the best stop — ${best.crystals} crystals, then restart.`
                : `${best.level - currentLevel} more level${best.level - currentLevel === 1 ? "" : "s"} · ${best.crystalsPerHour.toFixed(1)} crystals/hour`
            }
          />
        ) : (
          <Row
            label="Rebirth"
            tone="warn"
            value="Need a credits/s figure"
            detail="Enter your rate below and this becomes a specific stopping level."
          />
        )}

        {/* 2. The next purchase. */}
        {nextBuy ? (
          <Row
            label="Buy next"
            tone={nextBuy.affordable ? "ok" : "muted"}
            value={`${nextBuy.name} ${nextBuy.levels === 1 ? `L${nextBuy.toLevel}` : `L${nextBuy.fromLevel}→L${nextBuy.toLevel}`}`}
            detail={
              nextBuy.affordable
                ? `${nextBuy.cost} ◆ — you can afford this.`
                : `${nextBuy.cost} ◆ — ${nextBuy.cost - balance} short.`
            }
          />
        ) : null}

        {/* 3. The silent loss, if there is one. */}
        {masteryGap ? (
          <Row
            label="Losing"
            tone="warn"
            value={`${masteryGap.lost} pickaxe level${masteryGap.lost === 1 ? "" : "s"} per rebirth`}
            detail={`Mastery keeps ${kept}, your peak is ${pickaxePeak}. L${masteryGap.target} closes it for ${masteryGap.cost} ◆.`}
          />
        ) : pickaxeLevel > 0 ? (
          <Row
            label="Pickaxe"
            tone="ok"
            value={`L${pickaxeLevel}, all kept`}
            detail={`Mastery preserves ${kept} — at or above your peak of ${pickaxePeak}.`}
          />
        ) : null}

        {/* 4. The rate everything above rests on. */}
        <Row
          label="Rate"
          tone="muted"
          value={formatPerSecond(rate)}
          detail={
            storedRate && storedRate > 0
              ? "Measured."
              : "Estimated from Droidex income — it can't see scrap credits."
          }
        />
      </div>
    </section>
  );
}

const TONE: Record<string, string> = {
  ok: "text-ok",
  holo: "text-holo",
  warn: "text-warn",
  muted: "text-muted",
};

function Row({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: keyof typeof TONE;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-alt w-14 shrink-0 pt-1">
        {label}
      </span>
      <div className="flex-1 min-w-0">
        <div className={`font-mono text-[12.5px] font-bold ${TONE[tone]}`}>{value}</div>
        <div className="font-mono text-[10px] text-muted-alt leading-snug">{detail}</div>
      </div>
    </div>
  );
}
