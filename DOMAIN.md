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
- FLAWLESS applies to the 62 upgradeable droids; **ICONIC droids are
  DEFAULT-only** (no FLAWLESS variant).
- We map `Basic` → `DEFAULT` on import (community shorthand).

## Collection rarity

Six rarities, low → high:

```
COMMON → RARE → EPIC → LEGENDARY → MYTHIC → ICONIC
```

- **MYTHIC** and **ICONIC** are distinct top rarities:
  - **MYTHIC** droids (SNOW MOUSE, RIC, MO-TRAK, KX, …) spawn only from
    the sandcrawler and **upgrade normally** through the six tiers
    (DEFAULT…FLAWLESS), with their own steep chip costs. Introduced for
    RB24-27.
  - **ICONIC** droids (BB8, MISTER BONES, IG-11 MARSHAL, DJ-R3X, CB-23,
    R2-D2) are **event-locked, DEFAULT-only** (no upgrades, no FLAWLESS)
    and generate a **percentage income** boost (`15%/s`, or `25%/s` for
    R2-D2) rather than a flat credits/sec value.
  - (Historically we briefly used "MYTHIC" for what are now ICONIC
    droids; migration v3→v4 rewrote those labels. The two are now
    separate.)

## Droid classes

Three production classes: **WORKER**, **ASTROMECH**, **BATTLE**.

**68 base droids → 378 cards** (as of the RB24-27 data drop):
- 62 upgradeable droids (COMMON/RARE/EPIC/LEGENDARY/MYTHIC), each 6 tier
  cards (DEFAULT…FLAWLESS) = 372 cards.
- 6 ICONIC event droids, DEFAULT-only = 6 cards.
- The workbook's "0/316" headline is stale and self-inconsistent (its own
  per-tier columns sum to 378: base 68 + five higher tiers × 62). We use
  the dict-derived 378.

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

Five squads. WORKER / ASTROMECH / BATTLE / COMPANION expand purely via
per-rebirth slot unlocks (`getMaxSlots`, `src/lib/squads.ts`):

| Squad      | Base | Unlock levels                        | Max |
| ---------- | ---- | ------------------------------------ | --- |
| COMPANION  | 1    | —                                    | 1   |
| WORKER     | 4    | 1, 4, 7, 10, 12, 14, 16              | 11  |
| ASTROMECH  | 3    | 2, 5, 8, 11, 13, 15                  | 9   |
| BATTLE     | 2    | 3, 6, 9                              | 5   |

**LOUNGE is special** (v8) — its capacity is *not* the generic
base+unlocks path. It's credit-bought slots plus a persistent Nova-Shop
upgrade:

```
loungeCapacity = loungeCreditSlots + novaLoungeSlots
  loungeCreditSlots : base 0–5 + RB17/RB18 unlocks; credit-bought;
                      RESETS TO 0 on Super Rebirth. Max = 5 + unlocks
                      reached (LOUNGE_RB_UNLOCKS = [17, 18]; 19/20 TBC).
  novaLoungeSlots   : Nova-Shop "workshop.lounge-slot" level; persists.
```

Lives in `src/lib/baseView.ts` (`loungeCapacity`, `maxLoungeCreditSlots`,
`loungeRbUnlocksAt`). `SQUAD_DEFS.LOUNGE.unlocks` is `[]` so the generic
path never applies.

The **Base tab** (`src/components/Base/BasePanel.tsx`, replaced Home in
v8) shows each squad's deployed÷capacity fill (deployed = Σ `working` by
droid class, or Σ `lounge` for the Lounge) plus a "Safe to sell" list of
owned droids no future rebirth in the cycle needs (via
`isDroidSafeToSell`). Companion droids aren't tracked yet.

## Rebirth cycles

Standard Rebirth runs through a **4-cycle loop**. Each cycle has its own
**30** droid+tier requirements (RB1-30; RB24+ introduce MYTHIC droids, and
RB28-30 require GALACTIC-tier droids); **credit costs and per-rebirth rewards
are constant across cycles**. The seeds are regenerated from the community
workbooks with `node scripts/import-sheets.mjs <cycles.xlsx> <tracker.xlsx>
--write` — don't hand-edit the generated files.

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

## Per-rebirth slot unlock

