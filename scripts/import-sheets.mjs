#!/usr/bin/env node
/**
 * Regenerates the data seeds from the two community workbooks.
 *
 *   node scripts/import-sheets.mjs <REBIRTH_CYCLES.xlsx> <TRACKER_TEMPLATE.xlsx> [--write]
 *
 * Without --write it prints a summary and changes nothing (dry run).
 *
 * `--check-nova` instead reports sheet-vs-seed drift for the Nova shop and
 * exits non-zero if they disagree. The Nova seed is hand-maintained (it carries
 * ids, trees and display names the sheet has no column for), so this is the
 * guard that a cost ladder changing under us gets noticed — the Pass 30 import
 * missed exactly that.
 *
 * Regenerates:
 *   src/data/rebirthCycles.seed.ts   (RB requirements, credits, sell lists)
 *   src/data/droidStats.json         (per-tier cost / income / value)
 *   src/data/craftingTimes.seed.ts   (per-tier build times)
 *
 * Expected layouts (verified against the Aug-2025 sheet drop):
 *   Cycles workbook, tabs "RBC1 (dark)".."RBC4 (dark)":
 *     A = "RB n" · B = droids · C = credits · D = sell list · E = tier reqs
 *     E is "Tier - A, B | Tier - C"; a segment with no tier prefix continues
 *     the previous tier ("Rainbow - R7 | B2-RP" => both RAINBOW).
 *   Tracker, tab "Droid Reference Sheet (costsval":
 *     A = rarity · B = droid · C = type · D..U = COST/INCOME/VALUE x 6 tiers
 *   Tracker, tab "Droid Crafting Times + Companio":
 *     B = droid · D..I = build time per tier
 *
 * Things the sheets do NOT carry are preserved from the existing seed:
 * `slotUnlock` and `source`. Credits keep the app's compact notation (10K,
 * 2.95M) because the values are identical — only the sheet's spelling differs.
 *
 * Droid names are resolved through the app's own alias dictionary; an
 * unresolvable name is a hard error rather than a silently dropped row.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

// ── Minimal .xlsx reader (zip + SpreadsheetML), no dependencies ──────────

/** Read a zip archive into { name: Buffer }. Supports stored + deflated entries. */
function unzip(buf) {
  const files = {};
  // Locate the End Of Central Directory record (scan back over the comment).
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file (no EOCD)");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16); // start of central directory
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central directory");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    // Jump to the local header to find where the data actually starts.
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    files[name] = method === 0 ? raw : inflateRawSync(raw);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const decodeXmlEntities = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&");

/** Concatenated text of every <t> in a chunk (shared strings may be split by runs). */
const textOf = (xml) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXmlEntities(m[1])).join("");

function colToIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n; // 1-based, matching spreadsheet columns
}

/**
 * Parse a workbook into { sheetName: Map<"r,c", value> }. Values come back as
 * strings (numbers stringified) which is what every consumer here wants.
 */
function readWorkbook(path) {
  const zip = unzip(readFileSync(path));
  const shared = zip["xl/sharedStrings.xml"]
    ? [...zip["xl/sharedStrings.xml"].toString("utf8").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        textOf(m[1]),
      )
    : [];
  const rels = {};
  for (const m of zip["xl/_rels/workbook.xml.rels"]
    .toString("utf8")
    .matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    rels[m[1]] = m[2].replace(/^\/?xl\//, "").replace(/^\//, "");
  }
  const book = zip["xl/workbook.xml"].toString("utf8");
  const sheets = {};
  for (const m of book.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/?>/g)) {
    const name = decodeXmlEntities(m[1]);
    const target = rels[m[2]];
    const xml = zip[`xl/${target}`];
    if (!xml) continue;
    const cells = new Map();
    // Either a self-closing <c .../> or <c ...>body</c>. Keeping these two
    // cases distinct matters: a lazy optional body lets an empty self-closing
    // cell swallow the next cell's value.
    for (const c of xml.toString("utf8").matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const body = c[2] ?? "";
      const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1];
      if (!ref) continue;
      const type = attrs.match(/t="([^"]+)"/)?.[1];
      let val;
      if (type === "s") {
        const i = body.match(/<v>(\d+)<\/v>/);
        val = i ? shared[Number(i[1])] : "";
      } else if (type === "inlineStr") {
        val = textOf(body);
      } else {
        const v = body.match(/<v>([\s\S]*?)<\/v>/);
        val = v ? decodeXmlEntities(v[1]) : "";
      }
      if (val === undefined || val === null || String(val).trim() === "") continue;
      const row = Number(ref.match(/\d+$/)[0]);
      cells.set(`${row},${colToIndex(ref)}`, String(val).trim());
    }
    sheets[name] = cells;
  }
  return sheets;
}

