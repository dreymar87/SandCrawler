import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

/**
 * App shell: a compact sticky header, a scrollable content area padded
 * clear of the fixed bottom nav, and the nav itself. Safe-area insets
 * keep it clear of notches and gesture bars on native / installed PWA.
 */
export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-full">
      <header
        className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-[760px] mx-auto px-4 h-14 flex items-center gap-2.5">
          <span className="w-[7px] h-[7px] rounded-full bg-ok shadow-[0_0_8px_#56D08A] animate-holo-pulse" />
          <span className="font-display font-bold text-[17px] tracking-wide">SandCrawler</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-alt mt-0.5">
            {title}
          </span>
        </div>
      </header>

      <main
        className="max-w-[760px] mx-auto px-4 pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
      >
        {children}

        <footer className="mt-8 text-center font-mono text-[10px] tracking-wider text-muted-alt">
          // Fan-made companion · Unaffiliated with Lucasfilm, Epic Games, FOAD or Blzn Studios
        </footer>
      </main>

      <BottomNav />
    </div>
  );
}
