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
- This app is unaffiliated with any rights holder. We describe it
  functionally as a "Droid Tycoon companion".

## Tiers

Six tiers, in-game labels are uppercase. The first five form the **upgrade
path** (DEFAULT → BESKAR). FLAWLESS is a sixth tier that's a **rare 1/1000
spawn variant** rather than an upgrade target.

```
DEFAULT → GOLD → DIAMOND → RAINBOW → BESKAR ───── FLAWLESS
```

- A FLAWLESS card outranks BESKAR for tier-substitution purposes.
- We map `Basic` → `DEFAULT` on import (community shorthand).

## Collection rarity

Five rarities, low → high:

```
COMMON → RARE → EPIC → LEGENDARY → ICONIC
```

- **ICONIC** replaces what we previously called MYTHIC; the
  authoritative community sheet uses ICONIC.
- ICONIC droids are **event-locked**: they spawn at DEFAULT (and
  optionally FLAWLESS) only — no Gold/Diamond/Rainbow/Beskar upgrades.
- ICONIC droids generate **percentage income** (e.g. `15%/s`) instead
  of a flat credits-per-second value — they multiply your base income.

## Droid classes

Three production classes:

- **WORKER**, **ASTROMECH**, **BATTLE**.

54 + 2 = **56 base droids** as of Pass 3:
- 54 upgradeable droids (each contributes 6 tier cards = 324 cards).
- 5 ICONIC event droids (BB8, MISTER BONES, IG-11 MARSHAL, DJ-R3X, CB-23
  coming soon — 2 cards each).
- The community count "260" refers to the Droidex card total once
  FLAWLESS and the new event droids are in.

## Active-droid rule

To count toward a rebirth, a card must be **active** in your base —
either Working or in the Lounge (rest area). Merely owning a card in
your Droidex does NOT count.

Models per `CollectionCard`:
- `owned` — collected in your Droidex.
- `active` — deployed (Working OR Lounge).

Only `active === true` cards contribute to readiness checks and to the
production calculator.

## Squads & slot capacity

Five squads; per-rebirth slot unlocks (corrected from Pass 2 — Lounge
starts at RB16, not RB17):

| Squad      | Base | Unlock levels                        | Max |
| ---------- | ---- | ------------------------------------ | --- |
| COMPANION  | 1    | —                                    | 1   |
| WORKER     | 4    | 1, 4, 7, 10, 12, 14, 16              | 11  |
| ASTROMECH  | 3    | 2, 5, 8, 11, 13, 15                  | 9   |
| BATTLE     | 2    | 3, 6, 9                              | 5   |
| LOUNGE     | 5    | 16, 17, 18, 19, 20                   | 10  |

## Rebirth cycles

Standard Rebirth runs through a **4-cycle loop**. Each cycle has its own
23 droid+tier requirements; **credit costs and per-rebirth rewards are
constant across cycles**.

```
Run #     | Cycle | Source
─────────────────────────────
First run | RBC1  | OG (pre-Super Rebirth)
After SRB1| RBC2  | after first Super Rebirth
After SRB2| RBC3  | after second Super Rebirth
After SRB3| RBC4  | after third Super Rebirth
After SRB4| RBC1  | loop
```

Derived: `cycleFor(superRebirthCount, override?)` = `(count % 4) + 1`,
unless the user pinned a manual override.

## Per-rebirth rewards

Every rebirth past RB11 grants Nova Crystals plus stacking multipliers:

| Level | Crystals | Credit ×  | XP ×   |
| ----- | -------- | --------- | ------ |
| 12    | 11       | 1.22      | 2.1    |
| 13    | 16       | 1.32      | 2.6    |
| …     | …        | …         | …      |
| 23    | 121      | 3.42      | 13.1   |

(Multipliers stored as `+N`-style deltas, e.g. RB12 stores `0.22` for
`+22%`. The UI renders them as `×1.22`.)

## Chip-upgrade costs

Per-rarity chip costs (and cantina-upgrade odds) — `chipCosts.seed.ts`:

