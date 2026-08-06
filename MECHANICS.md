# Game mechanics — what we've actually measured

The single record of how *Fortnite: Star Wars Droid Tycoon* actually behaves,
as distinct from what the community workbooks publish.

The workbooks give **costs and requirements**. They say almost nothing about
**effects** — how much an upgrade does per level, what resets on Super Rebirth,
what's gated on what. Everything here was measured in-game and is the reason
`src/lib/srTiming.ts` and `src/lib/upgradeValue.ts` can compute rather than
guess.

**Where it lives in code** — this document is prose; the machine-readable
copies are the source of truth and are covered by tests:

| Data | File |
| --- | --- |
| Upgrade effects, swing constants, pickaxe formulas | `src/data/strategyTracks.seed.ts` |
| Rebirth multiplier samples | `src/data/rebirthMultipliers.seed.ts` |
| Costs, requirements, droid stats | `src/data/*.seed.ts` (imported from the workbooks) |

`src/data/mechanicsDoc.test.ts` fails if a measured effect exists in code but
isn't written up here, so this page can't silently fall behind the way
`STRATEGY.md` did.

---

## 1. The two income streams

### Droid mining (passive)

Droids in Working slots generate credits per second. Lounge and Companion
droids generate nothing — they only satisfy rebirth requirements and grant
buffs.

> **Unresolved:** a player's real generation back-solved to ~1.20M/s while the
> app's seed data summed to 2,591/s pre-multiplier — a ~25× gap even after the
> rebirth multiplier and the Credits upgrade. This may be an artefact of
> comparing a swing measurement against a roster recorded weeks earlier. Until
> it's resolved, the app takes a manually entered credits/s rather than trusting
> its own estimate.

### The scrap station (active)

A swing pays **credits equal to N seconds of your aggregate droid generation**,
where N comes from Scrap Value. Full-value swings are capped at **one per two
seconds**, and only land while your **pickaxe level ≥ the pile's level**.

For an actively-swinging player this dominates. One measured case: 900K/s from
scrapping against 46.9K/s from droids — **95% of total income**.

---

## 2. Swinging

Swings do two different jobs depending on the target.

| Target | Effect | Cadence |
| --- | --- | --- |
| Scrap station | credits = N seconds of generation | **1 per 2 s** (hard cap) |
| Droid under construction | removes seconds from the build | **2–3 per second** (no cap) |

**Build swing value is linear in pickaxe level:**

```
swingSeconds(n) = 1.2 × (n + 1)
```

Measured at L10 = 13.2 s and L11 = 14.4 s. Predicts L12 = 15.6 s and
L20 = 25.2 s — neither checked yet.

At 2.5 swings/s with a level-11 pickaxe the effective build rate is **~39×**, so
a six-hour RAINBOW craft finishes in about ten minutes. **The crafting times in
`craftingTimes.seed.ts` describe the un-swung case, which is not the case anyone
plays.** Build time is therefore not the setup bottleneck.

---

## 3. What Super Rebirth resets

| Resets | Survives |
| --- | --- |
| Deployments (working / lounge / companion) | Droidex ownership |
| Crafting stations, chip station | Nova upgrades |
| Standard rebirth level, credits, upgrade chips | ICONIC unlocks |
| Credit-bought lounge slots | Nova-bought lounge slots |
| **Pickaxe level** | Levels kept by Pickaxe Mastery |

**Pickaxe reset is probably the real setup bottleneck.** Swings drive the scrap
station *and* the build rate, so both collapse at the start of a run:

| Pickaxe | Swing | Build rate | Share of an L11 player |
| --- | --- | --- | --- |
| L0 | 1.2 s | ~4× | 11% |
| L5 | 7.2 s | ~20× | 51% |
| L11 | 14.4 s | ~39× | 100% |

**Pickaxe Mastery** keeps `5 + 2 × (level − 1)` pickaxe levels through a Super
Rebirth — L1 keeps 5, L4 keeps 11, L11 keeps 25. The right target is whatever
matches your **peak** pickaxe; beyond that it preserves levels you never reach.

### The credit multiplier carry-over

Super Rebirth adds its `creditMult` (from `superRebirthBonuses.seed.ts`)
directly to your permanent credit multiplier. Confirmed two ways: a
back-solved +0.30 against a granted 0.32, and the rounding pattern — a true
0.32 offset produces a displayed +0.4 for 20% of fractional positions and +0.3
for the rest, which is exactly the 1-in-5 observed.

