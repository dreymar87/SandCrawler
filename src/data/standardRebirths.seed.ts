import type { StandardRebirth } from "../types";

/**
 * Known Standard Rebirth requirements, seeded from the deep-research pass.
 *
 * Coverage is PARTIAL — community sources for the full RB1–RB20+ table sit
 * behind 403 walls (insider-gaming, games.gg, fandom). The entries below
 * are the ones confirmed in search snippets; everything else is up to the
 * user to fill in via the Data tab or future seed updates.
 *
 * If you can edit a wiki for this game, please put the full table there
 * and we'll grow this file in a future pass.
 */
export const STANDARD_REBIRTHS: readonly StandardRebirth[] = [
  {
    level: 1,
    credits: "10K",
    needs: [
      { name: "C8", tier: "DEFAULT" },
      { name: "Pit", tier: "DEFAULT" },
      { name: "DRK-1", tier: "DEFAULT" },
    ],
    source: "seed",
    notes: "First rebirth. Confirmed: insider-gaming.com.",
  },
  {
    level: 3,
    credits: "",
    needs: [{ name: "BU-4D", tier: "DEFAULT" }],
    source: "seed",
    notes: "BU-4D introduced at DEFAULT here; appears Gold at RB5, Diamond at RB7. Other droids unknown.",
  },
  {
    level: 5,
    credits: "",
    needs: [{ name: "BU-4D", tier: "GOLD" }],
    source: "seed",
    notes: "Partial — only the BU-4D requirement is confirmed.",
  },
  {
    level: 7,
    credits: "",
    needs: [{ name: "BU-4D", tier: "DIAMOND" }],
    source: "seed",
    notes: "Partial — only the BU-4D requirement is confirmed.",
  },
  {
    level: 9,
    credits: "",
    needs: [{ name: "Groundmech", tier: "RAINBOW" }],
    source: "seed",
    notes: "Groundmech RAINBOW appears for the first time. Other droids unknown.",
  },
  {
    level: 15,
    credits: "21B",
    needs: [
      { name: "R7", tier: "RAINBOW" },
      { name: "Cyclo-Grav", tier: "RAINBOW" },
      { name: "B2-RP", tier: "RAINBOW" },
    ],
    source: "seed",
    notes: "Confirmed: insider-gaming.com snippet.",
  },
  {
    level: 18,
    credits: "325B",
    needs: [
      { name: "Opti-STRK", tier: "RAINBOW" },
      { name: "R7", tier: "RAINBOW" },
      { name: "MONO-WLKR", tier: "RAINBOW" },
    ],
    source: "seed",
    notes: "Confirmed: insider-gaming.com snippet (RB18).",
  },
  {
    level: 19,
    credits: "810B",
    needs: [
      { name: "B2-RP", tier: "RAINBOW" },
      { name: "Cyclo-Grav", tier: "RAINBOW" },
      { name: "Proto-Roller", tier: "RAINBOW" },
    ],
    source: "seed",
    notes: "Confirmed: insider-gaming.com snippet (RB19).",
  },
];
