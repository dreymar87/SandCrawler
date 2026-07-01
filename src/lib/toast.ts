import { useSyncExternalStore } from "react";

/**
 * Dead-simple global toast. Not part of the persisted Zustand store — it's
 * ephemeral UI. `toast("Copied")` shows a message for ~1.9s.
 */
let current: { id: number; message: string } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
let seq = 0;

function emit() {
  for (const l of listeners) l();
}

export function toast(message: string): void {
  seq += 1;
  current = { id: seq, message };
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, 1900);
}

export function useToast(): { id: number; message: string } | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}
