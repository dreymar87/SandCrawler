# DOMAIN — Star Wars: Droid Tycoon rules SandCrawler encodes

This document is the game-rules half of the codebase. If the game changes
(or if a rule below turns out to be wrong), update this file first, then
the code. It exists so the logic and the rules can drift apart without
anyone silently rewriting the wrong one.

## The game

- **Star Wars: Droid Tycoon** — a Fortnite UEFN / Creative experience.
- Released **May 1, 2026** with the *Unleash the Force* event.
- Made by **FOAD** and **Blzn Studios** in collaboration with **Epic
  Games** and **Lucasfilm**.
- Island code **`7865-8305-9184`** (by `epiclabs` on the Creator Portal).
- Loop: tycoon. You buy droids, they generate credits, you spend credits
  on upgrades and on the rebirth mechanic, which permanently boosts
  production at the cost of resetting your run.
- This app is unaffiliated with any rights holder. We describe it
  functionally as a "Droid Tycoon rebirth companion" and avoid using the
  game's full marketing title in product/store contexts.

## Droid tiers

Five rarities — note: this is the **upgrade tier** dimension, separate
from the collection **rarity** below. In-game labels are uppercase, low → high:

```
DEFAULT → GOLD → DIAMOND → RAINBOW → BESKAR
```

- **DEFAULT** is the base tier. Some community guides call it "Basic" —
  treat those as the same tier (we map `Basic` → `DEFAULT` on import).
- **BESKAR** is the current top tier.
- **Tier substitution** — the single most important rule: a higher-tier
  card satisfies any lower-tier requirement. A GOLD MOUSE covers a
  "MOUSE @ DEFAULT" requirement. SandCrawler's `satisfies()` implements
  this.

## Collection rarity

Each droid also has a **rarity** (separate from its upgrade tier):

```
COMMON → RARE → EPIC → LEGENDARY → MYTHIC
```

- **MYTHIC** droids are event-locked — they only exist at DEFAULT tier
  and never upgrade. Their income is a **percentage boost** (e.g. `5%/s`)
  rather than a flat credits/sec value, so they multiply your base income
  rather than adding to it. SandCrawler treats their income label
  separately in the production calculator.
- Total Droidex: **54 base droids × their tier count = 258 cards**.
  That's where the "all 258 droids" number from community guides comes
  from — it counts every (droid × tier) combination, not 258 distinct
  models.

## Droid classes (types)

Three classes for the production-droid slot system:

- **WORKER** — production-focused (MOUSE, GONK, PIT, BU-4D, MONO-WALKER…).
- **ASTROMECH** — tech / ship support (CB, R7, R9, BB, ARG…).
- **BATTLE** — combat / security (DRK-1 PROBE, B1 SECURITY, B2-RP,
  OPTI-STRIKE…).

Stored on each `DroidDef` and shown on the autocomplete + Droidex grid.
Readiness math doesn't depend on class, but squad capacity does (see
below).

## Active-droid rule

To count toward a rebirth, a card must be **active** in your base —
either Working or in the Lounge (rest area). Merely owning a card in your
Droidex does NOT count.

SandCrawler models this with two booleans per `CollectionCard`:
- `owned` — collected in your Droidex.
- `active` — deployed (Working OR Lounge).

Only `active === true` cards contribute to `rosterCovers()` and to the
production calculator. Cycling a Droidex cell goes
*missing → owned → active → missing*.

## Squads & slot capacity

Your base has five "squads", each with a base slot count that expands at
specific rebirth thresholds:

| Squad      | Base | Unlock levels                        | Max |
| ---------- | ---- | ------------------------------------ | --- |
| COMPANION  | 1    | —                                    | 1   |
| WORKER     | 4    | 1, 4, 7, 10, 12, 14, 16              | 11  |
| ASTROMECH  | 3    | 2, 5, 8, 11, 13, 15                  | 9   |
| BATTLE     | 2    | 3, 6, 9                              | 5   |
| LOUNGE     | 5    | 17, 18, 19, 20                       | 9   |

This decodes the **"Slot"** field in Super Rebirth GAIN rewards — a
rebirth's slot reward says *which* squad's next slot it unlocks. The
Profile tab uses `getMaxSlots(squad, rebirthLevel)` to show current vs.
maximum capacity per squad.

## Standard Rebirth

