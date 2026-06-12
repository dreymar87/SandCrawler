import { parseCredits } from "../../lib/credits";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Free-text credit input. Values like "10K", "1.36B", "21B" are accepted —
 * we don't reformat-on-blur because the in-game display preserves whatever
 * notation the user typed.
 *
 * If the input parses to 0 but isn't empty, show a quiet warning so typos
 * don't silently break readiness checks.
 */
export function CreditsInput({ value, onChange, placeholder = "e.g. 10K", id }: Props) {
  const invalid = value.trim().length > 0 && parseCredits(value) === 0n;
  return (
    <div className="space-y-1">
      <input
        id={id}
        type="text"
        className={`input ${invalid ? "border-warn focus:border-warn" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
      />
      {invalid ? (
        <p className="font-mono text-[10px] text-warn">
          Couldn't read that as credits — use K/M/B/T (e.g. 21B).
        </p>
      ) : null}
    </div>
  );
}
