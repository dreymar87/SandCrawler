import { useMemo, useState } from "react";
import {
  buildSwingSeconds,
  BUILD_SWINGS_PER_SEC,
  pickaxeLevelsKept,
  SCRAP_TIERS,
  scrapPileSwings,
  scrapSwingSeconds,
  type ScrapTierKey,
} from "../../data/strategyTracks.seed";
import { formatCredits, parseCredits } from "../../lib/credits";
import { formatPerSecond } from "../../lib/production";
import {
  creditsPerSecFromPile,
  reconcileRate,
  scrapReadingFrom,
} from "../../lib/scrapRate";
import { useProduction } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

const DEFAULT_SETUP_HOURS = 2;
const DEFAULT_UPTIME = 0.5;

/**
 * The gap between a pile reading and Droidex income, in words.
 *
 * Left raw this routinely reads "76104x lower", which looks like a bug rather
 * than a finding — the interesting fact is that the roster is stale, not the
 * exact size of a number that's mostly measuring how few droids are recorded.
 */
function formatGap(ratio: number): string {
  const [n, dir] = ratio >= 1 ? [ratio, "lower"] : [1 / ratio, "higher"];
  if (n >= 1000) return `orders of magnitude ${dir}`;
  return `${n < 10 ? n.toFixed(1) : n.toFixed(0)}× ${dir}`;
}

const UPTIME_CHOICES = [
  { value: 1, label: "Always" },
  { value: 0.5, label: "Half" },
  { value: 0.25, label: "Rarely" },
  { value: 0, label: "Never" },
];

/**
 * Every figure the strategy model can't measure for itself, in one place.
 *
 * These were previously scattered through the Super Rebirth section, which
 * made the tab read as though the recommendation came from nowhere. Grouping
 * them makes the dependency obvious: change a number here and every section
 * below moves.
 */
