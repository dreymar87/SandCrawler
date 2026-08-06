import { useMemo } from "react";
import { bestSrStop, srTimingTable } from "../../lib/srTiming";
import { planNovaPurchases } from "../../lib/novaPlan";
import { pickaxeLevelsKept } from "../../data/strategyTracks.seed";
import { NOVA_UPGRADES } from "../../data/novaShop.seed";
import { formatPerSecond } from "../../lib/production";
import { formatCredits } from "../../lib/credits";
import { scrapIncome } from "../../lib/scrapRate";
import { deployedByClass, PRODUCTION_CLASSES, upgradePayoffs } from "../../lib/incomeStrategy";
import { useActiveCycle, useNovaBalance, useProduction } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

const DEFAULT_SETUP_HOURS = 2;
const DEFAULT_UPTIME = 0.5;

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
  const cards = useAppStore((s) => s.cards);
  const uptime = useAppStore((s) => s.ui.swingUptime) ?? DEFAULT_UPTIME;
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

  /**
   * Where credits actually come from, and the cheapest way to raise them.
   *
   * The scrap swing pays a MULTIPLE of droid generation, so raising droid
   * income lifts both halves at once — which is why a free redeployment can
   * beat a crystal purchase here. Deliberately not one ranked list: crystals,
   * chips and free moves aren't a shared currency, and pretending otherwise is
   * the units error this project keeps relearning.
   */
  const credits = useMemo(() => {
    const scrapLevel = novaUpgrades.find((u) => u.id === "workshop.scrap-value")?.level ?? 0;
    const split = scrapIncome({
      creditsPerSec: Number(rate),
      scrapValueLevel: scrapLevel,
      swingUptime: uptime,
    });

    // Free: a lounge earner that belongs in a working slot.
    const byClass = deployedByClass({ cards, cycle, currentLevel, rebirthLevel: currentLevel });
    let free: { text: string; gain: bigint } | null = null;
    for (const cls of PRODUCTION_CLASSES) {
      for (const row of byClass[cls]) {
        if (!row.moveHint || row.moveHint.gain <= (free?.gain ?? 0n)) continue;
        free = {
          gain: row.moveHint.gain,
          text: row.moveHint.swapWith
            ? `Work ${row.name} over ${row.moveHint.swapWith.name}`
            : `Work ${row.name} — there's a free ${cls.toLowerCase()} slot`,
        };
      }
    }

    // Chips: the biggest tier upgrade on a droid already working.
    const payoff = upgradePayoffs({ cards, cycle, currentLevel })[0] ?? null;

    return { split, free, payoff };
  }, [novaUpgrades, rate, uptime, cards, cycle, currentLevel]);

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

        {/* 4. Raising credits — the thing that moves every row above. */}
        {credits.free ? (
          <Row
            label="Credits"
            tone="ok"
            value={`${credits.free.text} · +${formatCredits(credits.free.gain)}/s`}
            detail={`Free — a redeployment, not a purchase. Worth ${formatCredits(
              BigInt(Math.round(Number(credits.free.gain) * credits.split.droidLeverage)),
            )}/s once the scrap swing multiplies it.`}
          />
        ) : credits.payoff ? (
          <Row
            label="Credits"
            tone="holo"
            value={`Upgrade ${credits.payoff.name} to ${credits.payoff.nextTier} · +${formatCredits(credits.payoff.totalGain)}/s`}
            detail={`${credits.payoff.chips === null ? "Chip cost unknown" : `${credits.payoff.chips.toLocaleString()} chips`}. Droid income is multiplied ${credits.split.droidLeverage.toFixed(2)}× by your scrap swings, so it pays twice.`}
          />
        ) : null}

        {/* 5. The rate everything above rests on. */}
        <Row
          label="Rate"
          tone="muted"
          value={formatPerSecond(rate)}
          detail={
            credits.split.scrapShare > 0
              ? `${Math.round((1 - credits.split.scrapShare) * 100)}% droids · ${Math.round(
                  credits.split.scrapShare * 100,
                )}% scrap. ${
                  storedRate && storedRate > 0
                    ? "Measured."
                    : "Estimated from Droidex income — it can't see scrap credits."
                }`
              : storedRate && storedRate > 0
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
