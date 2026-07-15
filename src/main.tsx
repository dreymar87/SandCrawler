import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initNative, setHapticsEnabled } from "./lib/native";
import { useAppStore } from "./store/useAppStore";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Native shell: status bar, splash, and Android back-button → tab nav.
void initNative({
  onBack: () => {
    const { ui, setActiveTab } = useAppStore.getState();
    // Android back from any sub-tab returns to Base; from Base it exits.
    if (ui.activeTab !== "base") {
      setActiveTab("base");
      return true; // consumed
    }
    return false; // let Capacitor exit the app
  },
});

// Sync the haptic-feedback preference into the native helper. Default
// on until the user explicitly opts out (undefined → true).
setHapticsEnabled(useAppStore.getState().ui.hapticsEnabled !== false);
useAppStore.subscribe((s) => setHapticsEnabled(s.ui.hapticsEnabled !== false));
