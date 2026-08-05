# SandCrawler — Strategy

How to decide **when to Super Rebirth** and **what to buy in the Nova Shop**,
derived from the community workbooks the app already ships as seed data.

The app computes the personal version of all of this on the **Strategy** tab.
This document is the reasoning behind it.

> **What's solid and what isn't.** Every crystal cost, rebirth credit cost and
> Super Rebirth reward here is read straight from the seeds — those are
> verified data. What nobody has published is how much each Nova upgrade
> *level actually does* (+x% credits, etc.). So the SR-timing maths below is
> computed and checkable; the buy order is argued, not solved. The two are
> labelled separately throughout, and the app does the same.

---

## 1. The objective

Nova Crystals gate every permanent upgrade in the game, and **Super Rebirth is
effectively the only source of them**. So the question that governs everything
else isn't "what do I buy" — it's "how many crystals per hour am I earning".

Maxing the entire Nova Shop costs **26,630 crystals**. A Super Rebirth at RB20
yields 79. That's ~337 full runs to buy everything, which you will never do —
so the order you buy in, and the rate you earn at, are the whole game.

---

## 2. When to Super Rebirth

### The trap

Reaching RB N doesn't cost the price of RB N — it costs **every rebirth on the
way up**, because you pay each level as you pass it. Meanwhile the crystal
reward rises almost linearly. Those two curves diverge violently:

| SR at | Crystals | Total credits to get there | Crystals per 1T | Marginal per 1T |
| --- | --- | --- | --- | --- |
| RB15 | 29 | 0.04T | 825 | 333 |
| RB16 | 37 | 0.09T | 425 | 154 |
| RB17 | 46 | 0.22T | 212 | 69 |
| RB18 | 56 | 0.54T | 103 | 31 |
| RB19 | 67 | 1.35T | 50 | 14 |
| **RB20** | **79** | **3.35T** | **24** | **6** |
| RB21 | 92 | 6.35T | 14 | 4 |

The last column is what one more level actually buys. **RB19 → RB20 costs 2T
for 12 crystals** — a fifth the efficiency of RB17 → RB18. Every level is worse
than the one before it, with no exceptions anywhere on the ladder.

### Why you still don't stop at RB12

Pure crystals-per-credit says stop as early as possible. What stops you is the
**fixed setup cost** of a run: re-crafting droids and grinding back through the
early levels. Those levels cost trivial credits but real wall-clock time, and
you pay that overhead once per run no matter where you stop.

So the thing to maximise is:

```
crystals per hour = crystals(N) / (setupHours + cumulativeCredits(N) / creditsPerSec / 3600)
```

Short runs amortise setup badly; long runs hit the credit wall. The optimum
sits between, and it **moves with your credit rate**.

### Where to actually stop

Best stopping level (and the crystals/hour it yields):

| your credits/s | 30 min setup | 1 h setup | 2 h setup |
| --- | --- | --- | --- |
| 10M/s | RB14 (24.6) | RB14 (15.8) | RB15 (9.7) |
| 50M/s | RB15 (41.7) | RB16 (24.9) | RB16 (14.9) |
| 100M/s | RB16 (49.9) | RB16 (29.8) | RB17 (17.7) |
| 500M/s | RB17 (74.1) | RB18 (43.0) | RB19 (24.4) |
| 1B/s | RB18 (86.1) | RB19 (48.7) | RB19 (28.2) |
| 3B/s | RB19 (107.2) | RB20 (60.3) | RB21 (35.5) |

**The community's "SR at RB19" is only right above roughly 500M/s.** Below
that it's actively costly. At 100M/s with an hour of setup:

| Stop at | Run length | Crystals/hour |
| --- | --- | --- |
| **RB16** | **1.2 h** | **29.8** |
| RB17 | 1.6 h | 28.7 |
| RB18 | 2.5 h | 22.3 |
| RB19 | 4.8 h | 14.1 |
| RB20 | 10.3 h | 7.7 |

RB16 earns **more than double** what RB19 does, in a quarter of the time.

RB20 is a bad stop for almost everyone — but not literally everyone. It
overtakes RB19 at about **3B/s**. If you're there, the whole table shifts up
and RB20–21 becomes correct.

### Two things that follow

- **Raising credits/s pays twice.** It shortens the run *and* raises the level
  you should stop at, which raises crystals per run.
- **Cutting setup time is worth as much as raising income.** Going from 1 h to
  30 min of setup nearly doubles crystals/hour at every level in the table.
  That makes Crafting Speed and Collect All progression upgrades, not comfort.

---

