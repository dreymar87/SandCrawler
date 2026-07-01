import { useAppStore } from "../../store/useAppStore";

const SECTIONS: { title: string; body: string }[] = [
  { title: "Home", body: "Your base at a glance — current rebirth, production, crystals, and what to chase next." },
  { title: "Droidex", body: "Tap a droid's tier cell to cycle it missing → owned → active. Active droids count toward rebirths." },
  { title: "Rebirths", body: "The 23-level plan for your current cycle, with what's closest to ready up top." },
  { title: "Shop", body: "Nova Crystal upgrades and the cosmetics catalogue, with what you can afford." },
  { title: "Profile", body: "Set your rebirth, super-rebirth count, credits, and chips. Backups live here too." },
];

/**
 * First-run intro. Shown once (persisted via ui.hasOnboarded), explains
 * the five sections, dismissible.
 */
export function OnboardingSheet() {
  const hasOnboarded = useAppStore((s) => s.ui.hasOnboarded);
  const dismiss = useAppStore((s) => s.dismissOnboarding);
  if (hasOnboarded) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismiss} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Welcome to SandCrawler"
        className="relative w-full max-w-[460px] card p-5 m-3 view-enter"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-holo mb-1">Welcome</div>
        <h2 className="font-display font-bold text-xl mb-1">SandCrawler</h2>
        <p className="text-[13px] text-muted mb-4">
          Your Droid Tycoon rebirth companion. Five tabs along the bottom:
        </p>
        <ul className="space-y-2.5 mb-5">
          {SECTIONS.map((s) => (
            <li key={s.title} className="flex gap-3">
              <span className="font-display font-bold text-holo text-[13px] w-16 shrink-0">{s.title}</span>
              <span className="text-[12.5px] text-muted leading-snug">{s.body}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary btn-block" onClick={dismiss}>
          Start tracking
        </button>
      </div>
    </div>
  );
}
