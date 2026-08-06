import type { ReactNode } from "react";
import { useAppStore } from "../../store/useAppStore";

/**
 * A card that collapses, so the Strategy tab isn't five long sections deep
 * before you can see anything.
 *
 * Uses the same `<details>` + `group-open` treatment as
 * `Base/ActiveBonuses.tsx` — native disclosure semantics, keyboard and screen
 * reader support for free, no state machine.
 *
 * Open/closed persists per section, because which detail a player cares about
 * is a stable preference and re-opening it every visit is the annoyance this
 * component exists to remove.
 */
export function CollapsibleSection({
  id,
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  /** Stable key for remembering the open state. */
  id: string;
  title: string;
  /** Optional right-aligned note in the header. */
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const openMap = useAppStore((s) => s.ui.openStrategySections);
  const setUiPref = useAppStore((s) => s.setUiPref);
  const open = openMap?.[id] ?? defaultOpen;

  return (
    <section className="card p-0 mb-4">
      <details
        className="group"
        open={open}
        onToggle={(e) => {
          const next = (e.currentTarget as HTMLDetailsElement).open;
          if (next === open) return; // React re-render echo, not a user action
          setUiPref("openStrategySections", { ...(openMap ?? {}), [id]: next });
        }}
      >
        <summary className="cursor-pointer select-none px-4 py-3 flex items-baseline gap-2 list-none">
          <span className="font-display font-bold text-base">{title}</span>
          {hint ? <span className="font-mono text-[10px] text-muted-alt">{hint}</span> : null}
          <span className="flex-1" />
          <span className="font-mono text-[10.5px] text-holo group-open:hidden">show</span>
          <span className="font-mono text-[10.5px] text-holo hidden group-open:inline">hide</span>
        </summary>
        <div className="px-4 pb-4">{children}</div>
      </details>
    </section>
  );
}
