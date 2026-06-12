/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// PWA registration is scaffolded but disabled by default in this first pass.
// Flip VITE_PWA=1 to enable in a later milestone.
const pwaEnabled = process.env.VITE_PWA === "1";

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
      registerType: "prompt",
      injectRegister: false,
      manifest: {
        name: "SandCrawler",
        short_name: "SandCrawler",
        description:
          "Your Star Wars: Droid Tycoon rebirth companion. Track your droid collection and see which rebirths you're ready for.",
        theme_color: "#0A0E15",
        background_color: "#0A0E15",
        display: "standalone",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
