import { TAB_LABELS, TAB_ORDER } from "../../constants";
import { useAppStore } from "../../store/useAppStore";

export function TabBar() {
  const active = useAppStore((s) => s.ui.activeTab);
  const setTab = useAppStore((s) => s.setActiveTab);
  return (
    <nav
      className="flex gap-1.5 bg-panel border border-line rounded-xl p-1.5 mb-4 overflow-x-auto"
      aria-label="Sections"
    >
      {TAB_ORDER.map((t) => {
        const isActive = t === active;
        return (
          <button
            key={t}
            type="button"
            className={`flex-1 min-w-[5.5rem] font-display font-semibold text-[12.5px] py-2.5 px-2 rounded-lg transition whitespace-nowrap ${
              isActive ? "bg-holo text-[#04222B]" : "text-muted hover:text-ink"
            }`}
            onClick={() => setTab(t)}
            aria-pressed={isActive}
          >
            {TAB_LABELS[t]}
          </button>
        );
      })}
    </nav>
  );
}
