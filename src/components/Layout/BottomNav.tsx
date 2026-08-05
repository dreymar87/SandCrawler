import { TAB_LABELS, TAB_ORDER } from "../../constants";
import { haptic } from "../../lib/native";
import { useAppStore } from "../../store/useAppStore";
import { TAB_ICONS } from "./tabIcons";

/**
 * Fixed bottom navigation — the standard mobile-app pattern. Six
 * icon+label destinations, safe-area aware, ≥44px tap targets.
 */
export function BottomNav() {
  const active = useAppStore((s) => s.ui.activeTab);
  const setTab = useAppStore((s) => s.setActiveTab);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="max-w-[760px] mx-auto grid grid-cols-6">
        {TAB_ORDER.map((t) => {
          const Icon = TAB_ICONS[t];
          const isActive = t === active;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                if (!isActive) haptic("light");
                setTab(t);
              }}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-h-[56px] pt-2 pb-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo/60 focus-visible:ring-inset ${
                isActive ? "text-holo" : "text-muted hover:text-ink"
              }`}
            >
              <Icon className={isActive ? "drop-shadow-[0_0_6px_rgba(70,199,224,0.5)]" : ""} />
              <span className="font-mono text-[9.5px] tracking-wide uppercase">{TAB_LABELS[t]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
