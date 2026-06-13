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

const ALL_TIERS: Tier[] = ["DEFAULT", "GOLD", "DIAMOND", "RAINBOW", "BESKAR"];
const DEFAULT_ONLY: Tier[] = ["DEFAULT"];

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
  { canonical: "BU-4D", class: "WORKER", rarity: "RARE", tiers: ALL_TIERS, aliases: ["BU4D", "BUFORD"] },
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

  // ── MYTHIC (event-locked; DEFAULT-only, percentage income boosters) ─────
  { canonical: "BB8", class: "ASTROMECH", rarity: "MYTHIC", tiers: DEFAULT_ONLY, eventLocked: true, aliases: ["BB-8"] },
  { canonical: "MISTER BONES", class: "BATTLE", rarity: "MYTHIC", tiers: DEFAULT_ONLY, eventLocked: true, aliases: ["MR BONES", "MR. BONES"] },
  { canonical: "IG-11 MARSHAL", class: "BATTLE", rarity: "MYTHIC", tiers: DEFAULT_ONLY, eventLocked: true, aliases: ["IG-11", "IG11", "IG11 MARSHAL"] },
];

/** Total Droidex card count = sum over droids of their tier-count. */
export const TOTAL_CARDS = DROID_DICT.reduce((n, d) => n + d.tiers.length, 0);
