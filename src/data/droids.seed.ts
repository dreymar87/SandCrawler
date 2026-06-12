import type { DroidDef } from "../types";

/**
 * The droid dictionary — canonical in-game names + class + community aliases.
 *
 * This is a STARTER list seeded from the deep-research pass (see DOMAIN.md).
 * The full Droidex contains ~258 droids; populating the rest is a follow-up
 * pass (community Google Sheet at
 * https://docs.google.com/spreadsheets/d/1otLCKSCMKICMlnefirQ8KZhh_rdZTd5Mp8h0UYFUiqg).
 *
 * Naming convention: `canonical` preserves in-game casing (UPPERCASE for
 * model-code droids like MONO-WLKR, Title-case for proper names). Class
 * assignments are best-guess from public guides and should be corrected as
 * we get better data.
 */
export const DROID_DICT: readonly DroidDef[] = [
  // ── Workers (production) ─────────────────────────────────────────────────
  { canonical: "Mouse", class: "WORKER" },
  { canonical: "Gonk", class: "WORKER", aliases: ["GNK", "Gonk Droid"] },
  { canonical: "Pit", class: "WORKER", aliases: ["Pit Droid"] },
  { canonical: "BU-4D", class: "WORKER", aliases: ["BU4D", "Buford"] },
  { canonical: "Groundmech", class: "WORKER", aliases: ["Ground Mech"] },
  { canonical: "MONO-WLKR", class: "WORKER", aliases: ["Mono Walker", "Mono-Walker", "Mono WLKR"] },
  { canonical: "HOV-R", class: "WORKER", aliases: ["HOVR", "Hover"] },
  { canonical: "Proto-Roller", class: "WORKER", aliases: ["Proto Roller", "ProtoRoller"] },
  { canonical: "Cyclo-Grav", class: "WORKER", aliases: ["Cyclo Grav", "CycloGrav"] },
  { canonical: "Mecha-Droid", class: "WORKER", aliases: ["Mecha Droid", "MechaDroid"] },

  // ── Astromechs ───────────────────────────────────────────────────────────
  { canonical: "C8", class: "ASTROMECH", aliases: ["C-8", "C8 Droid"] },
  { canonical: "R7", class: "ASTROMECH", aliases: ["R-7"] },
  { canonical: "R9", class: "ASTROMECH", aliases: ["R-9"] },
  { canonical: "BB", class: "ASTROMECH", aliases: ["BB Unit"] },
  { canonical: "ARG", class: "ASTROMECH" },

  // ── Battle / Security ────────────────────────────────────────────────────
  { canonical: "DRK-1", class: "BATTLE", aliases: ["DRK1", "DRK 1", "Probe", "DRK-1 Probe"] },
  { canonical: "B1 Security", class: "BATTLE", aliases: ["B1", "B1-Security"] },
  { canonical: "B2-RP", class: "BATTLE", aliases: ["B2 RP", "B2RP"] },
  { canonical: "Opti-STRK", class: "BATTLE", aliases: ["Opti STRK", "OptiSTRK", "Opti-Strike"] },
];
