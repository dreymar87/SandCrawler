import Fuse from "fuse.js";
import type { DroidDef } from "../types";
import { normalizeName } from "./normalize";

export interface DroidMatch {
  def: DroidDef;
  /** Which key matched (canonical or one of the aliases). */
  matched: string;
  /** True iff the match was via an alias rather than the canonical name. */
  viaAlias: boolean;
}

interface IndexedEntry {
  def: DroidDef;
  /** Searchable strings: canonical + every alias, normalised. */
  key: string;
  /** The original (un-normalised) string that produced this key. */
  display: string;
  viaAlias: boolean;
}

export interface DroidIndex {
  byKey: Map<string, DroidDef>;
  search(query: string, limit?: number): DroidMatch[];
  resolve(name: string): DroidDef | null;
}

/**
 * Build a search index over the droid dictionary. Each droid contributes its
 * canonical name plus every alias as a search-key; results dedupe back to the
 * underlying DroidDef so an alias hit doesn't double-show.
 *
 * Three-stage matching:
 *   1. Exact normalized-name lookup (instant; covers the typo-free case).
 *   2. Prefix and substring scan (fast; covers partial typing).
 *   3. Fuse.js fuzzy match with a strict threshold (catches typos).
 */
export function buildDroidIndex(dict: readonly DroidDef[]): DroidIndex {
  const entries: IndexedEntry[] = [];
  const byKey = new Map<string, DroidDef>();
  for (const def of dict) {
    const canonicalKey = normalizeName(def.canonical);
    entries.push({ def, key: canonicalKey, display: def.canonical, viaAlias: false });
    byKey.set(canonicalKey, def);
    for (const alias of def.aliases ?? []) {
      const aliasKey = normalizeName(alias);
      if (!aliasKey || aliasKey === canonicalKey) continue;
      entries.push({ def, key: aliasKey, display: alias, viaAlias: true });
      // Don't overwrite a canonical mapping with an alias-only one.
      if (!byKey.has(aliasKey)) byKey.set(aliasKey, def);
    }
  }

  const fuse = new Fuse(entries, {
    keys: ["key"],
    threshold: 0.4,
    distance: 30,
    includeScore: true,
    ignoreLocation: true,
  });

  return {
    byKey,
    resolve(name) {
      return byKey.get(normalizeName(name)) ?? null;
    },
    search(query, limit = 8) {
      const q = normalizeName(query);
      if (!q) return [];
      const seen = new Set<DroidDef>();
      const results: DroidMatch[] = [];

      const push = (e: IndexedEntry) => {
        if (seen.has(e.def)) return;
        seen.add(e.def);
        results.push({ def: e.def, matched: e.display, viaAlias: e.viaAlias });
      };

      // Stage 1: exact prefix matches first (so typing "Mou" surfaces Mouse).
      for (const e of entries) {
        if (e.key.startsWith(q)) push(e);
        if (results.length >= limit) return results;
      }
      // Stage 2: anywhere-substring.
      for (const e of entries) {
        if (e.key.includes(q)) push(e);
        if (results.length >= limit) return results;
      }
      // Stage 3: fuzzy.
      const fuzzy = fuse.search(q, { limit: limit * 2 });
      for (const hit of fuzzy) {
        push(hit.item);
        if (results.length >= limit) break;
      }

      return results;
    },
  };
}