const cell = (sheet, r, c) => sheet.get(`${r},${c}`) ?? "";
const maxRow = (sheet) => Math.max(...[...sheet.keys()].map((k) => Number(k.split(",")[0])), 0);

// ── Droid-name resolution via the app's own dictionary ───────────────────

const normalizeName = (raw) =>
  String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function loadDroidIndex() {
  const src = readFileSync(`${ROOT}/src/data/droids.seed.ts`, "utf8");
  const index = new Map();
  // Each entry spans until the next `canonical:` or the array end.
  const entries = src.split(/canonical:\s*"/).slice(1);
  for (const chunk of entries) {
    const canonical = chunk.slice(0, chunk.indexOf('"'));
    index.set(normalizeName(canonical), canonical);
    const aliasBlock = chunk.match(/aliases:\s*\[([^\]]*)\]/);
    if (aliasBlock) {
      for (const a of aliasBlock[1].matchAll(/"([^"]+)"/g)) {
        index.set(normalizeName(a[1]), canonical);
      }
    }
  }
  return index;
}

const TIERS = ["DEFAULT", "GOLD", "DIAMOND", "RAINBOW", "BESKAR", "GALACTIC"];
const TIER_ALIASES = { BASIC: "DEFAULT", DAMOND: "DIAMOND", BASE: "DEFAULT" };

// ── Parsers ─────────────────────────────────────────────────────────────

/** "Default - A, B | Gold - C" -> [{name,tier}] (segments may omit the tier). */
function parseRequirements(text, resolve, where) {
  const out = [];
  let tier = null;
  for (const segment of text.split("|")) {
    const seg = segment.trim();
    if (!seg) continue;
    const m = seg.match(/^([A-Za-z]+)\s*-?\s*([\s\S]*)$/);
    let body = seg;
    if (m) {
      const head = m[1].toUpperCase();
      const asTier = TIER_ALIASES[head] ?? head;
      if (TIERS.includes(asTier)) {
        tier = asTier;
        body = m[2];
      }
    }
    if (!tier) throw new Error(`${where}: requirement segment with no tier: ${seg}`);
    for (const raw of body.split(",")) {
      const name = raw.trim();
      if (!name) continue;
      out.push({ name: resolve(name, `${where} requirement`), tier });
    }
  }
  return out;
}

function parseCycles(sheets, resolve) {
  const rows = [];
  for (const cycle of [1, 2, 3, 4]) {
    const sheet = sheets[`RBC${cycle} (dark)`];
    if (!sheet) throw new Error(`missing tab "RBC${cycle} (dark)"`);
    for (let r = 1; r <= maxRow(sheet); r++) {
      const lvlText = cell(sheet, r, 1);
      if (!/^RB\s*\d+$/i.test(lvlText)) continue;
      const level = Number(lvlText.replace(/\D/g, ""));
      const where = `C${cycle} RB${level}`;
      const credits = cell(sheet, r, 3);
      const sellText = cell(sheet, r, 4);
      const reqText = cell(sheet, r, 5);
      if (!reqText) throw new Error(`${where}: no tier requirements in column E`);
      const sellList = /do not sell/i.test(sellText)
        ? ["DO_NOT_SELL"]
        : sellText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((n) => resolve(n, `${where} sell list`));
      rows.push({
        level,
        cycle,
        credits,
        needs: parseRequirements(reqText, resolve, where),
        sellList,
      });
    }
  }
  return rows;
}