Each Standard Rebirth grants exactly one in-game side-effect we model:
a slot unlocks in one of the squads. Stored as
`StandardRebirth.slotUnlock` (or `null` if the level grants no slot).

## Super Rebirth bonuses

When you **Super Rebirth from RB level N** (12 ≤ N ≤ 27), you receive a
one-time bonus: Nova Crystals + a credit-multiplier % + an XP-multiplier %.
These are *not* per-rebirth rewards — they fire once at the moment of
Super Rebirth. Values match the community sheet's "NOVA CRYSTALS / RB
LEVEL" table verbatim.

| RB at SRB | Crystals | Credit Mult | XP Mult |
| --------- | -------- | ----------- | ------- |
| 12        | 11       | 22%         | 110%    |
| 13        | 16       | 32%         | 160%    |
| …         | …        | …           | …       |
| 23        | 121      | 242%        | 1210%   |
| 24        | 137      | 274%        | 1370%   |
| 25        | 154      | 308%        | 1540%   |
| 26        | 172      | 344%        | 1720%   |
| 27        | 191      | 382%        | 1910%   |

Stored in `src/data/superRebirthBonuses.seed.ts` as decimals
(`creditMult: 0.22` = `22%`), looked up via `srbBonusAt(rbLevel)`.
The UI renders them as percentages (`22%`) to match the sheet exactly.

## Pickaxe

Levelled at a merchant, and the app tracks it as `profile.pickaxeLevel` plus a
`pickaxePeak` that survives resets.

It matters because it gates **both** income streams. The scrap station only
pays while your level is at or above the pile's, and a swing at a droid under
construction removes `1.2 × (level + 1)` seconds from the build.

**It resets on Super Rebirth**, down to whatever Pickaxe Mastery preserves
(`5 + 2 × (mastery − 1)` levels). `performSuperRebirth` models this: the level
drops, the peak does not. Mastery should be bought up to the peak and no
further.

Measurements and their provenance: `MECHANICS.md` §2–3.

## Chip-upgrade costs

Per-rarity chip costs (and cantina-upgrade odds) — `chipCosts.seed.ts`.
MYTHIC droids are sandcrawler-only and not in the cantina rotation
(odds 0):

| Rarity     | DEFAULT→G | G→D    | D→R    | R→B     | Total   | Cantina |
| ---------- | --------- | ------ | ------ | ------- | ------- | ------- |
| COMMON     | 10        | 25     | 40     | 80      | 155     | 30%     |
| RARE       | 30        | 60     | 100    | 250     | 440     | 16%     |
| EPIC       | 120       | 180    | 240    | 5,000   | 5,540   | 8%      |
| LEGENDARY  | 400       | 1,200  | 4,000  | 12,000  | 17,600  | 4%      |
| MYTHIC     | 8,000     | 15,000 | 40,000 | 80,000  | 143,000 | —       |

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

Two upgrade trees + a one-shot ICONIC droid section. `costs[i]` is the
crystal cost to upgrade from level `i` to level `i+1`; `null` entries
mean the level exists but its cost isn't yet publicly known. The UI
shows `?` for unknown next-level costs and still allows progress past
them.

- **Core**: Max Health (L8), Damage (L8), **Credits** (L18),
  Flawless Charm (L1), Movement Speed (L18), Double Daily Quests (L1),
  Pickaxe Mastery (L11), Jawa Bartering (L5), Super Crates (L3).
- **Workshop**: Lounge Slot (L4), Upgrade Chip Scrap (L10),
  Scrap Value (L19), Blueprint Scrap (L4), Crafting Speed (L11),
  Blueprint Storage (L3), Collect All (L3), Rebirth Droid Alert (L1),
  Blueprint Vendor (L1).
- **ICONIC Droids** (Nova Shop purchase): BB8 / MISTER BONES /
  IG-11 MARSHAL / DJ-R3X at **30 crystals each**, CB-23 at **75
  crystals**. One-shot purchase. R2-D2 and C-3PO are sold here too (30
  crystals each) — event-locked as DROIDS, but still purchasable unlocks.

`crystalsSpent(upgrades, defs, iconicOwned)` sums the player's spent
total across both. `balance = novaEarned − crystalsSpent`. Unknown
costs contribute `0` to the sum.

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
