import { TAB_LABELS } from "./constants";
import { useAppStore } from "./store/useAppStore";
import { AppShell } from "./components/Layout/AppShell";
import { HomePanel } from "./components/Home/HomePanel";
import { DroidexGrid } from "./components/Droidex/DroidexGrid";
import { StandardRebirthList } from "./components/Rebirth/StandardRebirthList";
import { ShopPanel } from "./components/Shop/ShopPanel";
import { ProfilePanel } from "./components/Profile/ProfilePanel";

export function App() {
  const tab = useAppStore((s) => s.ui.activeTab);
  return (
    <AppShell title={TAB_LABELS[tab]}>
      {tab === "home" ? <HomePanel /> : null}
      {tab === "droidex" ? <DroidexGrid /> : null}
      {tab === "rebirths" ? <StandardRebirthList /> : null}
      {tab === "shop" ? <ShopPanel /> : null}
      {tab === "profile" ? <ProfilePanel /> : null}
    </AppShell>
  );
}