function parseStats(sheets, resolve) {
  const sheet = sheets["Droid Reference Sheet (costsval"];
  if (!sheet) throw new Error('missing tab "Droid Reference Sheet (costsval"');
  const out = {};
  for (let r = 4; r <= maxRow(sheet); r++) {
    const name = cell(sheet, r, 2);
    if (!name) continue;
    const canonical = resolve(name, "stats sheet");
    const perTier = {};
    TIERS.forEach((tier, i) => {
      const base = 4 + i * 3; // D, G, J, M, P, S
      const cost = cell(sheet, r, base);
      const income = cell(sheet, r, base + 1);
      const value = cell(sheet, r, base + 2);
      if (!cost && !income && !value) return;
      perTier[tier] = {
        cost: cost && cost !== "N/A" ? cost : null,
        income: income && income !== "N/A" ? income : "",
        value: value && value !== "N/A" ? value : null,
      };
    });
    if (Object.keys(perTier).length) out[canonical] = perTier;
  }
  return out;
}

/** Excel may store times as text ("0:08:22") or as a fraction of a day. */
function normalizeTime(raw) {
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(raw)) {
    const [h, m, s] = raw.split(":").map(Number);
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  const asNumber = Number(raw);
  if (!Number.isFinite(asNumber)) return null;
  const total = Math.round(asNumber * 86400);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseCraftingTimes(sheets, resolve) {
  const sheet = sheets["Droid Crafting Times + Companio"];
  if (!sheet) throw new Error('missing tab "Droid Crafting Times + Companio"');
  const out = {};
  for (let r = 4; r <= maxRow(sheet); r++) {
    const name = cell(sheet, r, 2);
    if (!name) continue;
    const canonical = resolve(name, "crafting times");
    const perTier = {};
    TIERS.forEach((tier, i) => {
      const raw = cell(sheet, r, 4 + i); // D..I
      if (!raw || raw === "N/A") return;
      const t = normalizeTime(raw);
      if (t) perTier[tier] = t;
    });
    if (Object.keys(perTier).length) out[canonical] = perTier;
  }
  return out;
}

// ── Preserved-from-existing-seed data ───────────────────────────────────

/** slotUnlock + source aren't in the sheets; carry them over per (cycle, level). */
function loadExistingCycleExtras() {
  const src = readFileSync(`${ROOT}/src/data/rebirthCycles.seed.ts`, "utf8");
  const extras = new Map();
  for (const m of src.matchAll(
    /\{level:\s*(\d+),\s*cycle:\s*(\d+),[\s\S]*?slotUnlock:\s*(null|"[A-Z]+"),\s*source:\s*"([^"]+)"\}/g,
  )) {
    extras.set(`${m[2]}-${m[1]}`, { slotUnlock: m[3], source: m[4] });
  }
  return extras;
}

/**
 * Nova-shop cost columns from the tracker, as { "CRITICAL CHANCE": [60, 90, …] }.
 *
 * The tab lays several blocks side by side (Featured / Core / Workshop /
 * Cosmetics), each introduced by its own "LEVEL" column, so the header row is
 * read as: every named column is a cost column, and its values run down until
 * they stop. Trailing prose in the header row has no numbers under it and
 * drops out on its own.
 */
function parseNovaCosts(sheets) {
  const tab = Object.keys(sheets).find((n) => /nova/i.test(n));
  if (!tab) throw new Error("no Nova tab in the tracker workbook");
  const sheet = sheets[tab];

  let header = 0;
  for (let r = 1; r <= 12 && !header; r++) {
    if (cell(sheet, r, 1).toUpperCase() === "LEVEL") header = r;
  }
  if (!header) throw new Error(`no "LEVEL" header row in ${JSON.stringify(tab)}`);

  const width = Math.max(...[...sheet.keys()].map((k) => Number(k.split(",")[1])), 0);
  const last = maxRow(sheet);
  const out = new Map();
  for (let c = 1; c <= width; c++) {
    const name = cell(sheet, header, c).trim();
    if (!name || name.toUpperCase() === "LEVEL") continue;
    const costs = [];
    for (let r = header + 1; r <= last; r++) {
      const v = cell(sheet, r, c);
      if (v === "") break; // a gap ends the ladder
      const n = Number(v);
      if (!Number.isFinite(n)) break;
      costs.push(n);
    }
    if (costs.length) out.set(name.toUpperCase(), costs);
  }
  return out;
}

