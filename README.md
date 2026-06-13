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

- **Droidex** — every (droid × tier) card as a tappable cell. Tap to cycle
  *missing → owned → active*. Filters by rarity, class, tier, and
  collected/missing. Completion % and active count at the top.
- **Profile** — set your current Standard Rebirth (0–23) and Super Rebirth
  marker. The app shows squad slot capacity per type (Worker / Astromech /
  Battle / Lounge / Companion), the rebirth level that unlocks the next
  slot, and your production rate (credits/sec) from active cards.
- **Standard Rebirth** — full 1–23 requirements pre-seeded from community
  data. Each rebirth shows a credits progress bar ("short by 4.5B") and
  flags as ready when both your credits and your active cards line up.
- **Super Rebirth** — log Super Rebirth ranks as you encounter them. SR
  requirements aren't officially documented, so this stays user-entered.
- **Next Unlock** — a ranked list of the rebirths you're closest to
  completing, with "I have it" shortcuts for each missing card. Hides any
  Standard rebirths you've already passed.
- **Back up / Restore** — JSON export and import. Backups from any earlier
  schema (the original prototype, the Pass-1 roster shape) are
  auto-migrated forward.
- **Installable PWA** — installs to the home screen on iOS / Android /
  desktop and works offline.

## Stack

Vite + React 18 + TypeScript + Tailwind CSS + Zustand + idb-keyval +
Fuse.js + vite-plugin-pwa.

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

Game-fact data (droid names, rebirth requirements, per-tier income/cost,
squad slot unlock schedules) was re-derived from community sources —
primarily the open-source
[erikpeik/droidex](https://github.com/erikpeik/droidex) tracker, which
itself compiles a community Google Sheet. SandCrawler owns the schema and
the curation; corrections belong in `DOMAIN.md` plus the relevant seed
file. See `DOMAIN.md` for the full provenance + licensing stance.
