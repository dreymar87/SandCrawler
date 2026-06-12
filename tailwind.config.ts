import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Mirrors the prototype's palette so the visual identity carries over.
        bg: { DEFAULT: "#0A0E15", alt: "#0D131C" },
        panel: { DEFAULT: "#141C28", alt: "#19222F" },
        line: { DEFAULT: "#26313F", alt: "#33414F" },
        ink: "#E7EDF4",
        muted: { DEFAULT: "#7F8B9B", alt: "#5C6776" },
        holo: { DEFAULT: "#46C7E0", dim: "#2C7E92" },
        sun: "#E8A33D",
        ok: "#56D08A",
        warn: "#E8B24A",
        danger: "#E06B5B",
        tier: {
          default: "#8A94A6",
          gold: "#E8B24A",
          diamond: "#5BC8F5",
          beskar: "#C3CBD6",
        },
      },
      fontFamily: {
        display: ['"Chakra Petch"', "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      keyframes: {
        scan: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "0 60px" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        scan: "scan 8s linear infinite",
        "holo-pulse": "pulse 2.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
