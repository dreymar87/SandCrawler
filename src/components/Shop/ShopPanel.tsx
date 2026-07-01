import { useState } from "react";
import { haptic } from "../../lib/native";
import { CosmeticsPanel } from "../Cosmetics/CosmeticsPanel";
import { NovaShopPanel } from "../Nova/NovaShopPanel";

type SubTab = "nova" | "cosmetics";

/**
 * Shop groups the two crystal/collection sinks — the Nova Crystals shop
 * and the cosmetics catalogue — behind a segmented sub-tab.
 */
export function ShopPanel() {
  const [sub, setSub] = useState<SubTab>("nova");

  return (
    <div>
      <div
        className="grid grid-cols-2 gap-1.5 bg-panel border border-line rounded-xl p-1.5 mb-4"
        role="tablist"
        aria-label="Shop sections"
      >
        {(["nova", "cosmetics"] as SubTab[]).map((key) => {
          const isActive = sub === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`font-display font-semibold text-[13px] py-2 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-holo/60 ${
                isActive ? "bg-holo text-[#04222B]" : "text-muted hover:text-ink"
              }`}
              onClick={() => {
                if (!isActive) haptic("light");
                setSub(key);
              }}
            >
              {key === "nova" ? "Nova Shop" : "Cosmetics"}
            </button>
          );
        })}
      </div>

      {sub === "nova" ? <NovaShopPanel /> : <CosmeticsPanel />}
    </div>
  );
}
