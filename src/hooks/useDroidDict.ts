import { useMemo } from "react";
import { DROID_DICT } from "../data/droids.seed";
import { buildDroidIndex, type DroidIndex } from "../lib/autocomplete";
import { useAppStore } from "../store/useAppStore";
import type { DroidDef } from "../types";

/**
 * Returns a memoised index over the seed dictionary + any user-added custom
 * droids. Rebuilds only when `customDroids` changes — the seed is immutable.
 */
export function useDroidDict(): { dict: readonly DroidDef[]; index: DroidIndex } {
  const customDroids = useAppStore((s) => s.customDroids);
  return useMemo(() => {
    const dict = [...DROID_DICT, ...customDroids];
    return { dict, index: buildDroidIndex(dict) };
  }, [customDroids]);
}
