import { useMemo, useState } from "react";
import { MAX_STANDARD_REBIRTH } from "../../constants";
import { NOVA_UPGRADES } from "../../data/novaShop.seed";
import { earnedForAvailable } from "../../lib/novaCrystals";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/useAppStore";
import { Stepper } from "../common/Stepper";
import { CreditsInput } from "../common/CreditsInput";
import type { NovaUpgradeState } from "../../types";

/**
 * The setup step of onboarding: collects where the player currently is
 * so the tracker is immediately useful. Everything is optional — Skip
 * leaves defaults untouched. Nova crystals is asked as an available
 * balance and back-computed into lifetime `earned`.
 */
export function SetupForm({ onDone }: { onDone: () => void }) {
  // Seed from current store values so re-running setup shows what's there.
  const store = useAppStore.getState();
  const [rb, setRb] = useState(store.profile.standardRebirth);
  const [srb, setSrb] = useState(store.profile.superRebirthCount);
  const [credits, setCredits] = useState(store.profile.currentCredits);
  const [novaAvail, setNovaAvail] = useState(0);
  const [chips, setChips] = useState(store.profile.upgradeChips ?? 0);
  const [novaLevels, setNovaLevels] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const u of store.novaUpgrades) m[u.id] = u.level;
    return m;
  });

  const groups = useMemo(
    () => ({
      CORE: NOVA_UPGRADES.filter((u) => u.tree === "CORE"),
      WORKSHOP: NOVA_UPGRADES.filter((u) => u.tree === "WORKSHOP"),
    }),
    [],
  );

  const save = () => {
    const s = useAppStore.getState();
    s.setStandardRebirth(rb);
    s.setSuperRebirthCount(srb);
    s.setCreditsCurrent(credits.trim());
    s.setUpgradeChips(chips === 0 ? undefined : chips);

    // Apply nova-shop levels, then back-compute earned so balance = novaAvail.
    const states: NovaUpgradeState[] = [];
    for (const [id, level] of Object.entries(novaLevels)) {
      s.setNovaUpgradeLevel(id, level);
      if (level > 0) states.push({ id, level });
    }
    const iconicOwned = useAppStore.getState().novaIconicOwned;
    s.setNovaEarned(earnedForAvailable(novaAvail, states, iconicOwned));

    haptic("medium");
    toast("Base set up — you're ready to go.");
    onDone();
  };

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-holo mb-1">
        Set up
      </div>
      <h2 className="font-display font-bold text-xl mb-1">Where are you now?</h2>
      <p className="text-[12.5px] text-muted mb-4">
        Enter your current progress so the tracker is useful right away. You can change any of this
        later on the Profile tab.
      </p>

      <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
        <Field label="Standard Rebirth">
          <Stepper value={rb} onChange={setRb} min={0} max={MAX_STANDARD_REBIRTH} size="md" />
        </Field>

        <Field label="Super Rebirths completed">
          <Stepper value={srb} onChange={setSrb} min={0} size="md" />
        </Field>

        <Field label="Current credits">
          <CreditsInput value={credits} onChange={setCredits} />
        </Field>

        <Field label="Nova crystals (available now)">
          <Stepper value={novaAvail} onChange={setNovaAvail} min={0} size="md" />
        </Field>

        <Field label="Upgrade chips">
          <Stepper value={chips} onChange={setChips} min={0} size="md" />
        </Field>

        <details className="rounded-[10px] border border-line overflow-hidden">
          <summary className="cursor-pointer select-none px-3 py-2.5 bg-panel-alt font-mono text-[10.5px] uppercase tracking-wider text-muted-alt list-none flex items-center gap-2">
            <span className="flex-1">Nova shop levels (optional)</span>
            <span className="text-holo">edit</span>
          </summary>
          <div className="px-3 py-3 space-y-4">
            {(["CORE", "WORKSHOP"] as const).map((tree) => (
              <div key={tree}>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-2">
                  {tree}
                </div>
                <div className="space-y-1.5">
                  {groups[tree].map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <span className="flex-1 text-[12.5px] truncate">{u.name}</span>
                      <Stepper
                        value={novaLevels[u.id] ?? 0}
                        onChange={(n) => setNovaLevels((prev) => ({ ...prev, [u.id]: n }))}
                        min={0}
                        max={u.costs.length}
                        ariaLabel={`${u.name} level`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      </div>

      <div className="flex gap-2.5 mt-5">
        <button type="button" className="btn btn-ghost flex-1" onClick={onDone}>
          Skip
        </button>
        <button type="button" className="btn btn-primary flex-1" onClick={save}>
          Save &amp; start
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="field-label">{label}</div>
      {children}
    </div>
  );
}
