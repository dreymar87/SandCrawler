/**
 * Name canonicalization. Droid names are entered by humans on phone keyboards;
 * "mono walker", "Mono-Walker", and "MONO-WLKR" should all resolve to the
 * same dictionary entry.
 */
export function normalizeName(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    // Collapse any non-alphanumeric to spaces so "MONO-WLKR" and "mono wlkr"
    // share a key. Preserves the canonical casing for display elsewhere.
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