- Numbered 1 → 23 as of mid-2026 (the game continues to add levels). The
  seed table is in `src/data/standardRebirths.seed.ts`.
- Each level requires a specific credit threshold + three droids at
  specific tiers.
- Some droids recur across levels at escalating tiers — e.g. BU-4D
  appears at RB3 (DEFAULT), RB5 (GOLD), RB7 (DIAMOND). This is the
  payoff of the tier-substitution rule: keep upgrading rather than
  collecting new.

User overrides applied on top of the seed live in `standardOverrides`;
the merged result powers the Standard tab.

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

**Super Rebirth requirements are not officially documented** anywhere as
of mid-2026. SandCrawler treats this data as user-entered /
crowd-sourced. The one seed example (SR2 R1 with the MOUSE/PIT/GONK
DEFAULT requirement and the Force Push gain) exists only to demonstrate
the shape; users edit or delete it freely.

## Per-droid economy

Every (droid × tier) combination has:

- **cost** — credits to purchase / upgrade to that tier.
- **income** — credits per second the card generates when active.
  MYTHIC droids show a percentage (e.g. `5%/s`) instead of a flat value.
- **value** — the sell-back / refund value (≈ 70% of cost).

Stored in `src/data/droidStats.json` and consumed by the production
calculator on the Profile tab. Values keep their in-game notation
("3.8k", "112.50m", "8.80b") and parse lazily via `lib/credits.ts`.

## Credits notation

The game displays credit values with short suffixes — `10K`, `1.36B`,
`21B`, `6T`. K/M/B/T confirmed; Q (quadrillion) is supported as
future-proofing.

We parse via `parseCredits()` to a `bigint` because Beskar-tier totals
quickly exceed `Number.MAX_SAFE_INTEGER`. Storage and display stay as
free-text strings; users see their own notation echoed back.

## Naming conventions

Canonical droid names in the game are **ALL-CAPS** — `MOUSE`, `MONO-WALKER`,
`B2-RP`, `DRK-1 PROBE`, `OPTI-STRIKE`. Hyphens, spaces, and numbers all
appear.

Community guides use varied spellings (`MONO-WLKR`, `Mono-Walker`,
`B2 RP`). SandCrawler:

- Stores the canonical UPPERCASE form in the dict.
- Lists known guide spellings under `DroidDef.aliases`, indexed by
  `buildDroidIndex()` so any of them resolves to the canonical name.
- Normalises punctuation+case in `normalizeName()` for matching, but
  semantic aliases (`WLKR` → `WALKER`) only resolve through the dict.

## Data provenance — what's seeded vs. user-entered

| Bucket | Source |
|---|---|
| Tier list | Constant in `src/constants.ts`. Confirmed in-game. |
| Droid dictionary (54 entries × tiers = 258 cards) | `src/data/droids.seed.ts`. Re-derived from community sources. |
| Droid stats (cost / income / value per card) | `src/data/droidStats.json`. Re-derived from a community Google Sheet. |
| Standard Rebirth requirements (1–23) | `src/data/standardRebirths.seed.ts`. Re-derived. |
| Squad slot mechanics | `src/data/squads.seed.ts`. Confirmed in-game; unlock thresholds from community guides. |
| Super Rebirth requirements | One seed example. Everything else is user-entered (no public source). |
| GAIN reward field set | Four columns: Credits / Multiplier / Slot / Force. From the prototype example. |

### Licensing

Reference copies of the source repo's data files live in
`/tmp/sandcrawler-research/*.ref.*` for re-fetching; they're sourced from
the open-source [erikpeik/droidex](https://github.com/erikpeik/droidex)
tracker, which has no license file. **Game facts** (names, costs,
requirements, income numbers) are not copyrightable, so we re-derive
those facts into our own schema. We do **not** copy the source repo's
code structure, type names, helper functions, or styling — only the raw
in-game data the community has compiled there.

## Future-proofing

When the game adds a new upgrade tier above BESKAR, the only safe edit
is to **append** to `TIERS` in `src/constants.ts`. Everything keys off
the array index via `tierRank()`, so insertions in the middle would break
legacy data silently. Always append.

When the game adds new droids, append to `DROID_DICT` and add their
stats to `droidStats.json`. Bump `SEED_VERSION` in `data/version.ts`.

When the game adds a new reward type (a sixth GAIN field, say), extend
`RebirthGain` in `src/types.ts` and update `RankCard` and the editor —
older exports without the new field still import fine.
