import { useAppStore } from "./store/useAppStore";
import { AppShell } from "./components/Layout/AppShell";
import { TabBar } from "./components/Layout/TabBar";
import { DroidexGrid } from "./components/Droidex/DroidexGrid";
import { ProfilePanel } from "./components/Profile/ProfilePanel";
import { StandardRebirthList } from "./components/Rebirth/StandardRebirthList";
import { SuperRebirthList } from "./components/Rebirth/SuperRebirthList";
import { NextUnlockPanel } from "./components/NextUnlock/NextUnlockPanel";
import { DataPanel } from "./components/Data/DataPanel";

export function App() {
  const tab = useAppStore((s) => s.ui.activeTab);
  return (
    <AppShell>
      <TabBar />
      {tab === "droidex" ? <DroidexGrid /> : null}
      {tab === "profile" ? <ProfilePanel /> : null}
      {tab === "standard" ? <StandardRebirthList /> : null}
      {tab === "super" ? <SuperRebirthList /> : null}
      {tab === "next-unlock" ? <NextUnlockPanel /> : null}
      {tab === "data" ? <DataPanel /> : null}
    </AppShell>
  );
}
