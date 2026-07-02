# SandCrawler

> Your **Star Wars: Droid Tycoon** rebirth companion.

SandCrawler is a fan-made tracker for the prestige loop in *Star Wars: Droid
Tycoon* (a Fortnite UEFN experience by FOAD and Blzn Studios, in
collaboration with Epic Games and Lucasfilm). Log your Droidex, set your
current rebirth, and the app tells you which rebirths you're ready for —
including tier substitution, active-droid eligibility, squad slot capacity,
production rate, and a "next unlock" view that ranks how close you are to
each remaining goal.

This project is **unaffiliated** with the game, its developers, or any
rights holders.

## Features

- **Droidex** — every (droid × tier) card as a tappable cell, including
  the rare **FLAWLESS** variant. Tap to cycle *missing → owned → active*.
  Filters by rarity (COMMON…ICONIC), class, tier, and collected/missing.
- **Profile** — set your current Standard Rebirth (0–23) and total Super
  Rebirths completed. The app derives your active **rebirth cycle**
  (RBC1–4), shows squad slot capacity per type with the next unlock
  level, your production rate (credits/sec) from active cards, and your
  Nova Crystals balance.
- **Rebirths** — full 1–23 requirements for **all 4 rebirth cycles**.
  Each row shows a credits progress bar ("short by 4.5B"), per-rebirth
  rewards (Nova Crystals, credit & XP multipliers, slot unlock), and
  safe-to-sell guidance.
- **Cosmetics** — track Hats, Paints, and Droid Effects with their
  in-game unlock conditions. Section completion bars.
- **Nova Shop** — both upgrade trees (Core / Workshop) with per-level
  crystal costs, an affordability indicator, and a balance summary.
- **Next Unlock** — a ranked list of the rebirths you're closest to
  completing within your current cycle, with "I have it" shortcuts for
  each missing card.
- **Back up / Restore** — JSON export and import. Backups from any
  earlier schema (prototype, Pass-1 roster, Pass-2 cards) auto-migrate.
- **Installable PWA** — installs to the home screen and works offline.

## Stack

Vite + React 18 + TypeScript + Tailwind CSS + Zustand + idb-keyval +
Fuse.js + vite-plugin-pwa. Packaged for Android with Capacitor.

Navigation is a five-tab bottom bar — **Home · Droidex · Rebirths · Shop ·
Profile** — with Home as an at-a-glance dashboard and Profile as the
editable record of your base.

## Development

```bash
npm install
npm run dev        # local dev server with HMR
npm run typecheck  # tsc -b --noEmit
npm test           # vitest unit suites
npm run build      # production build (PWA enabled)
npm run preview    # preview the production build locally
```

To build without the PWA service worker (useful for some hosting
environments): `VITE_PWA=0 npm run build`.

## Android app (Capacitor)

SandCrawler wraps the same web build as a native Android app with
[Capacitor](https://capacitorjs.com). The `android/` Gradle project is
committed; the web assets are copied into it at build time (not
committed). Building the actual APK requires the **Android SDK**, which
isn't part of this repo's toolchain — do it on a machine with Android
Studio (or CI with the SDK installed).

### One-time setup

1. Install **Android Studio** (bundles the SDK + platform tools + a JDK),
   or the command-line SDK with an API 34+ platform.
2. **Use JDK 17** (21 also works). The build uses Gradle 8.14 + Android
   Gradle Plugin 8.13, which do **not** support JDK 24/25. If `JAVA_HOME`
   points at a newer JDK you'll see:
   `Unsupported class file major version 69` (that's Java 25; 68 = Java 24).
   Fix by pointing the build at a JDK 17:
   ```powershell
   # Windows PowerShell — install once, then set for the session:
   winget install EclipseAdoptium.Temurin.17.JDK
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot"
   ```
   ```bash
   # macOS / Linux:
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)   # macOS
   ```
   The simplest route is to **build from Android Studio** (Build ▸ Build
   APK), which uses its bundled JDK 17 (JetBrains Runtime) and sidesteps
   the system `JAVA_HOME` entirely.
3. `npm install` (installs the Capacitor CLI + plugins).

### Build a debug APK

```bash
npm run build:app          # VITE_PWA=0 vite build + cap copy → android/
cd android
./gradlew assembleDebug    # needs the Android SDK
```

The APK lands at
`android/app/build/outputs/apk/debug/app-debug.apk` — sideload it with
`adb install -r app-debug.apk` or copy it to a device.

Or open the project in Android Studio and press Run:

```bash
npm run android:open       # opens android/ in Android Studio
```

### Signed release (Play Store)

1. Create a keystore: `keytool -genkey -v -keystore sandcrawler.jks -alias sandcrawler -keyalg RSA -keysize 2048 -validity 10000`.
2. Reference it from `android/app/build.gradle` (`signingConfigs`) or a
   `keystore.properties` file (keep both out of git — already
   `.gitignore`d).
3. `cd android && ./gradlew bundleRelease` → an `.aab` for the Play
   Console.
4. Change `appId` in `capacitor.config.ts` from the placeholder
   `com.sandcrawler.app` to a domain you control **before** first
   publishing.

### App icons & splash

`npm run icons` regenerates the PWA PNGs; `npm run android:icons`
regenerates the Android adaptive launcher icons + splash from the SVGs in
`assets/`. The service worker is disabled for native builds (the WebView
already bundles the assets), so `build:app` sets `VITE_PWA=0`
automatically.

## Project layout

```
src/
  types.ts                       # Core type contracts
  constants.ts                   # TIERS, CLASSES, RARITIES, CREDIT_SUFFIXES
  data/
    droids.seed.ts               # 54-droid dictionary (× tiers = 258 cards)
    standardRebirths.seed.ts     # Rebirth 1→23 requirements
    droidStats.json              # cost / income / value per droid × tier
    droidStats.seed.ts
    squads.seed.ts               # Squad definitions + slot unlock schedule
    superRebirths.seed.ts        # SR2 R1 bootstrap (user-extended)
    version.ts                   # SEED_VERSION + SCHEMA_VERSION
  lib/                           # Pure helpers (tiers, credits, readiness,
                                 # squads, production, autocomplete, migrate)
  store/                         # Zustand store + derived selectors
  components/
    Droidex/DroidexGrid.tsx      # The card matrix
    Profile/ProfilePanel.tsx     # Current rebirth + capacity + production
    Rebirth/                     # Standard + Super rebirth views
    NextUnlock/                  # Scored "what to chase next"
    Data/                        # Export / import / reset
    Layout/                      # Shell + tab bar
    common/                      # Autocomplete, ProgressBar, pills
  hooks/                         # React hooks
  test/                          # vitest setup
DOMAIN.md                        # Game rules + data provenance + licensing
```

## Acknowledgments

Game-fact data (droid names, rebirth requirements across all 4 cycles,
per-tier income/cost, squad slot unlock schedules, cosmetics catalogue,
Nova Shop upgrade costs) was re-derived from community sources:

- **starscurse** — *DROID_TYCOON_REBIRTH_CYCLES.xlsx* (rebirth cycles +
  per-level rewards + chip costs).
- **Cait** and **Omega** — *Fortnite Star Wars Droid Tycoon Tracker
  Template* (droid reference values, cosmetics, Nova Shop).
- **erikpeik/droidex** ([github](https://github.com/erikpeik/droidex)) —
  Pass-2 reference implementation.

SandCrawler owns the schema and the curation; corrections belong in
`DOMAIN.md` plus the relevant seed file. See `DOMAIN.md` for the full
provenance + licensing stance.