/** Print sheet-vs-seed drift for every Nova upgrade. Returns true if clean. */
function checkNova(trackerBook) {
  const sheet = parseNovaCosts(trackerBook);
  const src = readFileSync(`${ROOT}/src/data/novaShop.seed.ts`, "utf8");
  const seed = new Map();
  for (const m of src.matchAll(/name:\s*"([^"]+)",\s*\n?\s*costs:\s*\[([^\]]*)\]/g)) {
    seed.set(
      m[1].toUpperCase(),
      m[2]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s === "null" ? null : Number(s))),
    );
  }
  if (!seed.size) throw new Error("could not parse NOVA_UPGRADES out of novaShop.seed.ts");

  let clean = true;
  for (const [name, costs] of seed) {
    const sheetCosts = sheet.get(name);
    if (!sheetCosts) {
      console.log(`  ?  ${name} — in the seed, no column in the sheet`);
      continue;
    }
    // Seed `null` means "level exists, cost unpublished" — the sheet filling
    // one in is drift worth reporting, not an error to hide.
    const same =
      costs.length === sheetCosts.length && costs.every((v, i) => v === sheetCosts[i]);
    if (same) continue;
    clean = false;
    console.log(`  !  ${name}`);
    console.log(`       seed  (${costs.length}): ${costs.join(", ")}`);
    console.log(`       sheet (${sheetCosts.length}): ${sheetCosts.join(", ")}`);
  }
  for (const name of sheet.keys()) {
    if (!seed.has(name)) console.log(`  +  ${name} — in the sheet, no seed entry`);
  }
  console.log(clean ? "nova: seed matches the sheet" : "nova: DRIFT (hand-edit novaShop.seed.ts)");
  return clean;
}

/** Keep the app's compact credit notation when it means the same number. */
const SUFFIX = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, Q: 1e15, MILLION: 1e6, BILLION: 1e9, TRILLION: 1e12 };
function creditValue(text) {
  const s = String(text).replace(/,/g, "").trim().toUpperCase();
  const m = s.match(/^([\d.]+)\s*([A-Z]*)$/);
  if (!m) return NaN;
  return Number(m[1]) * (SUFFIX[m[2]] ?? 1);
}
function compactCredits(text) {
  const n = creditValue(text);
  if (!Number.isFinite(n)) return String(text).trim();
  for (const [suffix, mult] of [["T", 1e12], ["B", 1e9], ["M", 1e6], ["K", 1e3]]) {
    if (n >= mult) {
      const v = n / mult;
      return `${Number.isInteger(v) ? v : Number(v.toFixed(2))}${suffix}`;
    }
  }
  return String(n);
}

// ── Emitters ────────────────────────────────────────────────────────────

const q = (s) => JSON.stringify(s);

function emitCycles(rows, extras) {
  const header = `// AUTO-GENERATED from the community workbooks — do not edit by hand.
// Regenerate with: node scripts/import-sheets.mjs <cycles.xlsx> <tracker.xlsx> --write
// Source: starscurse's "DROID_TYCOON_REBIRTH_CYCLES.xlsx" (rebirth requirements
// across all 4 cycles) and Cait/Omega's "Fortnite_Star_Wars_Droid_Tycoon_Tracker_TEMPLATE.xlsx"
// (per-level slot unlocks). Game facts, not copyrightable; re-derived
// into our own schema. See DOMAIN.md for full provenance.

import type { StandardRebirth } from "../types";

export const REBIRTH_CYCLES: readonly StandardRebirth[] = [
`;
  const body = rows
    .slice()
    .sort((a, b) => a.cycle - b.cycle || a.level - b.level)
    .map((r) => {
      const extra = extras.get(`${r.cycle}-${r.level}`) ?? { slotUnlock: "null", source: "seed" };
      const needs = r.needs.map((n) => `{name: ${q(n.name)}, tier: ${q(n.tier)}}`).join(", ");
      const sell = r.sellList.map(q).join(", ");
      return `  {level: ${r.level}, cycle: ${r.cycle}, credits: ${q(compactCredits(r.credits))}, needs: [${needs}], sellList: [${sell}], slotUnlock: ${extra.slotUnlock}, source: ${q(extra.source)}},`;
    })
    .join("\n");
  return `${header}${body}\n];\n`;
}

