/**
 * Native-platform helpers. On the web these are no-ops (or use the plugins'
 * web fallbacks); inside the Capacitor Android shell they bridge to native.
 *
 * The Capacitor plugins ship web implementations, so static imports are
 * safe in the browser build — they simply no-op off-device.
 */
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

type HapticStyle = "light" | "medium" | "heavy";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

const IMPACT: Record<HapticStyle, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

/**
 * Runtime gate for `haptic()`. The store wires this to the
 * `ui.hapticsEnabled` preference. Defaults to always-on until the app
 * boots and the store subscribes.
 */
let hapticsEnabled = true;
export function setHapticsEnabled(v: boolean): void {
  hapticsEnabled = v;
}

/** Fire a haptic tap on native; silently no-op on the web or when disabled. */
export function haptic(style: HapticStyle = "light"): void {
  if (!hapticsEnabled) return;
  if (!Capacitor.isNativePlatform()) return;
  void Haptics.impact({ style: IMPACT[style] }).catch(() => {
    /* haptics are best-effort */
  });
}

/**
 * One-time native setup: status-bar theming, hide the splash once the web
 * app is interactive, and route the Android hardware back button through
 * the app's tab navigation. Safe to call on the web (returns immediately).
 */
export async function initNative(opts: { onBack: () => boolean }): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0A0E15" });
  } catch {
    /* status bar unavailable on some devices */
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    /* splash already gone */
  }

  try {
    const { App } = await import("@capacitor/app");
    await App.addListener("backButton", ({ canGoBack }) => {
      // onBack returns true if it consumed the press (navigated a tab).
      const handled = opts.onBack();
      if (!handled && !canGoBack) void App.exitApp();
    });
  } catch {
    /* app plugin unavailable */
  }
}
