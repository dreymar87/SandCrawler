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

How trivial: **reaching RB12 costs 2.29B credits in total** — five seconds of
grinding at 500M/s. The early game is not a credit problem at all, it's a droid
acquisition problem. Everything Super Rebirth takes from you is deployment
state: working, lounge and companion counts zeroed, both crafting stations
emptied (Astromech and Battle re-lock), chip station emptied, credit-bought
lounge slots reset. Your Droidex, Nova upgrades and ICONIC unlocks survive.
So setup is however long it takes you to get the right droids crafted, tiered
and redeployed — realistically **one to three hours**.

So the thing to maximise is:

```
crystals per hour = crystals(N) / (setupHours + cumulativeCredits(N) / creditsPerSec / 3600)
```

Short runs amortise setup badly; long runs hit the credit wall. The optimum
sits between, and it **moves with your credit rate**.

### Where to actually stop

Best stopping level (and the crystals/hour it yields):

| your credits/s | 1 h setup | 2 h setup | 4 h setup |
| --- | --- | --- | --- |
| 10M/s | RB14 (15.8) | RB15 (9.7) | RB15 (5.8) |
| 50M/s | RB16 (24.9) | RB16 (14.9) | RB17 (8.8) |
| 100M/s | RB16 (29.8) | RB17 (17.7) | RB18 (10.2) |
| 250M/s | RB17 (37.1) | RB18 (21.5) | RB19 (12.2) |
| 500M/s | RB18 (43.0) | **RB19 (24.4)** | RB19 (14.1) |
| 1B/s | RB19 (48.7) | RB19 (28.2) | RB20 (16.0) |
| 2B/s | RB19 (56.4) | RB20 (32.0) | RB22 (19.2) |

**The community's "SR at RB19" is right for a specific player: around 500M/s
or more, with a realistic couple of hours of setup.** It is not right for a
mid-game player, where it can cost half your crystal rate.

### Read your row, then read the split

The stopping level matters less than the shape of your run. At 500M/s with 2 h
of setup:

| Stop at | Run | of which grinding | Crystals/hour |
| --- | --- | --- | --- |
| RB16 | 2.0 h | 0.0 h | 18.1 |
| RB17 | 2.1 h | 0.1 h | 21.7 |
| RB18 | 2.3 h | 0.3 h | 24.3 |
| **RB19** | **2.8 h** | **0.8 h** | **24.4** |
| RB20 | 3.9 h | 1.9 h | 20.5 |
| RB21 | 5.5 h | 3.5 h | 16.6 |

Stopping at RB16 here means two hours of setup followed by *no grinding at
all* — 37 crystals for pure overhead. RB17 through RB19 are nearly tied, so
anywhere in that band is fine; RB20 is where it turns over.

**When setup dominates your run, push further.** The marginal grind is cheap
against overhead you've already paid. When your credit rate is low enough that
grinding dominates, stop earlier. The app shows the split so you can see which
regime you're in.

### Treat the recommendation as a floor

The model holds your credits/s flat for a whole run. It isn't, and the error
runs one way — it makes stopping high look worse than it is:

1. **Rebirth levels raise your multiplier as you climb.** So the expensive late
   levels are earned at a *higher* rate than the early ones, and the grind
   hours quoted for the top of the ladder are overstated.
2. **Super Rebirth raises the floor permanently.** The credit multiplier it
   grants (+22% at RB12, rising to +508% at RB30) applies to every future run.
   Stopping higher pays forward, and a single-run model can't see that at all.

Both push the same direction: **the true best stop is a level or two above what
the table says**, and the gap widens the more runs you intend to do. On a tie,
go higher.

Closing this properly needs the per-rebirth-level multiplier curve — how much
credit and XP bonus each RB grants, and what base you reset to after a Super
Rebirth. No community sheet publishes it yet. It's the highest-value unknown
left in this document.

### Two things that follow

- **Raising credits/s pays twice.** It shortens the run *and* raises the level
  you should stop at, which raises crystals per run.
- **Cutting setup time is worth as much as raising income** — and since the
  early game is droid acquisition rather than credits, that means Crafting
  Speed and Collect All are progression upgrades, not comfort.

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

### Credits vs Scrap Value — this part is arithmetic

Two upgrades now have measured effects, so their order doesn't need arguing:

| Upgrade | Effect | Passive? |
| --- | --- | --- |
| **Credits** | +20% of base credits/s per level, additive | yes |
| **Scrap Value** | +0.5× base yield *per swing* per level (L3 = 1.5×) | no — active only |

Scrap Value's swing yield is a multiple of *your own base rate*, so it scales
with everything else you've built. But the game hard-caps full-value swings at
**one every two seconds**, which puts a ceiling on it: at 0.5 swings/second,
each level is worth `0.5 × 0.5 = +25%` of base credits/s.

Converting both to *percent of base gained per crystal spent* gives a single
ranking:

| Buy | Cost | Gain | Per crystal |
| --- | --- | --- | --- |
| Credits L1–5 | 50 ◆ | +100% | 10.0 → 1.11 |
| **Scrap Value L1** | 25 ◆ | +25% | 1.00 |
| Credits L6–11 | 192 ◆ | +120% | 0.91 → 0.48 |
| **Scrap Value L2** | 55 ◆ | +25% | 0.45 |
| Credits L12+ | … | … | 0.43 → 0.20 |