| Rarity     | DEFAULT→G | G→D  | D→R  | R→B   | Total | Cantina |
| ---------- | --------- | ---- | ---- | ----- | ----- | ------- |
| COMMON     | 10        | 25   | 40   | 80    | 155   | 30%     |
| RARE       | 30        | 60   | 100  | 250   | 440   | 16%     |
| EPIC       | 120       | 180  | 240  | 5,000 | 5,540 | 8%      |
| LEGENDARY  | 400       | 1,200| 4,000| 12,000| 17,600| 4%      |

## Sell guidance

Each rebirth row carries a `sellList`. Possible values:

- `["DO_NOT_SELL"]` — the sheet explicitly warns against selling
  anything at this rebirth.
- `["B1 SECURITY", "BU-4D"]` — the named droids are safe to sell.
- `[]` — no guidance one way or the other.

The `sellHint()` helper combines that with a forward-scan of the cycle's
remaining requirements to produce a yes/no recommendation per droid.

## Cosmetics

Three kinds: **HAT** (~16, mostly world-found), **PAINT** (~21, unlocked
via rebirths / crafting / events / Nova Crystals), **EFFECT** (event
rewards).

Each item has a `requirementKind` (REBIRTH / CRAFT / FLAWLESS_CRAFT /
BESKAR_COLLECT / RINGS / WORLD / EVENT / NOVA / NONE) so the UI can
later link unlock conditions to the player's progress.

## Nova Crystals Shop

Two upgrade trees with per-level crystal costs (sparse arrays — `null`
where the cost is not yet known publicly):

- **Core**: Max Health, Damage, **Credits** (the main one),
  Flawless Charm, Movement Speed, Double Daily Quests, Pickaxe Mastery,
  Jawa Bartering, Super Crates.
- **Workshop**: Lounge Slot, Upgrade Chip Scrap, Scrap Value,
  Blueprint Scrap, Crafting Speed, Blueprint Storage, Collect All,
  Rebirth Droid Alert.

`crystalsSpent(upgrades, defs)` derives the spent total from the
player's per-upgrade levels; balance = earned − spent.

## Credits notation

K / M / B / T (and Q for future-proofing). Parsed to `bigint` via
`parseCredits()`; UI keeps strings so the player sees their own
notation.

## Data provenance

Two community workbooks supplied the authoritative Pass-3 data:

1. **DROID_TYCOON_REBIRTH_CYCLES.xlsx** by **starscurse** — the
   4-cycle rebirth requirements, per-level rewards, chip costs.
2. **Fortnite_Star_Wars_Droid_Tycoon_Tracker_TEMPLATE.xlsx** by
   **Cait** with **Omega** — the Droid Reference (cost/income/value
   per tier), DroidexRebirths (slot unlocks), Cosmetics, Nova Shop.

Cached references live under `/root/.claude/uploads/0649d0ae-…/`. Parsed
dumps were stored at `/tmp/sandcrawler-research/wb*.txt` during
development; a `gen_seeds.py` generator emits
`src/data/rebirthCycles.seed.ts` from those dumps to avoid
transcription errors.

### Licensing posture

Game facts (names, costs, requirements, rewards, income values) are not
copyrightable. We re-derive only those facts into our own typed
schema; we do not copy the workbooks' layouts, formulas, or chart
ordering. Sources credited in `README.md` and the in-app footer (the
Cosmetics/Nova tabs link community Discords where applicable in the
future).

## Future-proofing

- A new upgrade tier above BESKAR (before FLAWLESS in our index) needs
  to be **inserted** in `TIERS`, not appended — anything keying off
  `tierRank()` will be correct, but anything storing a tier string in
  user data is fine (`migrate.ts` re-normalises).
- New droids: append to `DROID_DICT` + `droidStats.json`. Bump
  `SEED_VERSION`.
- New rebirth cycle (a 5th cycle, say): extend `RebirthCycle` and add
  rows to `rebirthCycles.seed.ts`; `cycleFor()` already does modulo
  arithmetic.
- Schema breaks: bump `SCHEMA_VERSION`, add a `v{n}FromIntermediate`
  branch in `migrate.ts`.
