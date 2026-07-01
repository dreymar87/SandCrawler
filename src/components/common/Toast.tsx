import { useToast } from "../../lib/toast";

/** Renders the current global toast message. Mounted once in AppShell. */
export function Toast() {
  const t = useToast();
  return (
    <div className={`toast ${t ? "show" : ""}`} role="status" aria-live="polite">
      {t ? (
        <div className="bg-ok text-[#04241a] font-display font-semibold text-[13.5px] px-4 py-2.5 rounded-[10px] shadow-[0_8px_30px_rgba(0,0,0,.4)]">
          {t.message}
        </div>
      ) : null}
    </div>
  );
}
