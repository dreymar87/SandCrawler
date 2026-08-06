import { useState } from "react";
import {
  buildSwingSeconds,
  BUILD_SWINGS_PER_SEC,
  pickaxeLevelsKept,
} from "../../data/strategyTracks.seed";
import { formatPerSecond } from "../../lib/production";
import { useProduction } from "../../store/selectors";
import { useAppStore } from "../../store/useAppStore";

const DEFAULT_SETUP_HOURS = 2;
const DEFAULT_UPTIME = 0.5;

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

  const [setupDraft, setSetupDraft] = useState(String(setupHours));
  const [multDraft, setMultDraft] = useState(storedMult ? String(storedMult) : "");
  const [rateDraft, setRateDraft] = useState(storedRate ? String(storedRate) : "");
  const [pickDraft, setPickDraft] = useState(String(pickaxeLevel));

  const mastery = novaUpgrades.find((u) => u.id === "core.pickaxe-mastery")?.level ?? 0;
  const swing = buildSwingSeconds(pickaxeLevel);
  const buildRate = 1 + BUILD_SWINGS_PER_SEC * swing;

  const num = (raw: string): number | undefined => {
    const n = Number(raw.trim().replace(/[,_]/g, ""));
    return raw.trim() === "" || !Number.isFinite(n) || n <= 0 ? undefined : n;
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
              ? "measured"
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
