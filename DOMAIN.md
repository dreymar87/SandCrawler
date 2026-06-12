# DOMAIN — Star Wars: Droid Tycoon rules SandCrawler encodes

This document is the game-rules half of the codebase. If the game changes (or
if a rule below turns out to be wrong), update this file first, then the
code. It exists so the logic and the rules can drift apart without anyone
silently rewriting the wrong one.

## The game

- **Star Wars: Droid Tycoon** — a Fortnite UEFN / Creative experience.
- Released **May 1, 2026** with the *Unleash the Force* event.
- Made by **FOAD** and **Blzn Studios** in collaboration with **Epic Games**
  and **Lucasfilm**.
- Island code **`7865-8305-9184`** (by `epiclabs` on the Creator Portal).
- Loop: tycoon. You buy droids, they generate credits, you spend credits
  on upgrades and on the rebirth mechanic, which permanently boosts
  production at the cost of resetting your run.
- This app is unaffiliated with any rights holder. We describe it
  functionally as a "Droid Tycoon rebirth companion" and avoid using the
  game's full marketing title in product/store contexts.

## Droid tiers

Five rarities, **in-game labels are uppercase**, ordered low → high:

```
DEFAULT → GOLD → DIAMOND → RAINBOW → BESKAR
```

- **DEFAULT** is the base rarity. Some community guides call it "Basic" —
  treat those as the same tier (we map `Basic` → `DEFAULT` on import).
- **BESKAR** is the current top tier. A RAINBOW droid upgrades to BESKAR
  for 12,000 Upgrade Chips.
- **Tier substitution** — the single most important rule: a higher-tier
  droid satisfies any lower-tier requirement. A GOLD Mouse covers a
  "Mouse @ DEFAULT" requirement. SandCrawler's `satisfies()` implements
  this.

## Droid classes

Three classes the migration brief didn't mention but the in-game UI and
community trackers use:

- **WORKER** — production-focused (Mouse, Gonk, Pit, BU-4D, MONO-WLKR…).
- **ASTROMECH** — utility (C8, R7, R9, BB, ARG…).
- **BATTLE** — security / combat (DRK-1 Probe, B1 Security, B2-RP,
  Opti-STRK…).

SandCrawler stores this on each `DroidDef` and on the autocomplete chip,
but readiness math doesn't depend on it.

## Active-droid rule

To count toward a rebirth, a droid must be **active** in your base —
either Working or in the Lounge (rest area). Merely having a droid logged
in the Droidex (the in-game collection) does NOT count.

SandCrawler models this with two booleans per `RosterEntry`:
- `owned` — is it in your Droidex at all?
- `active` — is it currently deployed (Working OR Lounge)?

Only `active === true` rows contribute to `rosterCovers()`. The
`addOrUpdateDroid` action defaults `owned` to `true` because logging a
droid you don't own would be meaningless; `active` is set explicitly.

## Standard Rebirth

- Numbered 1 → N. Community sources put N somewhere between 15 and 23 as
  of mid-2026 — the game is still being updated.
- Each level requires a credit threshold + three specific droids at
  specific tiers.
- Some droids recur across levels at escalating tiers — e.g. BU-4D
  appears at RB3 (DEFAULT), RB5 (GOLD), RB7 (DIAMOND). This is the
  payoff of the tier-substitution rule.
- Confirmed entries are seeded in `src/data/standardRebirths.seed.ts`.
  Anything not there is a known gap; user overrides in
  `standardOverrides` patch the seed.

## Super Rebirth

A **meta-prestige** sitting on top of Standard Rebirth. Two-level
structure:

- A **Super Rebirth level** (e.g. Super Rebirth 2).
- Within it, sequential **Ranks** (Rank 1, Rank 2, …).
- Each Rank has its own **NEED** set: a credit cost + specific droids at
  specific tiers.
- Each Rank also has a **GAIN** (rewards): Credits, Multiplier, Slot,
  Force ability. (These four fields are what the prototype modelled; if
  the game introduces more, add them to `RebirthGain` in `src/types.ts`.)

**Important:** Super Rebirth requirements are **not officially documented
anywhere as of mid-2026**. SandCrawler treats this data as user-entered /
crowd-sourced. The one seed example (SR2 R1 with the Mouse/Pit/Gonk
DEFAULT requirement and the Force Push gain) exists only to demonstrate
the shape; users edit or delete it freely.

## Credits notation

The game displays credit values with short suffixes — `10K`, `1.36B`,
`21B`, `810B`. K/M/B are confirmed in community guides; T is plausible at
late game; SandCrawler also supports Q (quadrillion) for future-proofing.

We parse via `parseCredits()` to a `bigint` because Beskar-tier totals
will quickly exceed `Number.MAX_SAFE_INTEGER`, and we still want exact
comparisons for "next unlock" scoring. Storage and display stay as
free-text strings; users see their own notation echoed back.

## Naming conventions

Droid names in the game follow distinctive conventions:

- Workers and astromechs often use Star Wars-style model codes: `BU-4D`,
  `B2-RP`, `R7`, `R9`, `HOV-R`, `MONO-WLKR`, `Opti-STRK`, `DRK-1`,
  `Cyclo-Grav`, `Proto-Roller`.
- A few have simple English names: `Mouse`, `Pit`, `Gonk`, `Groundmech`,
  `Mecha-Droid`.

Casing is inconsistent across community sources; SandCrawler preserves
the in-game casing on display but normalises for matching
(`normalizeName()` lowercases and collapses punctuation). Semantic
aliases like `MONO-WLKR` ↔ `Mono Walker` are handled by `DroidDef.aliases`
in the seed dictionary — NOT by the normaliser, because alias mapping is
a dictionary concern and should be explicit.

## Data provenance — what's seeded vs. user-entered

| Bucket | In SandCrawler | Source |
|---|---|---|
| Tier list | Constant in `src/constants.ts`. | Confirmed: in-game labels (uppercase). |
| Droid dictionary | `src/data/droids.seed.ts` (~20 entries). Full Droidex is ~258 droids; the rest are a follow-up pass. | Wookieepedia, Insider Gaming, erikpeik/droidex README. |
| Standard Rebirth requirements | `src/data/standardRebirths.seed.ts` (partial). | Insider Gaming + Fandom snippets — WebFetch was 403-walled by most sources during research. |
| Super Rebirth requirements | One seed example. Everything else is user-entered. | Migration brief §3. |
| GAIN reward fields | Four columns: Credits / Multiplier / Slot / Force. | Migration brief §3 (prototype example). |

When you find better data, the right place to drop it is the seed files —
they're tree-shaken and typed against `src/types.ts`. Don't move them to
`public/` for "easy crowd editing"; that defeats type-checking and
forces async fetching on cold start.

## Future-proofing

When the game adds a new tier above BESKAR, the only safe edit is to
append it to `TIERS` in `src/constants.ts`. Everything keys off the array
index via `tierRank()`, so insertions in the middle would break legacy
data silently. Always append.

When the game adds a new reward type (a sixth GAIN field, say), extend
`RebirthGain` in `src/types.ts` and update the `RankCard` and editor —
the data is stored loose enough that older exports without the new field
still import fine.