function emitCraftingTimes(times) {
  const entries = Object.entries(times)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, tiers]) => {
      const inner = TIERS.filter((t) => tiers[t]).map((t) => `${t}: ${q(tiers[t])}`).join(", ");
      return `  ${q(name)}: { ${inner} },`;
    })
    .join("\n");
  return `// AUTO-GENERATED from the community workbooks — do not edit by hand.
// Regenerate with: node scripts/import-sheets.mjs <cycles.xlsx> <tracker.xlsx> --write
// Source: Cait/Omega's tracker, "Droid Crafting Times + Companion Buffs" tab.
// Build time per droid per tier, with no crafting-speed bonuses applied.
// Game facts, not copyrightable.

import type { Tier } from "../types";

export type CraftingTimes = Record<string, Partial<Record<Tier, string>>>;

export const CRAFTING_TIMES: CraftingTimes = {
${entries}
};
`;
}

// ── Main ────────────────────────────────────────────────────────────────

const [cyclesPath, trackerPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const write = process.argv.includes("--write");
if (!cyclesPath || !trackerPath) {
  console.error("usage: node scripts/import-sheets.mjs <cycles.xlsx> <tracker.xlsx> [--write]");
  process.exit(1);
}

const index = loadDroidIndex();
const unresolved = new Set();
const resolve = (raw, where) => {
  const hit = index.get(normalizeName(raw));
  if (!hit) {
    unresolved.add(`${raw}  (${where})`);
    return String(raw).trim();
  }
  return hit;
};

const cyclesBook = readWorkbook(cyclesPath);
const trackerBook = readWorkbook(trackerPath);

if (process.argv.includes("--dump")) {
  for (const [name, sheet] of Object.entries(cyclesBook)) {
    console.log(`[cycles] ${JSON.stringify(name)} cells=${sheet.size} maxRow=${maxRow(sheet)}`);
  }
  const s = cyclesBook["RBC1 (dark)"];
  if (s) for (let r = 1; r <= 5; r++) console.log(" row", r, [1, 2, 3, 4, 5].map((c) => JSON.stringify(cell(s, r, c))).join(" "));
  process.exit(0);
}

// The Nova shop stays hand-maintained (the seed carries ids/names/trees the
// sheet has no column for), so this only reports drift — it never writes.
if (process.argv.includes("--check-nova")) {
  process.exit(checkNova(trackerBook) ? 0 : 1);
}

const cycles = parseCycles(cyclesBook, resolve);
const stats = parseStats(trackerBook, resolve);
const times = parseCraftingTimes(trackerBook, resolve);

if (unresolved.size) {
  console.error("Unresolvable droid names (add an alias to droids.seed.ts):");
  for (const u of unresolved) console.error("  -", u);
  process.exit(1);
}

// Sanity: every cycle should be complete and uniform.
if (process.argv.includes("--debug")) {
  for (const cycle of [1, 2, 3, 4]) {
    console.log(`cycle ${cycle} levels:`, cycles.filter((r) => r.cycle === cycle).map((r) => r.level).join(","));
  }
}
for (const cycle of [1, 2, 3, 4]) {
  const levels = cycles.filter((r) => r.cycle === cycle).map((r) => r.level);
  const dupes = levels.filter((l, i) => levels.indexOf(l) !== i);
  if (dupes.length) throw new Error(`cycle ${cycle}: duplicate levels ${dupes}`);
  if (Math.min(...levels) !== 1) throw new Error(`cycle ${cycle}: does not start at RB1`);
  if (levels.length !== Math.max(...levels)) {
    throw new Error(`cycle ${cycle}: gap in levels (${levels.length} rows, max ${Math.max(...levels)})`);
  }
}

const maxLevel = Math.max(...cycles.map((r) => r.level));
console.log(
  `cycles: ${cycles.length} rows (RB1-${maxLevel} x 4)\n` +
    `stats : ${Object.keys(stats).length} droids\n` +
    `times : ${Object.keys(times).length} droids`,
);

const outputs = [
  [`${ROOT}/src/data/rebirthCycles.seed.ts`, emitCycles(cycles, loadExistingCycleExtras())],
  [`${ROOT}/src/data/droidStats.json`, `${JSON.stringify(stats, null, 2)}\n`],
  [`${ROOT}/src/data/craftingTimes.seed.ts`, emitCraftingTimes(times)],
];

if (!write) {
  console.log("\n(dry run — pass --write to update the seeds)");
} else {
  for (const [path, content] of outputs) {
    writeFileSync(path, content);
    console.log("wrote", path.replace(`${ROOT}/`, ""));
  }
}
