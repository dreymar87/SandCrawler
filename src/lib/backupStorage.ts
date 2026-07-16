/**
 * Save/export a backup to somewhere the user can actually retrieve it.
 *
 * On native (Capacitor Android/iOS) we write the JSON to the app's cache
 * dir and open the OS **share sheet** (`@capacitor/share`), so the user
 * can send it to Google Drive / email / the Files app of their choice.
 * This needs NO storage permission and avoids the Android 11+
 * `Android/data` folder that file managers can't browse.
 *
 * On web we fall back to the anchor-download flow in `exportImport.ts`
 * — files land in the browser's Downloads folder.
 */
import { Capacitor } from "@capacitor/core";
import { downloadJson } from "./exportImport";

export interface SaveResult {
  /** Human-readable outcome shown in the UI. */
  location: string;
  /** "native" when the share sheet ran; "web" when the browser download ran. */
  target: "native" | "web";
  /** True when the native share sheet was invoked (vs a silent file write). */
  shared?: boolean;
  /** True when the user dismissed the share sheet — treat as a no-op. */
  cancelled?: boolean;
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

/** Heuristic: did the native Share reject because the user dismissed it? */
function isShareCancel(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /cancel|dismiss|abort/i.test(msg);
}

/**
 * Save/export the given JSON `contents` under `filename`. Route depends
 * on platform. `filename` should end in `.json`.
 */
export async function saveBackup(
  contents: string,
  filename: string = defaultBackupFilename(),
): Promise<SaveResult> {
  if (Capacitor.isNativePlatform()) {
    // Dynamic imports keep the plugins out of the web bundle.
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    // Write to the cache dir (covered by the app's FileProvider
    // cache-path), then share its URI. Cache needs no permission and the
    // OS clears it later — the user's copy lives wherever they send it.
    const written = await Filesystem.writeFile({
      path: filename,
      directory: Directory.Cache,
      data: contents,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({
        title: "SandCrawler backup",
        text: "SandCrawler data backup",
        url: written.uri,
        dialogTitle: "Save or send your backup",
      });
    } catch (err) {
      if (isShareCancel(err)) return { location: "", target: "native", cancelled: true };
      throw err;
    }
    return { location: "the share sheet", target: "native", shared: true };
  }
  // Web path.
  downloadJson(filename, contents);
  return { location: `Downloads/${filename}`, target: "web" };
}
