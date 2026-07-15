/**
 * ± numeric stepper. A shared control used by the Droidex cell editor
 * and Profile numeric fields. Renders a `− [n] +` with an editable
 * number input in the middle so users can either tap or type.
 */
export interface StepperProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  /** Uppercase label rendered before the control (Droidex-style). Omit for a bare stepper. */
  label?: string;
  /** Tailwind color class for the label (e.g. "text-holo"). */
  accent?: string;
  /** Muted hint text shown after the control. */
  hint?: string;
  /** "sm" (7×7 buttons, 14w input) or "md" (8×8, 16w). Default sm. */
  size?: "sm" | "md";
  /** id attribute for the number input (for label association). */
  id?: string;
  ariaLabel?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max,
  label,
  accent = "text-muted-alt",
  hint,
  size = "sm",
  id,
  ariaLabel,
}: StepperProps) {
  const clamp = (n: number) => {
    let v = Math.max(min, Math.floor(n));
    if (typeof max === "number") v = Math.min(max, v);
    return v;
  };
  const dec = () => onChange(clamp(value - 1));
  const inc = () => onChange(clamp(value + 1));
  const btnSize = size === "md" ? "w-8 h-8" : "w-7 h-7";
  const inputSize = size === "md" ? "w-16 text-xl py-1.5" : "w-14 text-lg py-1";
  const inputAria = ariaLabel ?? (label ? `${label} count` : "value");
  return (
    <div className="flex items-center gap-3 py-1.5">
      {label ? (
        <span className={`font-mono text-[11px] uppercase tracking-wider w-16 ${accent}`}>
          {label}
        </span>
      ) : null}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={`${btnSize} rounded-md border border-line-alt text-muted hover:text-ink disabled:opacity-30`}
          onClick={dec}
          disabled={value <= min}
          aria-label={`Decrease ${inputAria}`}
        >
          −
        </button>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          inputMode="numeric"
          className={`${inputSize} text-center font-display font-bold bg-panel-alt border border-line rounded-md`}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          aria-label={inputAria}
        />
        <button
          type="button"
          className={`${btnSize} rounded-md border border-line-alt text-muted hover:text-ink disabled:opacity-30`}
          onClick={inc}
          disabled={typeof max === "number" && value >= max}
          aria-label={`Increase ${inputAria}`}
        >
          +
        </button>
      </div>
      {hint ? (
        <span className="font-mono text-[10.5px] text-muted-alt truncate">{hint}</span>
      ) : null}
    </div>
  );
}
