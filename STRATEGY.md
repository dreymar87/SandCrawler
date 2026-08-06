# SandCrawler — Strategy

What to actually do: when to Super Rebirth, what to buy, what to ignore.

This page is **decisions**. The measurements they rest on live in
[`MECHANICS.md`](./MECHANICS.md) and are not repeated here — an earlier version
of this document restated them and drifted eight corrections behind the code
before anyone noticed.

The app computes all of this against your own numbers on the **Strategy** tab.
Read this for the reasoning; read the tab for the answer.

---

## 1. The objective

Nova Crystals gate every permanent upgrade, and Super Rebirth is effectively
the only source of them. So the question is never "what should I buy" in
isolation — it's **how many crystals per hour am I earning**, and every
purchase is judged against that.

Maxing the whole shop costs **26,630 crystals**. A Super Rebirth at RB20 yields
79. You will not buy everything, so order matters more than totals.

---

## 2. When to Super Rebirth

**The short version: much earlier than the community says, unless you're rich.**

Reaching RB N costs *every* rebirth on the way up, so run length explodes while
the crystal reward creeps. Past a point, one more level costs more time than
it returns.

| Your credits/s | Best stop (2 h setup) |
| --- | --- |
| 10M/s | RB15 |
| 50M/s | RB16 |
| 100M/s | RB17 |
| 500M/s | RB19 |
| 2B/s | RB20 |

**"SR at RB19" is right for someone around 500M/s.** Below that it can cost you
half your crystal rate. Above ~2B/s you should push further.

Two things move your row:

- **Raising credits/s pays twice** — shorter runs *and* a higher optimal stop.
- **Cutting setup time is worth as much as raising income.** Setup is roughly
  half a run at typical rates.

### Reading the app's answer

Enter your real credits/s (the app can only see Droidex income, which misses
scrap entirely), your credit multiplier, and an honest setup estimate. The
recommendation is then computed from your data, integrating the multiplier as
it climbs.

Rows marked `~` project the multiplier more than six levels past where you are.
Treat those as rough — the correction is largest exactly where it's least
observed.

---

## 3. What to buy

### Buy first

1. **Daily Crystals — 30 ◆.** The only upgrade that *produces* crystals; all
   others are sinks. 3/day, so it pays for itself in ten days and compounds
   forever. Not dominant — it's ~15–30% of income — but the best payback in
   the shop.
2. **Double Daily Quests — 75 ◆.** Takes you to 6/day. Converted to
   crystals/hour it beats a Credits level for anyone playing under ~6.3 h/day,
   which is most people. Quests reset on Super Rebirth, so an SR day can pay 12.
3. **Pickaxe Mastery — up to your peak pickaxe.** Your pickaxe resets every
   Super Rebirth, and it gates the scrap station *and* your build speed, so
   without Mastery you restart at a fraction of your power and grind it back.
   Buy up to the level matching your **peak** and no further — beyond that it
   preserves levels you never reach. At pickaxe 11 that's L4, 45 ◆ all-in.
4. **Credits — steadily, forever.** +20% of base per level, and the flattest
   long ladder in the shop: ten levels for 200 ◆ against Critical Amount's
   3,000. It multiplies scrap income too, so it compounds with everything.
5. **Lounge Slot L1 — 1 crystal.** Lounge droids satisfy rebirth requirements
   without occupying a working slot. One crystal.
6. **Scrap Value** — interleaved with Credits rather than ahead of it. Credits
   L1–5 beat Scrap L1, which beats Credits L6+. Only pays while you're
   actively swinging.
7. **Collect All.** Walking the base to collect is time nothing else removes.
   L1 Battle, L2 Astromech, L3 Workers.

### Skip, or defer

- **Critical Chance / Critical Amount** — 15,390 ◆ between them, 58% of the
  shop. They speed up droid *builds*, which swinging already makes near-instant,
  so they're buying down a cost you don't have. Not worthless, just last.
- **Crafting Speed** — +0.1/sec against an effective build rate of ~36×. Buy
  the cheap early levels and stop.
- **Flawless Charm — 500 ◆.** Flawless is a cosmetic shiny, not a tier.
- **Max Health, Damage, Movement Speed** — combat stats. They don't move
  credits or crystals.

---

## 4. When credits are the bottleneck

Common situation: you're pushing droids up tiers for rebirth requirements, so
your working slots are full of droids chosen for what they *unlock* rather than
what they *earn*, and everything is slow.

The thing to understand is that **droid income is multiplied**. A scrap swing
pays a number of seconds of your droid generation, so raising that rate lifts
the passive and the active half together — at Scrap Value L3 and constant
swinging, every +1 credits/s of droid income is worth +1.75/s in practice.
That's what puts the levers in this order:

1. **Park rebirth droids in the lounge.** Lounge droids satisfy requirements
   without occupying a working slot, so your earners stay deployed. This costs
   nothing and is the single most common fix. Lounge Slot L1 is 1 crystal.
2. **Work your best earners.** The Strategy tab flags high-income droids
   sitting in the lounge and names what they'd replace.
3. **Tier upgrades on droids already working.** Chips, not crystals — a
   different budget from everything in the shop, so it competes with nothing.
4. **Credits — +20% of base per level.** Multiplies both halves, cheap ladder.
5. **Scrap Value.** Only after the above: it's the same currency as Credits and
   loses to it per crystal for most of the ladder.

And **do** chase rainbow piles. They pay 8× a common one but break in two or
three swings rather than eight, so they're worth roughly 3× per swing. The same
logic makes pickaxe level a credit lever, not just a build-speed one — it's what
keeps the big piles at two swings instead of five.

---

## 5. The traps

**Over-grinding.** Pushing past your row in the table above costs crystals per
hour. The instinct that further is always better is wrong here.

**Trusting the app's estimated credits/s.** It sees Droidex income only — no
rebirth multiplier, no Credits upgrade, no scrap. One player's real rate was
orders of magnitude higher. Read a scrap pile instead: the Strategy tab inverts
it into a rate, which is the only credits/s figure the game will give you.

**Letting Pickaxe Mastery fall behind your peak.** Every Super Rebirth you hand
back the difference, silently. The Strategy tab flags this and prices the fix.

**Reading your multiplier straight after login.** The HUD can show a stale low
value until your first collection.

---

## 6. What would change this advice

The buy order is judgement wherever an effect is unmeasured — 10 of 23 upgrades
still are. The highest-value gaps, in order:

1. **Where your setup time actually goes.** Crafting is ~10 minutes once you
   swing; the other ~110 are unaccounted for. Whatever they are is the thing
   worth optimising, and no upgrade is currently aimed at it.
2. **Time to re-level a pickaxe.** Would turn Pickaxe Mastery from a
   mechanism argument into arithmetic.
3. **Droid income reconciliation.** The app's seed-derived figure and reality
   differ by ~25×, unexplained.

See `MECHANICS.md` §6 for the running list of conclusions that were confidently
reached here and later overturned. It's worth a look before trusting any single
recommendation too hard.
