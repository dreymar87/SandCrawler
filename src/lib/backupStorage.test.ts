import { describe, expect, it, vi, beforeEach } from "vitest";

// Spies must be hoisted so the vi.mock factories can close over them
// (vi.mock itself is hoisted above all imports).
const { writeFile, share, downloadJson } = vi.hoisted(() => ({
  writeFile: vi.fn(async () => ({ uri: "file:///cache/backup.json" })),
  share: vi.fn(async () => ({})),
  downloadJson: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile },
  Directory: { Cache: "CACHE", External: "EXTERNAL" },
  Encoding: { UTF8: "utf8" },
}));
vi.mock("@capacitor/share", () => ({ Share: { share } }));
vi.mock("./exportImport", () => ({ downloadJson }));

import { Capacitor } from "@capacitor/core";
import { defaultBackupFilename, saveBackup, timestampSlug } from "./backupStorage";

describe("timestampSlug", () => {
  it("produces a filesystem-safe YYYY-MM-DD-HHMM slug", () => {
    // Using a fixed Date to keep the test hermetic — timestampSlug uses
    // local time components so we assert the values from getMonth etc.
    const d = new Date(2026, 6, 15, 23, 17); // 2026-07-15 23:17 local
    expect(timestampSlug(d)).toBe("2026-07-15-2317");
  });

  it("zero-pads single-digit components", () => {
    const d = new Date(2026, 0, 5, 4, 9); // 2026-01-05 04:09
    expect(timestampSlug(d)).toBe("2026-01-05-0409");
  });
});

describe("defaultBackupFilename", () => {
  it("returns sandcrawler-backup-<slug>.json", () => {
    const d = new Date(2026, 6, 15, 23, 17);
    expect(defaultBackupFilename(d)).toBe("sandcrawler-backup-2026-07-15-2317.json");
  });
});

describe("saveBackup", () => {
  beforeEach(() => {
    writeFile.mockClear();
    downloadJson.mockClear();
  });

  it("web path: calls downloadJson and reports the Downloads location", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValueOnce(false);
    const r = await saveBackup("{\"hello\":1}", "sandcrawler-backup-test.json");
    expect(downloadJson).toHaveBeenCalledWith(
      "sandcrawler-backup-test.json",
      "{\"hello\":1}",
    );
    expect(writeFile).not.toHaveBeenCalled();
    expect(r).toEqual({
      location: "Downloads/sandcrawler-backup-test.json",
      target: "web",
    });
  });

  it("native path: writes to cache then opens the share sheet", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValueOnce(true);
    const r = await saveBackup("{}", "sandcrawler-backup-test.json");
    expect(writeFile).toHaveBeenCalledWith({
      path: "sandcrawler-backup-test.json",
      directory: "CACHE",
      data: "{}",
      encoding: "utf8",
    });
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: "file:///cache/backup.json" }),
    );
    expect(downloadJson).not.toHaveBeenCalled();
    expect(r).toEqual({ location: "the share sheet", target: "native", shared: true });
  });

  it("native path: a dismissed share sheet reports cancelled (no error)", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValueOnce(true);
    share.mockRejectedValueOnce(new Error("Share canceled"));
    const r = await saveBackup("{}", "sandcrawler-backup-test.json");
    expect(r).toMatchObject({ cancelled: true, target: "native" });
  });
});
