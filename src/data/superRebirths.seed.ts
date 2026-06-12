import type { SuperRebirth } from "../types";

/**
 * Super Rebirth seed. **Only the bootstrap example from the migration brief.**
 * Super Rebirth requirements are NOT officially documented; the rest is
 * up to users to log as they play, which is the whole point of SandCrawler.
 *
 * The user can edit / delete this example freely.
 */
export const SUPER_REBIRTHS_SEED: readonly SuperRebirth[] = [
  {
    id: "seed-sr2",
    level: "2",
    ranks: [
      {
        id: "seed-sr2-r1",
        rank: "1",
        credits: "10.00K",
        creditsReady: false,
        droids: [
          { name: "Mouse", tier: "DEFAULT" },
          { name: "Pit", tier: "DEFAULT" },
          { name: "Gonk", tier: "DEFAULT" },
        ],
        gain: {
          credits: "2K",
          multiplier: "+45%",
          slot: "Worker",
          force: "Push",
        },
        notes: "Seed example from the migration brief — edit or delete as you go.",
      },
    ],
  },
];
