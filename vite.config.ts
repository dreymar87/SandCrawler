/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// PWA install / offline support. Set VITE_PWA=0 to disable.
const pwaEnabled = process.env.VITE_PWA !== "0";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    react(),
    VitePWA({
      disable: !pwaEnabled,
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "SandCrawler — Droid Tycoon Companion",
        short_name: "SandCrawler",
        description:
          "Your Star Wars: Droid Tycoon rebirth companion. Track your droid collection and see which rebirths you're ready for.",
        theme_color: "#0A0E15",
        background_color: "#0A0E15",
        display: "standalone",
        orientation: "portrait",
        categories: ["games", "utilities"],
        start_url: "/",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff,woff2}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
