import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor wraps the built web app (`dist/`) as a native Android package.
 * `appId` is a placeholder reverse-DNS id — change it to a domain you
 * control before publishing to the Play Store.
 *
 * The web build's service worker is disabled for native builds (the
 * WebView already bundles the assets) — see the `build:app` npm script,
 * which sets VITE_PWA=0.
 */
const config: CapacitorConfig = {
  appId: "com.sandcrawler.app",
  appName: "SandCrawler",
  webDir: "dist",
  backgroundColor: "#0A0E15",
  android: {
    backgroundColor: "#0A0E15",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      backgroundColor: "#0A0E15",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
