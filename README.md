# SandCrawler

> Your **Star Wars: Droid Tycoon** rebirth companion.

SandCrawler is a fan-made tracker for the prestige loop in *Star Wars: Droid
Tycoon* (a Fortnite UEFN experience by FOAD and Blzn Studios, in
collaboration with Epic Games and Lucasfilm). Log your droid roster and the
NEED set of each rebirth rank, and the app tells you which rebirths you're
ready for — including tier substitution, active-droid eligibility, and a
"next unlock" view that ranks how close you are to each remaining goal.

This project is **unaffiliated** with the game, its developers, or any
rights holders.

## Features

- **Collection** — log every droid you own, with tier and active/stored
  status. Autocomplete pulls from a built-in dictionary of known droids.
- **Standard Rebirth** — see Rebirth 1 → N requirements pre-seeded from
  community sources. The app flags which ones you're already ready for
  given your current credits.
- **Super Rebirth** — log Super Rebirth ranks as you encounter them. SR
  requirements aren't officially documented, so this stays user-entered.
- **Next Unlock** — a ranked list of the rebirths you're closest to
  completing, with "I have it" shortcuts for each missing droid.
- **Back up / Restore** — JSON export and import. Backups from the older
  prototype HTML are accepted (auto-migrated).

## Stack

Vite + React 18 + TypeScript + Tailwind CSS + Zustand + idb-keyval +
Fuse.js. `vite-plugin-pwa` is scaffolded but disabled — enable with
`VITE_PWA=1 npm run build` once the install flow is wired up.

## Development

```bash
npm install
npm run dev        # local dev server with HMR
npm run typecheck  # tsc -b --noEmit
npm test           # vitest unit suites
npm run build      # production build
npm run preview    # preview the production build locally
```

## Project layout

```
src/
  types.ts                 # Core type contracts
  constants.ts             # TIERS, CLASSES, CREDIT_SUFFIXES
  data/
    droids.seed.ts         # Known droid dictionary
    standardRebirths.seed.ts
    superRebirths.seed.ts  # Bootstrap example only
    version.ts             # SEED_VERSION + SCHEMA_VERSION
  lib/                     # Pure helpers (tiers, credits, readiness, autocomplete, migrate)
  store/                   # Zustand store + derived selectors
  components/              # UI tree
  hooks/                   # React hooks
  test/                    # vitest setup
DOMAIN.md                  # Game rules + data provenance (worth reading first)
```

The seed dictionary is currently partial (~20 droids). The full Droidex
contains around 258; growing the dictionary is the next planned task.

## Acknowledgments

The data seeded into this project was compiled from community guides on
Insider Gaming, GAMES.GG, the Fortnite and Star Wars Fandom wikis,
PCGamer, and the open-source [erikpeik/droidex](https://github.com/erikpeik/droidex)
tracker. Where requirements turn out to be wrong, please update
`DOMAIN.md` and the relevant seed file with a citation.
