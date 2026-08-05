import { TAB_LABELS } from "./constants";
import { useAppStore } from "./store/useAppStore";
import { AppShell } from "./components/Layout/AppShell";
import { BasePanel } from "./components/Base/BasePanel";
import { DroidexGrid } from "./components/Droidex/DroidexGrid";
import { StandardRebirthList } from "./components/Rebirth/StandardRebirthList";
import { StrategyPanel } from "./components/Strategy/StrategyPanel";
import { ShopPanel } from "./components/Shop/ShopPanel";
import { ProfilePanel } from "./components/Profile/ProfilePanel";

export function App() {
  const tab = useAppStore((s) => s.ui.activeTab);
  // Defensive: an unknown/legacy tab key (e.g. stale "home") falls back to Base.
  const known =
    tab === "droidex" ||
    tab === "rebirths" ||
    tab === "strategy" ||
    tab === "shop" ||
    tab === "profile";
  return (
    <AppShell title={TAB_LABELS[known ? tab : "base"]}>
      {tab === "droidex" ? <DroidexGrid /> : null}
      {tab === "rebirths" ? <StandardRebirthList /> : null}
      {tab === "strategy" ? <StrategyPanel /> : null}
      {tab === "shop" ? <ShopPanel /> : null}
      {tab === "profile" ? <ProfilePanel /> : null}
      {!known ? <BasePanel /> : null}
    </AppShell>
  );
}
