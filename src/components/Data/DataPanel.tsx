import { useRef, useState, type ChangeEvent } from "react";
import { SCHEMA_VERSION } from "../../data/version";
import {
  exportToString,
  importFromString,
  ImportError,
} from "../../lib/exportImport";
import { saveBackup, defaultBackupFilename } from "../../lib/backupStorage";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/useAppStore";
import type { PersistedState } from "../../types";

export function DataPanel() {
  const [mode, setMode] = useState<null | "backup" | "restore">(null);
  const [restoreText, setRestoreText] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceAll = useAppStore((s) => s.replaceAll);
  const resetAll = useAppStore((s) => s.resetAll);

  const snapshot = (): PersistedState => {
    const s = useAppStore.getState();
    return {
      schemaVersion: SCHEMA_VERSION,
      cards: s.cards,
      profile: s.profile,
      customDroids: s.customDroids,
      standardOverrides: s.standardOverrides,
      cosmetics: s.cosmetics,
      novaUpgrades: s.novaUpgrades,
      novaIconicOwned: s.novaIconicOwned,
      iconicMerchantBought: s.iconicMerchantBought,
      craftingStations: s.craftingStations,
      statOverrides: s.statOverrides,
      ui: s.ui,
    };
  };

  const showMessage = (kind: "ok" | "err", text: string) => {
    setMessage({ kind, text });
    if (kind === "ok") {
      haptic("light");
      toast(text);
    }
    window.setTimeout(() => setMessage(null), 4000);
  };

  const copyBackup = async () => {
    const text = exportToString(snapshot());
    try {
      await navigator.clipboard.writeText(text);
      showMessage("ok", "Copied to clipboard.");
    } catch {
      showMessage("err", "Couldn't copy — select & copy from the box.");
    }
  };

  const downloadBackup = async () => {
    const text = exportToString(snapshot());
    try {
      const result = await saveBackup(text, defaultBackupFilename());
      if (result.cancelled) return; // user dismissed the share sheet — no toast
      if (result.shared) showMessage("ok", "Backup ready — pick where to save it.");
      else showMessage("ok", `Saved to ${result.location}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "unknown error";
      showMessage("err", `Couldn't save file (${detail}). Use Copy code instead.`);
      console.error(err);
    }
  };

  const pickRestoreFile = () => fileInputRef.current?.click();

  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so choosing the same file again re-fires onChange.
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setRestoreText(text);
      showMessage("ok", `Loaded ${file.name} — review then tap Load.`);
    } catch {
      showMessage("err", "Couldn't read that file.");
    }
  };

  const doRestore = () => {
    if (!restoreText.trim()) {
      showMessage("err", "Paste a backup code first.");
      return;
    }
    try {
      const state = importFromString(restoreText);
      replaceAll({ ...state, schemaVersion: SCHEMA_VERSION });
      showMessage("ok", "Restored from backup.");
      setMode(null);
      setRestoreText("");
    } catch (err) {
      if (err instanceof ImportError) {
        showMessage("err", err.message);
      } else {
        showMessage("err", "Couldn't read that backup.");
      }
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        <button className="btn btn-ghost btn-sm" onClick={() => setMode("backup")}>
          Back up data
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setMode("restore")}>
          Restore data
        </button>
      </div>

      {message ? (
        <p
          className={`font-mono text-[11.5px] mb-3 ${
            message.kind === "ok" ? "text-ok" : "text-warn"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {mode === "backup" ? (
        <section className="card p-4 mb-4">
          <h2 className="font-display font-semibold text-base mb-3">Back up everything</h2>
          <p className="text-[13px] text-muted mb-3">
            Export your full plan and droid list — send it to Drive, email, or Files via the share
            sheet, or copy it as text. Restore on any device.
          </p>
          <div className="flex gap-2.5 mb-3">
            <button className="btn btn-primary flex-1" onClick={downloadBackup}>
              Export / share
            </button>
            <button className="btn btn-ghost" onClick={copyBackup}>
              Copy code
            </button>
          </div>
          <details className="mt-2">
            <summary className="font-mono text-[11px] text-muted-alt uppercase tracking-wider cursor-pointer">
              Show raw JSON
            </summary>
            <textarea
              className="textarea mt-2"
              rows={4}
              readOnly
              value={exportToString(snapshot())}
              onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}
            />
          </details>
          <div className="flex justify-end mt-3">
            <button className="btn btn-ghost" onClick={() => setMode(null)}>
              Close
            </button>
          </div>
        </section>
      ) : null}

      {mode === "restore" ? (
        <section className="card p-4 mb-4">
          <h2 className="font-display font-semibold text-base mb-3">Restore from a backup</h2>
          <p className="text-[13px] text-muted mb-3">
            Load a backup file, or paste a backup code. This replaces everything currently in the
            tracker. Backups from the older prototype are also accepted.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onFileChosen}
          />
          <div className="flex gap-2.5 mb-3">
            <button className="btn btn-primary flex-1" onClick={pickRestoreFile}>
              Choose file…
            </button>
            <button
              className="btn btn-ghost flex-1"
              onClick={doRestore}
              disabled={!restoreText.trim()}
            >
              Load
            </button>
          </div>
          <textarea
            className="textarea"
            rows={4}
            placeholder="…or paste a backup code here"
            value={restoreText}
            onChange={(e) => setRestoreText(e.target.value)}
          />
          <div className="flex justify-end mt-3">
            <button className="btn btn-ghost" onClick={() => setMode(null)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <section className="card p-4 mb-4 border-danger/30">
        <h2 className="font-display font-semibold text-base mb-2 text-danger">Reset everything</h2>
        <p className="text-[13px] text-muted mb-3">
          Wipes your roster, custom droids, and Super Rebirth entries. The seed example is restored.
          This can't be undone — back up first.
        </p>
        <button
          className="btn btn-ghost border-danger/40 text-danger hover:bg-danger/10"
          onClick={() => {
            if (confirm("Reset everything to defaults? This can't be undone.")) {
              resetAll();
              showMessage("ok", "Reset to defaults.");
            }
          }}
        >
          Reset tracker
        </button>
      </section>
    </div>
  );
}
