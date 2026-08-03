import type { DroidDef, Tier } from "../types";

/**
 * The droid dictionary — every droid in the in-game Droidex with its
 * canonical ALL-CAPS name, rarity, type, and available tiers.
 *
 * These are game facts (not copyrightable), re-derived from community
 * sources — primarily the open-source erikpeik/droidex tracker
 * (github.com/erikpeik/droidex), which itself mirrors a community-
 * maintained Google Sheet. SandCrawler owns the schema; data corrections
 * belong here and in DOMAIN.md.
 *
 * Each droid expands at runtime to one Droidex card per tier in its
 * `tiers` array (5 normally, 1 for event-locked MYTHIC droids).
 */

/** All six upgrade tiers (COMMON…MYTHIC droids). */
const ALL_TIERS: Tier[] = ["DEFAULT", "GOLD", "DIAMOND", "RAINBOW", "BESKAR", "GALACTIC"];
/** ICONIC event droids are DEFAULT-only — no upgrade tiers, no FLAWLESS. */
const ICONIC_TIERS: Tier[] = ["DEFAULT"];

export const DROID_DICT: readonly DroidDef[] = [
  // ── COMMON ───────────────────────────────────────────────────────────────
  { canonical: "MOUSE", class: "WORKER", rarity: "COMMON", tiers: ALL_TIERS },
  { canonical: "PIT", class: "WORKER", rarity: "COMMON", tiers: ALL_TIERS, aliases: ["PIT DROID"] },
  { canonical: "GONK", class: "WORKER", rarity: "COMMON", tiers: ALL_TIERS, aliases: ["GNK", "GONK DROID"] },
  { canonical: "CB", class: "ASTROMECH", rarity: "COMMON", tiers: ALL_TIERS, aliases: ["C8", "C-8"] },
  { canonical: "R3", class: "ASTROMECH", rarity: "COMMON", tiers: ALL_TIERS, aliases: ["R-3"] },
  { canonical: "R5", class: "ASTROMECH", rarity: "COMMON", tiers: ALL_TIERS, aliases: ["R-5"] },
  { canonical: "R8", class: "ASTROMECH", rarity: "COMMON", tiers: ALL_TIERS, aliases: ["R-8"] },
  { canonical: "IMPERIAL PROBE", class: "BATTLE", rarity: "COMMON", tiers: ALL_TIERS },
  { canonical: "B1 BATTLE", class: "BATTLE", rarity: "COMMON", tiers: ALL_TIERS, aliases: ["B1"] },
  { canonical: "DRK-1 PROBE", class: "BATTLE", rarity: "COMMON", tiers: ALL_TIERS, aliases: ["DRK-1", "DRK1", "PROBE"] },
  { canonical: "ID10", class: "BATTLE", rarity: "COMMON", tiers: ALL_TIERS, aliases: ["ID-10"] },

  // ── RARE ─────────────────────────────────────────────────────────────────
  { canonical: "BDX EXPLORER", class: "WORKER", rarity: "RARE", tiers: ALL_TIERS, aliases: ["BDX"] },
  { canonical: "ARG", class: "WORKER", rarity: "RARE", tiers: ALL_TIERS },
  { canonical: "SENATE HOVERCAM", class: "WORKER", rarity: "RARE", tiers: ALL_TIERS, aliases: ["HOVERCAM"] },
  { canonical: "B-U4D", class: "WORKER", rarity: "RARE", tiers: ALL_TIERS, aliases: ["BU-4D", "BU4D", "B U4D", "BUFORD"] },
  { canonical: "BAL-CORE", class: "WORKER", rarity: "RARE", tiers: ALL_TIERS, aliases: ["BAL CORE"] },
  { canonical: "ROLL-R", class: "WORKER", rarity: "RARE", tiers: ALL_TIERS, aliases: ["ROLLR", "ROLLER"] },
  { canonical: "2BB", class: "ASTROMECH", rarity: "RARE", tiers: ALL_TIERS, aliases: ["2-BB", "TWOBB"] },
  { canonical: "A-LT", class: "ASTROMECH", rarity: "RARE", tiers: ALL_TIERS, aliases: ["ALT"] },
  { canonical: "R4", class: "ASTROMECH", rarity: "RARE", tiers: ALL_TIERS, aliases: ["R-4"] },
  { canonical: "R9", class: "ASTROMECH", rarity: "RARE", tiers: ALL_TIERS, aliases: ["R-9"] },
  { canonical: "B1 SECURITY", class: "BATTLE", rarity: "RARE", tiers: ALL_TIERS, aliases: ["B1-SECURITY"] },
  { canonical: "NAV-EX", class: "BATTLE", rarity: "RARE", tiers: ALL_TIERS, aliases: ["NAVEX"] },
  { canonical: "VECT-ARM", class: "BATTLE", rarity: "RARE", tiers: ALL_TIERS, aliases: ["VECTARM"] },
  { canonical: "HOV-R", class: "BATTLE", rarity: "RARE", tiers: ALL_TIERS, aliases: ["HOVR", "HOVER"] },

  // ── EPIC ─────────────────────────────────────────────────────────────────
  { canonical: "GROUNDMECH", class: "WORKER", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["GROUND MECH", "GROUND-MECH"] },
  { canonical: "LO", class: "WORKER", rarity: "EPIC", tiers: ALL_TIERS },
  { canonical: "AMP WALKER", class: "WORKER", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["AMP-WALKER", "AMPWALKER"] },
  { canonical: "SEN-TRI", class: "WORKER", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["SENTRI"] },
  { canonical: "OPTI-POD", class: "WORKER", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["OPTIPOD", "OPTI POD"] },
  { canonical: "GUNRUNNER", class: "WORKER", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["GUN RUNNER"] },
  { canonical: "BB", class: "ASTROMECH", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["BB UNIT"] },
  { canonical: "R2", class: "ASTROMECH", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["R-2", "R2D2"] },
  { canonical: "R6", class: "ASTROMECH", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["R-6"] },
  { canonical: "TRAK-R", class: "ASTROMECH", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["TRAKR", "TRACKER"] },
  { canonical: "ORB-WALKER", class: "ASTROMECH", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["ORB WALKER", "ORBWALKER"] },
  { canonical: "UTIL-TEC", class: "ASTROMECH", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["UTILTEC", "UTIL TEC"] },
  { canonical: "B1 HEAVY", class: "BATTLE", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["B1-HEAVY"] },
  { canonical: "B2 SUPER", class: "BATTLE", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["B2-SUPER"] },
  { canonical: "B2 HEAVY", class: "BATTLE", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["B2-HEAVY"] },
  { canonical: "STRIKE-ORB", class: "BATTLE", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["STRIKE ORB", "STRIKEORB"] },
  { canonical: "HAUL-R", class: "BATTLE", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["HAULR", "HAULER"] },
  { canonical: "LNG-SHOT", class: "BATTLE", rarity: "EPIC", tiers: ALL_TIERS, aliases: ["LNGSHOT", "LONG SHOT", "LONG-SHOT"] },

  // ── LEGENDARY ────────────────────────────────────────────────────────────
  {
    canonical: "PROTO-ROLLER",
    class: "WORKER",
    rarity: "LEGENDARY",
    tiers: ALL_TIERS,
    aliases: ["PROTO ROLLER", "PROTOROLLER"],
  },
  {
    canonical: "MECHA-DROID",
    class: "WORKER",
    rarity: "LEGENDARY",
    tiers: ALL_TIERS,
    aliases: ["MECHA DROID", "MECHADROID"],
  },
  {
    canonical: "MONO-WALKER",
    class: "WORKER",
    rarity: "LEGENDARY",
    tiers: ALL_TIERS,
    aliases: ["MONO WALKER", "MONOWALKER", "MONO-WLKR", "MONO WLKR"],
  },
  { canonical: "BB9", class: "ASTROMECH", rarity: "LEGENDARY", tiers: ALL_TIERS, aliases: ["BB-9"] },
  { canonical: "R7", class: "ASTROMECH", rarity: "LEGENDARY", tiers: ALL_TIERS, aliases: ["R-7"] },
  { canonical: "B2-RP", class: "BATTLE", rarity: "LEGENDARY", tiers: ALL_TIERS, aliases: ["B2 RP", "B2RP"] },
  {
    canonical: "CYCLO-GRAV",
    class: "BATTLE",
    rarity: "LEGENDARY",
    tiers: ALL_TIERS,
    aliases: ["CYCLO GRAV", "CYCLOGRAV"],
  },
  {
    canonical: "OPTI-STRIKE",
    class: "BATTLE",
    rarity: "LEGENDARY",
    tiers: ALL_TIERS,
    aliases: ["OPTI STRIKE", "OPTI-STRK", "OPTISTRIKE"],
  },

  // ── MYTHIC (sandcrawler-only; upgrade normally through FLAWLESS; RB24-27) ──
  { canonical: "SNOW MOUSE", class: "WORKER", rarity: "MYTHIC", tiers: ALL_TIERS, aliases: ["SNOWMOUSE"] },
  { canonical: "RIC", class: "WORKER", rarity: "MYTHIC", tiers: ALL_TIERS },
  { canonical: "LOADLIFTER", class: "WORKER", rarity: "MYTHIC", tiers: ALL_TIERS, aliases: ["LOAD LIFTER", "LOAD-LIFTER"] },
  { canonical: "LEP", class: "WORKER", rarity: "MYTHIC", tiers: ALL_TIERS },
  { canonical: "RIC-1200", class: "WORKER", rarity: "MYTHIC", tiers: ALL_TIERS, aliases: ["RIC1200", "RIC 1200"] },
  { canonical: "DRFT-R", class: "ASTROMECH", rarity: "MYTHIC", tiers: ALL_TIERS, aliases: ["DRFTR", "DRIFTER", "DRFT R"] },
  { canonical: "CYCLENS", class: "ASTROMECH", rarity: "MYTHIC", tiers: ALL_TIERS },
  { canonical: "MO-TRAK", class: "ASTROMECH", rarity: "MYTHIC", tiers: ALL_TIERS, aliases: ["MOTRAK", "MO TRAK"] },
  { canonical: "TRI-TEK", class: "ASTROMECH", rarity: "MYTHIC", tiers: ALL_TIERS, aliases: ["TRITEK", "TRI TEK"] },
  { canonical: "IG", class: "BATTLE", rarity: "MYTHIC", tiers: ALL_TIERS },
  { canonical: "KX", class: "BATTLE", rarity: "MYTHIC", tiers: ALL_TIERS },

  // ── ICONIC (event droids; DEFAULT-only, income booster + unique companion effect) ──
  { canonical: "BB8", class: "ASTROMECH", rarity: "ICONIC", tiers: ICONIC_TIERS, eventLocked: true, aliases: ["BB-8"], companionEffect: "100% upgrade chips" },
  { canonical: "MISTER BONES", class: "BATTLE", rarity: "ICONIC", tiers: ICONIC_TIERS, eventLocked: true, aliases: ["MR BONES", "MR. BONES"], companionEffect: "×2 damage" },
  { canonical: "IG-11 MARSHAL", class: "BATTLE", rarity: "ICONIC", tiers: ICONIC_TIERS, eventLocked: true, aliases: ["IG-11", "IG11", "IG11 MARSHAL"], companionEffect: "Blueprint shield" },
  { canonical: "DJ-R3X", class: "WORKER", rarity: "ICONIC", tiers: ICONIC_TIERS, eventLocked: true, aliases: ["DJ R-3X", "DJ R3X", "DJ-R-3X"], companionEffect: "×2 world-quest rewards" },
  { canonical: "CB-23", class: "ASTROMECH", rarity: "ICONIC", tiers: ICONIC_TIERS, eventLocked: true, aliases: ["CB23"], companionEffect: "Secret astromech mission" },
  { canonical: "R2-D2", class: "ASTROMECH", rarity: "ICONIC", tiers: ICONIC_TIERS, eventLocked: true, aliases: ["R2D2", "R2 D2"], companionEffect: "×2 assigned astromech mission reward" },
  { canonical: "C-3PO", class: "WORKER", rarity: "ICONIC", tiers: ICONIC_TIERS, eventLocked: true, aliases: ["C3PO", "C 3PO", "C-3P0"], companionEffect: "+100% droid sell value" },
  { canonical: "CHOPPER", class: "ASTROMECH", rarity: "ICONIC", tiers: ICONIC_TIERS, eventLocked: true, aliases: ["C1-10P", "C110P"], companionEffect: "+50% crit chance & damage" },
];

/** Total Droidex card count = sum over droids of their tier-count. */
export const TOTAL_CARDS = DROID_DICT.reduce((n, d) => n + d.tiers.length, 0);
