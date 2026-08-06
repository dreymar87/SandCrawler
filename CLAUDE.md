# SandCrawler

Companion app for *Fortnite: Star Wars Droid Tycoon*. React + TypeScript +
Vite, Zustand over IndexedDB, packaged for Android with Capacitor. Offline,
local-only, no accounts.

## Read these first

| | |
| --- | --- |
| **`MECHANICS.md`** | How the game actually behaves — measured in-game, not from the workbooks. **Read before reasoning about game strategy or economics.** |
| `STRATEGY.md` | What to do with that: when to Super Rebirth, what to buy. |
| `DOMAIN.md` | App data model — tiers, cycles, slots, schema history. |

`MECHANICS.md` matters most because the community workbooks publish **costs and
requirements but almost no effects**. Everything about what upgrades actually
*do* was measured by hand and is easy to get wrong from first principles — the
document ends with a list of conclusions that were confidently reached and then
overturned.

## Where data lives

Seeds under `src/data/*.seed.ts` are the source of truth. Three kinds:

- **Imported** from the community workbooks by `scripts/import-sheets.mjs`
  (rebirth cycles, droid stats, crafting times). Regenerate rather than
  hand-edit. `--check-nova` reports drift for the hand-maintained Nova costs.
- **Measured** in-game — `strategyTracks.seed.ts` (upgrade effects, swing and
  pickaxe constants) and `rebirthMultipliers.seed.ts` (multiplier samples).
- **Editorial** — the buy-order tracks, which are judgement and say so.

Every persisted-state change needs a `SCHEMA_VERSION` bump and a migration; see
`src/lib/migrate.ts`.

## Discipline that's earned its keep

**Prose that restates data goes stale.** STRATEGY.md drifted eight corrections
behind the code before anyone noticed. Docs quoting figures are now pinned by
tests — `mechanicsDoc.test.ts`, `strategyDoc.test.ts` — which fail when a
measurement lands without the write-up.

**Tests shouldn't hardcode moving numbers.** Several broke when a new sample
shifted a derived value. Assert the relationship, or derive the expectation
from the same source the code uses.

**Verify with `&&`, never a pipe.** `npm test | grep ... && git commit` commits
on a red suite, because grep matches the failure summary and exits 0. `set -e`
also doesn't hold across compound commands here. Use:

```
npm run typecheck && npm test && npm run build && git commit ...
```

**Get the unit right before computing.** The most expensive mistakes in this
project were confident arithmetic on the wrong quantity — pricing a build-time
upgrade as a credit multiplier, expressing a scrap multiplier as a share of
droid income. `MeasuredEffect.unit` exists for this, and anything that can't
join a ranking must say why in `whyNotRanked`.

**Two readings differing by 0.1 aren't a trend** when the display rounds to
0.1. Test whether a constant plus rounding explains the data first; it usually
has.

## Commands

```
npm run dev        # vite dev server
npm run typecheck  # tsc -b --noEmit
npm test           # vitest
npm run build      # production build
```
