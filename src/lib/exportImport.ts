import { SCHEMA_VERSION } from "../data/version";
import type { ExportEnvelope, PersistedState } from "../types";
import { migrate } from "./migrate";

export function buildExportEnvelope(state: PersistedState): ExportEnvelope {
  return {
    app: "sandcrawler",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    payload: state,
  };
}

export function exportToString(state: PersistedState): string {
  return JSON.stringify(buildExportEnvelope(state), null, 2);
}

export class ImportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
  }
}

/**
 * Parse a JSON string into a PersistedState, running migrations as needed.
 * Throws `ImportError` with a human-readable message on failure so the UI can
 * surface it directly.
 */
export function importFromString(raw: string): PersistedState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new ImportError("Backup code isn't valid JSON.", cause);
  }
  try {
    return migrate(parsed);
  } catch (cause) {
    throw new ImportError("Backup code couldn't be read.", cause);
  }
}

/** Browser download helper — used by the Data tab's "Save backup file" button. */
export function downloadJson(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