export function YourNumbersCard() {
  const production = useProduction();
  const setUiPref = useAppStore((s) => s.setUiPref);
  const setPickaxeLevel = useAppStore((s) => s.setPickaxeLevel);

  const setupHours = useAppStore((s) => s.ui.srSetupHours) ?? DEFAULT_SETUP_HOURS;
  const storedMult = useAppStore((s) => s.ui.creditMultiplier);
  const storedRate = useAppStore((s) => s.ui.measuredCreditsPerSec);
  const uptime = useAppStore((s) => s.ui.swingUptime) ?? DEFAULT_UPTIME;
  const currentLevel = useAppStore((s) => s.profile.standardRebirth);
  const pickaxeLevel = useAppStore((s) => s.profile.pickaxeLevel) ?? 0;
  const novaUpgrades = useAppStore((s) => s.novaUpgrades);

  const ui = useAppStore((s) => s.ui);
  const reading = scrapReadingFrom(ui);

  const [setupDraft, setSetupDraft] = useState(String(setupHours));
  const [multDraft, setMultDraft] = useState(storedMult ? String(storedMult) : "");
  const [rateDraft, setRateDraft] = useState(storedRate ? String(storedRate) : "");
  const [pickDraft, setPickDraft] = useState(String(pickaxeLevel));
  const [pileDraft, setPileDraft] = useState(reading.pileValue);

  const mastery = novaUpgrades.find((u) => u.id === "core.pickaxe-mastery")?.level ?? 0;
  const scrapLevel = novaUpgrades.find((u) => u.id === "workshop.scrap-value")?.level ?? 0;
  const swing = buildSwingSeconds(pickaxeLevel);
  const buildRate = 1 + BUILD_SWINGS_PER_SEC * swing;

  const num = (raw: string): number | undefined => {
    const n = Number(raw.trim().replace(/[,_]/g, ""));
    return raw.trim() === "" || !Number.isFinite(n) || n <= 0 ? undefined : n;
  };

  const expectedSwings = scrapPileSwings(reading.tier);
  const swings = reading.swings ?? expectedSwings;

  /**
   * Inverting the pile into a rate. The pile is the only credits/s meter the
   * game gives you — a swing pays a stated number of seconds of generation, so
   * dividing back out recovers the rate the whole tab depends on.
   */
  const derived = useMemo(
    () =>
      creditsPerSecFromPile({
        pileValue: reading.pileValue,
        tier: reading.tier,
        scrapValueLevel: scrapLevel,
        swings: reading.swings ?? undefined,
      }),
    [reading.pileValue, reading.tier, reading.swings, scrapLevel],
  );

  // The Droidex's own view, multiplier applied, for the sanity check below.
  const estimated = storedMult && storedMult > 0 ? Number(production.flat) * storedMult : 0;
  const check = derived ? reconcileRate(derived, estimated) : null;

  const commitReading = (patch: Partial<{ tier: ScrapTierKey; pileValue: string; swings: number | null }>) => {
    const next = { ...reading, ...patch };
    setUiPref("scrapReading", {
      tier: next.tier,
      pileValue: next.pileValue,
      ...(next.swings === null ? {} : { swings: next.swings }),
    });
    const rate = creditsPerSecFromPile({
      pileValue: next.pileValue,
      tier: next.tier,
      scrapValueLevel: scrapLevel,
      swings: next.swings ?? undefined,
    });
    // A cleared or unreadable pile shouldn't silently keep an old rate around.
    setUiPref("measuredCreditsPerSec", rate ?? undefined);
    setRateDraft(rate ? String(Math.round(rate)) : "");
  };

  return (
    <section className="card p-4 mb-4">
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="font-display font-bold text-base">Your numbers</h2>
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-muted-alt">everything below uses these</span>
      </div>
      <p className="font-mono text-[10px] text-muted-alt mb-3 leading-snug">
        The app can read your Droidex but not your multiplier, your scrap income or how you play.
        Fill these in and the recommendations become yours rather than generic.
      </p>

      {/* The credits/s meter. The game displays no rate anywhere, but a scrap
          swing pays a known number of seconds of generation — so a pile you can
          read off the screen inverts into the figure everything else needs. */}
      <div className="rounded-md border border-line-alt/70 p-2.5 mb-3">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-holo">
            Read a scrap pile
          </span>
          <span className="font-mono text-[9.5px] text-muted-alt">
            easier than measuring credits/s — the game never shows one
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 flex-wrap mb-2">
          {SCRAP_TIERS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => commitReading({ tier: t.key, swings: null })}
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border transition ${
                reading.tier === t.key
                  ? "border-holo bg-holo/10 text-holo"
                  : "border-line-alt text-muted hover:text-ink hover:border-holo-dim"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-baseline gap-2 mb-1.5">
          <label
            className="font-mono text-[10px] uppercase tracking-wider text-muted-alt w-28 shrink-0"
            htmlFor="yn-pile"
          >
            Pile paid
          </label>
          <input
            id="yn-pile"
            type="text"
            inputMode="decimal"
            className="input w-24 text-right tabular-nums shrink-0"
            value={pileDraft}
            placeholder="5M"
            onChange={(e) => setPileDraft(e.target.value)}
            onBlur={(e) => commitReading({ pileValue: e.target.value.trim() })}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
          <span className="font-mono text-[9.5px] text-muted-alt leading-snug">
            in {swings} swing{swings === 1 ? "" : "s"}
            {reading.swings === null ? "" : ` (expected ${expectedSwings})`}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt w-28 shrink-0">
            Swings
          </span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => commitReading({ swings: null })}
              className={`font-mono text-[10px] px-2 py-0.5 rounded-md border transition ${
                reading.swings === null
                  ? "border-holo bg-holo/10 text-holo"
                  : "border-line-alt text-muted hover:text-ink hover:border-holo-dim"
              }`}
            >
              {expectedSwings} · expected
            </button>
            {/* A pile above your pickaxe level costs extra swings for the same
                credits, which reads as a lower rate. */}
            {[expectedSwings * 2, expectedSwings * 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => commitReading({ swings: n })}
                className={`font-mono text-[10px] px-2 py-0.5 rounded-md border transition ${
                  reading.swings === n
                    ? "border-warn bg-warn/10 text-warn"
                    : "border-line-alt text-muted hover:text-ink hover:border-holo-dim"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <p className="font-mono text-[9.5px] leading-snug mt-2">
          {scrapLevel <= 0 ? (
            <span className="text-warn/80">
              Set your Scrap Value level in the Nova Shop first — without it there's nothing to
              divide by.
            </span>
          ) : derived ? (
            <>
              <span className="text-ok">
                {formatPerSecond(BigInt(Math.round(derived)))}
              </span>
              <span className="text-muted-alt">
                {" "}
                — {formatCredits(parseCredits(reading.pileValue))} over {swings} swing
                {swings === 1 ? "" : "s"}, at {scrapSwingSeconds(scrapLevel).toFixed(1)} s of
                generation each (Scrap Value L{scrapLevel}).
              </span>
              {check && !check.agrees ? (
                <span className="text-warn/80">
                  {" "}
                  Your Droidex says {formatPerSecond(BigInt(Math.round(estimated)))} —{" "}
                  {formatGap(check.ratio)}. The recorded roster probably doesn't match your base
                  any more.
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-muted-alt">
              Swing a pile, read what it paid, and every recommendation below becomes yours.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-2.5">
        <Field
          id="yn-rate"
          label="Credits / s"
          value={rateDraft}
          onDraft={setRateDraft}
          onCommit={(v) => setUiPref("measuredCreditsPerSec", num(v))}
          placeholder="measure it"
          width="w-24"
          note={
            storedRate && storedRate > 0
              ? derived && Math.abs(storedRate - derived) < 1
                ? "from the pile above"
                : "measured"
              : `estimated ${formatPerSecond(production.flat)} — droids only, no scrap`
          }
          warn={!(storedRate && storedRate > 0)}
        />

        <Field
          id="yn-mult"
          label="Credit multiplier"
          value={multDraft}
          onDraft={setMultDraft}
          onCommit={(v) => setUiPref("creditMultiplier", num(v))}
          placeholder="—"
          note={`× at RB${currentLevel} · read it after collecting, not at login`}
        />

        <Field
          id="yn-setup"
          label="Setup per run"
          value={setupDraft}
          onDraft={setSetupDraft}
          onCommit={(v) => setUiPref("srSetupHours", num(v) ?? DEFAULT_SETUP_HOURS)}
          note="hours to redeploy and grind back to where you started"
        />

        <Field
          id="yn-pickaxe"
          label="Pickaxe level"
          value={pickDraft}
          onDraft={setPickDraft}
          onCommit={(v) => setPickaxeLevel(num(v) ?? 0)}
          note={
            pickaxeLevel > 0
              ? `${swing.toFixed(1)}s a swing · ~${buildRate.toFixed(0)}× build rate · Mastery keeps ${pickaxeLevelsKept(mastery)}`
              : "gates the scrap station and sets your build speed"
          }
        />

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-alt w-28 shrink-0">
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
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onDraft,
  onCommit,
  note,
  placeholder,
  width = "w-20",
  warn,
}: {
  id: string;
  label: string;
  value: string;
  onDraft: (v: string) => void;
  onCommit: (v: string) => void;
  note: string;
  placeholder?: string;
  width?: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <label
        className="font-mono text-[10px] uppercase tracking-wider text-muted-alt w-28 shrink-0"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className={`input ${width} text-right tabular-nums shrink-0`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onDraft(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <span
        className={`font-mono text-[9.5px] leading-snug ${warn ? "text-warn/80" : "text-muted-alt"}`}
      >
        {note}
      </span>
    </div>
  );
}
