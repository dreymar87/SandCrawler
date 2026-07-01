/**
 * Native-platform helpers. On the web these are no-ops; when running inside
 * the Capacitor Android shell they bridge to native plugins.
 *
 * This module intentionally avoids a static import of `@capacitor/*` so the
 * web build has zero native dependencies. The Capacitor runtime injects a
 * global `Capacitor` object into the WebView; we feature-detect it.
 */

type HapticStyle = "light" | "medium" | "heavy";

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: {
    Haptics?: { impact?: (opts: { style: string }) => void };
  };
}

function cap(): CapacitorGlobal | undefined {
  return (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function isNative(): boolean {
  return !!cap()?.isNativePlatform?.();
}

const IMPACT_STYLE: Record<HapticStyle, string> = {
  light: "LIGHT",
  medium: "MEDIUM",
  heavy: "HEAVY",
};

/** Fire a light haptic tap on native; silently no-op on the web. */
export function haptic(style: HapticStyle = "light"): void {
  const c = cap();
  if (!c?.isNativePlatform?.()) return;
  try {
    c.Plugins?.Haptics?.impact?.({ style: IMPACT_STYLE[style] });
  } catch {
    /* haptics are best-effort */
  }
}