## 3. What to buy

> Ordering from here down is **judgement**, not computation — the workbooks
> don't publish effect magnitudes. The reasoning is given so it can be argued
> with. The app applies it to what you already own.

### If you're farming crystals

1. **Daily Crystals — 30 ◆.** The only upgrade in the shop that *produces*
   crystals; all 22 others are sinks. Cheaper than a single SR at RB15, and it
   pays out independently of the run loop. First, always.
2. **Lounge Slot L1 — 1 ◆.** Lounge droids satisfy rebirth requirements but
   produce no credits, so parking a required droid there keeps a working slot
   free for an income droid. One crystal.
3. **Credits L1–5 — 50 ◆.** The direct credit multiplier and the flattest long
   ladder in the shop.
4. **Collect All L1 — 3 ◆** and **Crafting Speed L1–3 — 54 ◆.** These attack
   setup time, which the model above shows is worth as much as credit rate.
5. **Credits L6–10 — 150 ◆.** Ten levels total for 200 ◆.
6. **Double Daily Quests — 75 ◆.** Another reward stream outside the run loop.
7. **Upgrade Chip Scrap, then the Upgrade Chip Station — 120 ◆.** Chips buy
   tier upgrades, and tier upgrades do double duty: more credits/s *and*
   satisfying the DIAMOND/RAINBOW requirements that gate RB17+.

### Why the Credits ladder specifically

Ten levels of each, compared:

| Ten levels of… | Cost |
| --- | --- |
| **Credits** | **200 ◆** |
| Scrap Value | 1,600 ◆ |
| Critical Chance | 1,950 ◆ |
| Critical Amount | 3,000 ◆ |

Credits is **15× cheaper** than Critical Amount for the same number of levels,
and it's the one that directly shortens every run.

---

## 4. Traps

**The two crit ladders.** Critical Chance (5,670 ◆) and Critical Amount
(9,720 ◆) total **15,390 ◆ — 58% of the entire shop's 26,630**. At RB19 rates
that's over 200 Super Rebirths for two upgrades with no established effect on
credit throughput. If you learn that crits drive mining income substantially,
this changes — that's the single measurement most worth making.

**Flawless Charm (500 ◆).** Flawless is a cosmetic shiny, not a tier. It does
nothing for progression.

**Scrap Value (5,605 ◆).** Second-most expensive ladder. Early levels are fine;
it climbs fast. Only worth it if you scrap heavily.

**Over-grinding.** Pushing to RB20+ below ~3B/s costs you crystals per hour, as
above. The instinct that "further is better" is wrong here.

---

## 5. Mechanics worth knowing

- **Working vs Lounge.** Only Working droids generate credits. Both count for
  rebirth requirements. So the lounge is where rebirth-required droids should
  live, keeping working slots on pure income.
- **Chips are double duty.** Tier upgrades raise a droid's credits/s *and*
  satisfy higher-tier rebirth requirements. From RB17 up, nearly every
  requirement is DIAMOND or RAINBOW, so chips gate both halves of a run.
- **The credit multiplier compounds across runs.** Each Super Rebirth grants a
  permanent additive credit multiplier (RB16 → +74%, RB19 → +134%). Even the
  short runs recommended above keep raising your floor.
- **Selling is safe more often than the sheet says.** A rebirth row flagged
  "do not sell" means *that row's* droids aren't finished — not that nothing is
  sellable. The app computes this per droid.

---

## 6. What's unknown, and how to settle it

The single gap is **effect magnitude per upgrade level**. Everything in
section 3 would become computable with it.

It's measurable without much effort: note your credits/s, buy one level, note
it again. The highest-value measurements, in order:

1. **Critical Amount L1** — decides whether 58% of the shop is a trap or the
   main event.
2. **Credits L1** — calibrates the ladder this whole plan leans on.
3. **Crafting Speed L1** — converts a setup-time saving into hours, which the
   SR model consumes directly.

If you record those, the Strategy tab can rank the shop on measured returns
instead of the argument above.

---

## Sources

Costs, rebirth requirements and Super Rebirth rewards come from the community
workbooks (Cait/Omega's Tracker and the Rebirth Cycles sheet), imported by
`scripts/import-sheets.mjs` into `src/data/*.seed.ts`.

The maths lives in `src/lib/srTiming.ts`; the buy order in
`src/data/strategyTracks.seed.ts`. The headline figures quoted here are pinned
by tests in `src/lib/srTiming.test.ts` and `src/data/strategyDoc.test.ts`, so a
future sheet import that moves them fails the build rather than silently
leaving this page wrong.
