import { useState } from "react";
import { SCHEMA_VERSION } from "../../data/version";
import {
  downloadJson,
  exportToString,
  importFromString,
  ImportError,
} from "../../lib/exportImport";
import { useAppStore } from "../../store/useAppStore";
import type { PersistedState } from "../../types";

export function DataPanel() {
  const [mode, setMode] = useState<null | "backup" | "restore">(null);
  const [restoreText, setRestoreText] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const replaceAll = useAppStore((s) => s.replaceAll);
  const resetAll = useAppStore((s) => s.resetAll);

  const snapshot = (): PersistedState => {
    const s = useAppStore.getState();
    return {
      schemaVersion: SCHEMA_VERSION,
      cards: s.cards,
      profile: s.profile,
      customDroids: s.customDroids,
      superRebirths: s.superRebirths,
      standardOverrides: s.standardOverrides,
      ui: s.ui,
    };
  };

  const showMessage = (kind: "ok" | "err", text: string) => {
    setMessage({ kind, text });
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

  const downloadBackup = () => {
    const text = exportToString(snapshot());
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(`sandcrawler-${stamp}.json`, text);
    showMessage("ok", "Backup file saved.");
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
            Copy this code or save it to a file. It contains your full plan and droid list. Restore
            it on any device.
          </p>
          <textarea
            className="textarea"
            rows={4}
            readOnly
            value={exportToString(snapshot())}
            onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}
          />
          <div className="flex gap-2.5 mt-3">
            <button className="btn btn-ghost" onClick={() => setMode(null)}>
              Close
            </button>
            <button className="btn btn-ghost" onClick={downloadBackup}>
              Save file
            </button>
            <button className="btn btn-primary flex-1" onClick={copyBackup}>
              Copy code
            </button>
          </div>
        </section>
      ) : null}

      {mode === "restore" ? (
        <section className="card p-4 mb-4">
          <h2 className="font-display font-semibold text-base mb-3">Restore from a backup</h2>
          <p className="text-[13px] text-muted mb-3">
            Paste a backup code and tap Load. This replaces everything currently in the tracker.
            Backups from the older prototype are also accepted.
          </p>
          <textarea
            className="textarea"
            rows={4}
            placeholder="Paste your backup code here…"
            value={restoreText}
            onChange={(e) => setRestoreText(e.target.value)}
          />
          <div className="flex gap-2.5 mt-3">
            <button className="btn btn-ghost flex-1" onClick={() => setMode(null)}>
              Cancel
            </button>
            <button className="btn btn-primary flex-1" onClick={doRestore}>
              Load
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
