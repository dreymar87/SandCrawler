import { useAppStore } from "./store/useAppStore";
import { AppShell } from "./components/Layout/AppShell";
import { TabBar } from "./components/Layout/TabBar";
import { CollectionPanel } from "./components/Collection/CollectionPanel";
import { StandardRebirthList } from "./components/Rebirth/StandardRebirthList";
import { SuperRebirthList } from "./components/Rebirth/SuperRebirthList";
import { NextUnlockPanel } from "./components/NextUnlock/NextUnlockPanel";
import { DataPanel } from "./components/Data/DataPanel";

export function App() {
  const tab = useAppStore((s) => s.ui.activeTab);
  return (
    <AppShell>
      <TabBar />
      {tab === "collection" ? <CollectionPanel /> : null}
      {tab === "standard" ? <StandardRebirthList /> : null}
      {tab === "super" ? <SuperRebirthList /> : null}
      {tab === "next-unlock" ? <NextUnlockPanel /> : null}
      {tab === "data" ? <DataPanel /> : null}
    </AppShell>
  );
}