---

## 4. The rebirth credit multiplier

Grows as you pass rebirth levels, by an amount that depends on **level**, not
on cycle. Two cycles with different Super Rebirth counts show the same step at
the same level.

| Level range | Step per rebirth |
| --- | --- |
| RB0 → 1 | +0.4 |
| RB1 → 5 | +0.5 |
| RB5 → 10 | +0.6 |
| RB10 → 13 | +0.7 |

The displayed figure is **not rebirth-only** — it folds in Nova upgrades and
Super Rebirth carry-over, so two players at the same RB won't match. That's why
`srTimingTable` takes the player's own reading and back-solves from it.

**Reading it:** take it *after collecting*, not straight after login. The HUD
can show a stale low value until the first collection refreshes it (observed:
21.2× → 20.0× → 21.2× with no rebirth in between).

---

## 5. Measured upgrade effects

| Upgrade | Effect per level | Unit |
| --- | --- | --- |
| Credits | +20% of base credits/s (additive) | credits/s |
| Scrap Value | +0.5 s of generation per swing | credits/s |
| Critical Chance | +5% crit chance on build swings | build time |
| Critical Amount | +10% crit amount on build swings | build time |
| Crafting Speed | +0.1/sec droid crafting | build time |
| Upgrade Chip Scrap | +5 chips, capping at +50 (L10) | chips |
| Jawa Bartering | +5% chance of double rewards per droid sold | per sale |
| Daily Crystals | 3 crystals/day (1 per quest, 3 quests) | crystals/day |
| Double Daily Quests | +3 crystals/day (doubles 3 → 6) | crystals/day |
| Pickaxe Mastery | +2 pickaxe levels kept through SR | setup |
| Collect All | L1 Battle, L2 Astromech, L3 Workers | convenience |
| Blueprint Scrap | better blueprints from the scrap station | drop quality |
| Super Crates | better world crates | drop quality |

**Credits is global** — it multiplies scrap income too, because the scrap swing
pays a number of seconds of aggregate generation. So Credits and Scrap Value
compound: `total = base × (1 + 0.2c) × (1 + 0.25n)`.

**Daily quests reset on Super Rebirth**, so a day you SR can pay 12 crystals
rather than 6.

### Cost structure worth knowing

Maxing the whole shop is **26,630 crystals**, which nobody will ever reach on
Super Rebirth income alone — so relative cost matters more than absolute.

Ten levels of each, for comparison:

| Upgrade | Ten levels |
| --- | --- |
| **Credits** | **200 ◆** |
| Scrap Value | 1,600 ◆ |
| Critical Chance | 1,950 ◆ |
| Critical Amount | 3,000 ◆ |

Credits is **15× cheaper** than Critical Amount for the same number of levels.
The two crit ladders together are **15,390 ◆ — 58% of the entire shop**.

### Still unmeasured

Companion Slot, Upgrade Chip Station, Max Health, Damage, Flawless Charm,
Movement Speed, Lounge Slot, Blueprint Storage, Rebirth Droid Alert,
Blueprint Vendor — costs known, effects not.

Also unknown: the base crit multiplier, the time to re-level a pickaxe, and
drop rates for anything in the "drop quality" category.

---

## 6. Corrections worth remembering

Each of these was believed, acted on, and overturned. They're recorded because
the failure modes recur.

| Believed | Actually | Lesson |
| --- | --- | --- |
| Crits multiply credit yield | They cut **build time** | Get the unit right before computing |
| Scrap Value isn't credit-denominated | It is — "1.5 seconds of base generation" | A failed reconciliation may be a bad input, not a bad model |
| Build swings share the 2 s scrap cap | 2–3 per second, uncapped | Don't generalise a limit across mechanics |
| The multiplier step is constant | Varies by level (0.4 → 0.7) | Short ranges hide slow drift |
| The step differs by cycle | Differs by **level**; cycles agree | Watch for confounded variables |
| "Do not sell" is a global freeze | Scoped to that row's droids | Read the source's own definition |
| Daily Crystals out-earns the SR loop | 15–30% of income | Payback ≠ dominance |

A recurring one worth stating on its own: **two readings that differ by 0.1
are not a trend when the display rounds to 0.1.** Several conclusions here were
walked back after testing whether a constant value plus rounding explained the
data. It usually did.
