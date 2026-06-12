import type { DroidClass } from "../../types";

const LABEL: Record<DroidClass, string> = {
  WORKER: "Worker",
  ASTROMECH: "Astromech",
  BATTLE: "Battle",
  UNKNOWN: "Unknown",
};

export function ClassPill({ kind, className = "" }: { kind: DroidClass; className?: string }) {
  return <span className={`class-pill ${className}`}>{LABEL[kind]}</span>;
}
