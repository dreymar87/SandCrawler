import { describe, expect, it } from "vitest";
import type { DroidDef } from "../types";
import { buildDroidIndex } from "./autocomplete";

const dict: DroidDef[] = [
  { canonical: "Mouse", class: "WORKER" },
  { canonical: "MONO-WLKR", class: "WORKER", aliases: ["Mono Walker", "Mono-Walker"] },
  { canonical: "Pit", class: "WORKER", aliases: ["Pit Droid"] },
  { canonical: "DRK-1", class: "BATTLE", aliases: ["Probe", "DRK-1 Probe"] },
];

describe("buildDroidIndex", () => {
  const idx = buildDroidIndex(dict);

  it("resolves exact normalized lookups", () => {
    expect(idx.resolve("mouse")?.canonical).toBe("Mouse");
    expect(idx.resolve("MONO-WLKR")?.canonical).toBe("MONO-WLKR");
  });

  it("resolves via aliases", () => {
    expect(idx.resolve("Mono Walker")?.canonical).toBe("MONO-WLKR");
    expect(idx.resolve("Probe")?.canonical).toBe("DRK-1");
  });

  it("returns null for unknown names", () => {
    expect(idx.resolve("Not A Droid")).toBe(null);
    expect(idx.resolve("")).toBe(null);
  });

  it("prefix-matches when the user types a partial canonical", () => {
    const matches = idx.search("Mou");
    expect(matches[0]?.def.canonical).toBe("Mouse");
  });

  it("returns alias hits with viaAlias=true and the matched alias as the display string", () => {
    const matches = idx.search("Probe");
    expect(matches[0]?.def.canonical).toBe("DRK-1");
    expect(matches[0]?.viaAlias).toBe(true);
    expect(matches[0]?.matched.toLowerCase()).toContain("probe");
  });

  it("dedupes — alias and canonical both matching produce one entry", () => {
    const matches = idx.search("MONO");
    const monos = matches.filter((m) => m.def.canonical === "MONO-WLKR");
    expect(monos).toHaveLength(1);
  });

  it("respects the result limit", () => {
    const matches = idx.search("o", 2);
    expect(matches.length).toBeLessThanOrEqual(2);
  });

  it("returns an empty array for an empty query rather than every droid", () => {
    expect(idx.search("")).toEqual([]);
  });
});
