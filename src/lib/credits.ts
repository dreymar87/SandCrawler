import { CREDIT_SUFFIXES } from "../constants";

/**
 * Parses an in-game credit string ("10.00K", "1.36B", "2T") into a bigint.
 * Returns `0n` for unparseable input so display code doesn't crash on bad
 * user data.
 *
 * Bigint chosen over Number because Beskar-tier credit totals will quickly
 * exceed 2^53; we still want exact ordering for "next unlock" scoring.
 */
export function parseCredits(raw: string | undefined | null): bigint {
  if (!raw) return 0n;
  const cleaned = String(raw).trim().replace(/,/g, "").replace(/\s+/g, "");
  if (!cleaned) return 0n;

  // Match optional decimal mantissa followed by optional single-letter suffix.
  const m = cleaned.match(/^(\d+(?:\.\d+)?)([KMBTQ])?$/i);
  if (!m) return 0n;

  const mantissa = m[1] ?? "0";
  const suffix = (m[2] ?? "").toUpperCase();
  const multiplier = suffix ? (CREDIT_SUFFIXES[suffix] ?? 1n) : 1n;

  // Resolve the decimal mantissa without floats: shift digits, then divide.
  const [intPart, fracPart = ""] = mantissa.split(".");
  const digits = BigInt((intPart ?? "0") + fracPart);
  const scale = 10n ** BigInt(fracPart.length);
  return (digits * multiplier) / scale;
}

const SUFFIX_ORDER: readonly { suffix: string; value: bigint }[] = [
  { suffix: "Q", value: CREDIT_SUFFIXES.Q! },
  { suffix: "T", value: CREDIT_SUFFIXES.T! },
  { suffix: "B", value: CREDIT_SUFFIXES.B! },
  { suffix: "M", value: CREDIT_SUFFIXES.M! },
  { suffix: "K", value: CREDIT_SUFFIXES.K! },
];

/**
 * Formats a bigint back into the game's short notation. Always picks the
 * largest suffix that produces a value ≥ 1 with up to 2 decimal places.
 */
export function formatCredits(n: bigint): string {
  if (n < 0n) return "0";
  if (n < CREDIT_SUFFIXES.K!) return n.toString();

  for (const { suffix, value } of SUFFIX_ORDER) {
    if (n >= value) {
      // Compute mantissa with 2 decimal places using integer math.
      const scaled = (n * 100n) / value;
      const whole = scaled / 100n;
      const frac = scaled % 100n;
      const fracStr = frac === 0n ? "" : `.${frac.toString().padStart(2, "0").replace(/0+$/, "")}`;
      return `${whole.toString()}${fracStr}${suffix}`;
    }
  }
  return n.toString();
}

/** True iff `current` covers `required`. Both strings parsed via parseCredits. */
export function creditsCover(required: string, current: string): boolean {
  return parseCredits(current) >= parseCredits(required);
}

/**
 * Parses an income value like "16/s", "1.92k/s", or "5%/s" into credits per
 * second. Returns null for percentage incomes (MYTHIC boosters multiply
 * base income rather than adding a flat amount); UI shows the raw string
 * instead of summing them.
 */
export function parseIncome(raw: string | undefined | null): bigint | null {
  if (!raw) return 0n;
  const cleaned = String(raw).trim().replace(/\s+/g, "");
  if (!cleaned) return 0n;
  // Percentage boosters can't be added linearly with flat values.
  if (cleaned.includes("%")) return null;
  // Strip the "/s" suffix; rest parses via parseCredits.
  const stripped = cleaned.replace(/\/s$/i, "");
  return parseCredits(stripped);
}

/**
 * Computes how much of `required` is covered by `current`. Returned as a
 * 0–100 percentage (rounded down) suitable for progress bars.
 */
export function progressPercent(required: string, current: string): number {
  const req = parseCredits(required);
  if (req === 0n) return 100;
  const have = parseCredits(current);
  if (have >= req) return 100;
  // Scale by 1000 to keep a digit of resolution under bigint math.
  return Number((have * 1000n) / req) / 10;
}
