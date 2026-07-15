/**
 * Save/load backups to a real place the user can find later.
 *
 * On native (Capacitor Android/iOS) we use `@capacitor/filesystem`
 * writeFile to `Directory.Documents/SandCrawler/backup-<ts>.json`.
 * On web we fall back to the anchor-download flow in
 * `exportImport.ts` — files land in the browser's Downloads folder.
 *
 * The result carries a human-readable `location` so the UI can show
 * where the file actually landed ("Downloads/…", "Documents/SandCrawler/…").
 */
import { Capacitor } from "@capacitor/core";
import { downloadJson } from "./exportImport";

export interface SaveResult {
  /** Human-readable path shown in the UI ("Documents/SandCrawler/backup-…"). */
  location: string;
  /** "native" when written via Filesystem; "web" when the browser download ran. */
  target: "native" | "web";
}

/**
 * `2026-07-15-2317` — filename-safe timestamp (no colons, no timezone).
 * Uses local time so the user sees a familiar wall-clock label. Not
 * relied on for uniqueness beyond minute granularity, which is fine —
 * users don't back up more than once a minute.
 */
export function timestampSlug(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`
  );
}

export function defaultBackupFilename(now?: Date): string {
  return `sandcrawler-backup-${timestampSlug(now)}.json`;
}

/**
 * Save the given JSON `contents` under `filename`. Route depends on
 * platform. `filename` should end in `.json`.
 */
export async function saveBackup(
  contents: string,
  filename: string = defaultBackupFilename(),
): Promise<SaveResult> {
  if (Capacitor.isNativePlatform()) {
    // Dynamic import so the web bundle isn't forced to include the
    // Filesystem plugin (it's tree-shakeable in most bundlers, but the
    // dynamic import guarantees native-only cost).
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const path = `SandCrawler/${filename}`;
    // Directory.External = the app's own external files dir
    // (Android/data/<pkg>/files). Needs NO storage permission on any
    // Android version, unlike Directory.Documents (which requires the
    // shared-storage permission and silently fails without it).
    await Filesystem.writeFile({
      path,
      directory: Directory.External,
      data: contents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    return { location: `App files / ${path}`, target: "native" };
  }
  // Web path.
  downloadJson(filename, contents);
  return { location: `Downloads/${filename}`, target: "web" };
}