**Scrap Value interleaves; it doesn't lead.** Credits L1–5 beat it outright —
50 crystals doubles your base rate, which nothing else in the shop comes close
to. Scrap L1 then slots in ahead of Credits L6.

And that's at *perfect* uptime. Scrap Value only pays while you're at the
screen swinging, so its real value scales with the fraction of a run you spend
doing that:

- **Always swinging** — Scrap L1 ranks 6th, just after Credits L5.
- **Half the time** — it falls behind Credits L11.
- **Never** — it's worth nothing; buy Credits only.

The app computes this ranking live and takes your swing uptime as a setting.

**Upgrade Chip Scrap** is measured too — **+5 chips per level, capping at +50
at L10** — but chips aren't credits, and there's no honest exchange rate
between them. It's recorded, and deliberately left out of the ranking above
rather than converted with a made-up number.

**Credits is confirmed additive.** The shop shows L6 as `+120% → 140%`, which
is exactly 6 × 20% going to 7 × 20%. No assumption left here.

### Scrapping probably dwarfs your droids

Worked example from a real roster — 13 droids, RB7, Scrap Value L3:

| Source | Rate | Share |
| --- | --- | --- |
| Droids (1,570/s base × ICONIC boosters × 18.1) | 46.9K/s | **5%** |
| Scrap station (1.80M a swing, one swing / 2 s) | 900K/s | **95%** |

One swing is worth **38 seconds** of that entire droid economy. And the swing
isn't limited by materials — it's gated on your **pickaxe level being at or
above the scrap pile's**, after which you can keep swinging every ~2 seconds.

Two things follow, if this generalises:

- **Pickaxe Mastery is an income gate**, not a convenience. It decides which
  piles you can harvest at all.
- **Droid income may be close to irrelevant while you're actively playing.**
  It still matters for idle stretches and rebirth requirements.

> **The open question that decides the buy order.** Does the Credits upgrade
> multiply *all* credit income, or only droid income? It changes the answer
> completely:
>
> | Next level | If Credits is global | If Credits is droids-only |
> | --- | --- | --- |
> | Credits L7 (26 ◆) | 7,284 credits/s per ◆ | 361 credits/s per ◆ |
> | Scrap Value L4 (115 ◆) | 2,609 credits/s per ◆ | 2,609 credits/s per ◆ |
>
> Global → Credits stays top. Droids-only → **Scrap Value wins by 7×** and the
> whole ranking inverts. Buying one Credits level and watching whether your
> per-swing figure moves would settle it in a minute.

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

Scrap Value sits mid-table on cost, but note the shape of its ladder: the first
three levels are 165 ◆ and the last three are over 1,500 ◆. Buy the cheap end
for the confirmed multiplier above; there's no case yet for chasing the tail.

---

## 4. Traps

### The two crit ladders — held, not condemned

Both are measured: **Critical Chance +5%/level**, **Critical Amount
+10%/level**. What took two wrong turns to establish is *what they apply to*.

They govern **swinging at a droid while it's building** — each swing removes
time from the build, and a crit removes more. So they are a **setup-time**
upgrade, not a credit upgrade.

That matters because setup time is not a minor line item. It's roughly half of
what a Super Rebirth run costs you, and the model in section 2 shows halving it
nearly doubles crystals/hour at every stopping level. An upgrade that speeds up
droid crafting is attacking the right thing.

They still can't be priced against the Credits ladder, because one number is
missing: **how many seconds a swing removes from a build**. With that, plus the
crafting times the app already carries, both ladders become directly comparable
to everything else.

Until then: don't buy 15,390 ◆ worth on faith, but don't write them off either.
Measure the per-swing time cut first — it's the cheapest high-value measurement
left.

**Flawless Charm (500 ◆).** Flawless is a cosmetic shiny, not a tier. It does
nothing for progression.

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

1. **The per-rebirth multiplier curve** — the credit/XP bonus each RB level
   grants, and the base you reset to after a Super Rebirth. This is the one
   that would remove the known bias from the timing model, and it's now the
   single most consequential unknown left.
2. **Seconds a build-swing removes** — the one number that would let the two
   crit ladders (15,390 ◆, 58% of the shop) be priced instead of held.
3. **Baseline droid crafting rate** — Crafting Speed adds +0.1/sec per level,
   but without the baseline that can't be turned into hours saved, which is
   what the Super Rebirth model actually consumes.

**Already measured**, all confirmed against the live shop:

| Upgrade | Effect |
| --- | --- |
| Credits | +20% of base credits/s per level (additive) |
| Scrap Value | +0.5× base yield per swing per level; 1 full-value swing / 2 s |
| Critical Chance | +5% crit chance per level, on pickaxe swings |
| Critical Amount | +10% crit amount per level, on pickaxe swings |
| Upgrade Chip Scrap | +5 chips per level, capping at +50 (L10) |
| Crafting Speed | +0.1/sec droid crafting per level |
| Jawa Bartering | +5% chance of double rewards per droid sold, per level |

Every crystal cost in this document has also been spot-checked against the
in-game shop — Credits L6→7 (26 ◆), Jawa Bartering L1→2 (15 ◆), Critical
Chance L1→2 (90 ◆), Critical Amount L0→1 (30 ◆) and Crafting Speed L1→2
(18 ◆) all match the imported sheet data exactly.

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
