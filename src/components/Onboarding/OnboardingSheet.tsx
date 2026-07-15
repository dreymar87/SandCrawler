import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { SetupForm } from "./SetupForm";

const SECTIONS: { title: string; body: string }[] = [
  { title: "Home", body: "Your base at a glance — current rebirth, production, crystals, and what to chase next." },
  { title: "Droidex", body: "Tap a droid's tier cell to set owned / working / lounge counts. Working droids mine credits; both count toward rebirths." },
  { title: "Rebirths", body: "The 27-level plan for your cycle, a keep/upgrade/sell strategy, and what's closest to ready up top." },
  { title: "Shop", body: "Nova Crystal upgrades and the cosmetics catalogue, with what you can afford." },
  { title: "Profile", body: "Set your rebirth, super-rebirth count, credits, and chips. Preferences and backups live here too." },
];

/**
 * First-run onboarding. Two steps sharing one modal shell:
 *   intro  — explains the five tabs (genuine first launch)
 *   setup  — collects current RB / SRB / credits / nova / chips
 *
 * Shown while `ui.hasOnboarded` is falsy. `ui.pendingSetup` (set by a
 * data reset) opens straight on the setup step.
 */
export function OnboardingSheet() {
  const hasOnboarded = useAppStore((s) => s.ui.hasOnboarded);
  const pendingSetup = useAppStore((s) => s.ui.pendingSetup);
  const dismiss = useAppStore((s) => s.dismissOnboarding);
  const [step, setStep] = useState<"intro" | "setup">(pendingSetup ? "setup" : "intro");

  if (hasOnboarded) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={step === "intro" ? dismiss : undefined}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={step === "intro" ? "Welcome to SandCrawler" : "Set up your base"}
        className="relative w-full max-w-[460px] card p-5 m-3 view-enter"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        {step === "intro" ? (
          <>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-holo mb-1">
              Welcome
            </div>
            <h2 className="font-display font-bold text-xl mb-1">SandCrawler</h2>
            <p className="text-[13px] text-muted mb-4">
              Your Droid Tycoon rebirth companion. Five tabs along the bottom:
            </p>
            <ul className="space-y-2.5 mb-5">
              {SECTIONS.map((s) => (
                <li key={s.title} className="flex gap-3">
                  <span className="font-display font-bold text-holo text-[13px] w-16 shrink-0">
                    {s.title}
                  </span>
                  <span className="text-[12.5px] text-muted leading-snug">{s.body}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => setStep("setup")}
            >
              Set up my base →
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block mt-2"
              onClick={dismiss}
            >
              Skip for now
            </button>
          </>
        ) : (
          <SetupForm onDone={dismiss} />
        )}
      </div>
    </div>
  );
}
