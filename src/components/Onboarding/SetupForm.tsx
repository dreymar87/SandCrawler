import { useMemo, useState } from "react";
import { MAX_STANDARD_REBIRTH } from "../../constants";
import { COSMETICS } from "../../data/cosmetics.seed";
import { NOVA_UPGRADES, NOVA_ICONIC_PURCHASES } from "../../data/novaShop.seed";
import { earnedForAvailable } from "../../lib/novaCrystals";
import { haptic } from "../../lib/native";
import { toast } from "../../lib/toast";
import { useAppStore } from "../../store/useAppStore";
import { Stepper } from "../common/Stepper";
import { CreditsInput } from "../common/CreditsInput";
import type { CosmeticKind, NovaUpgradeState } from "../../types";

const COSMETIC_KINDS: readonly CosmeticKind[] = ["HAT", "PAINT", "EFFECT"];
const COSMETIC_KIND_LABEL: Record<CosmeticKind, string> = {
  HAT: "Hats",
  PAINT: "Paints",
  EFFECT: "Droid Effects",
};

/**
 * The setup step of onboarding: collects where the player currently is
 * so the tracker is immediately useful. Everything is optional — Skip
 * leaves defaults untouched. Nova crystals is asked as an available
 * balance and back-computed into lifetime `earned` (accounting for
 * shop levels + ICONIC droid purchases entered here).
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
  const [iconicOwned, setIconicOwned] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const name of store.novaIconicOwned) m[name.toUpperCase()] = true;
    return m;
  });
  const [cosmeticsOwned, setCosmeticsOwned] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {};
    for (const c of store.cosmetics) if (c.owned) m[c.id] = true;
    return m;
  });

  const novaGroups = useMemo(
    () => ({
      FEATURED: NOVA_UPGRADES.filter((u) => u.tree === "FEATURED"),
      CORE: NOVA_UPGRADES.filter((u) => u.tree === "CORE"),
      WORKSHOP: NOVA_UPGRADES.filter((u) => u.tree === "WORKSHOP"),
    }),
    [],
  );
  const cosmeticGroups = useMemo(() => {
    const g: Record<CosmeticKind, typeof COSMETICS[number][]> = { HAT: [], PAINT: [], EFFECT: [] };
    for (const c of COSMETICS) g[c.kind].push(c);
    return g;
  }, []);

  const save = () => {
    const s = useAppStore.getState();
    s.setStandardRebirth(rb);
    s.setSuperRebirthCount(srb);
    s.setCreditsCurrent(credits.trim());
    s.setUpgradeChips(chips === 0 ? undefined : chips);

    // Apply nova-shop levels.
    const states: NovaUpgradeState[] = [];
    for (const [id, level] of Object.entries(novaLevels)) {
      s.setNovaUpgradeLevel(id, level);
      if (level > 0) states.push({ id, level });
    }
    // Apply ICONIC droid purchases (these count toward crystals spent).
    const ownedIconic: string[] = [];
    for (const p of NOVA_ICONIC_PURCHASES) {
      const owned = !!iconicOwned[p.droid.toUpperCase()];
      s.setIconicPurchased(p.droid, owned);
      if (owned) ownedIconic.push(p.droid);
    }
    // Apply cosmetics owned.
    for (const c of COSMETICS) {
      if (cosmeticsOwned[c.id]) s.setCosmeticOwned(c.id, true);
    }

    // Back-compute earned so balance = novaAvail, accounting for shop
    // levels + ICONIC purchases (crystalsSpent includes both).
    s.setNovaEarned(earnedForAvailable(novaAvail, states, ownedIconic));

    haptic("medium");
    toast("Base set up — you're ready to go.");
    onDone();
  };

  const iconicCount = Object.values(iconicOwned).filter(Boolean).length;
  const cosmeticCount = Object.values(cosmeticsOwned).filter(Boolean).length;

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-holo mb-1">
        Set up
      </div>
      <h2 className="font-display font-bold text-xl mb-1">Where are you now?</h2>
      <p className="text-[12.5px] text-muted mb-4">
        Enter your current progress so the tracker is useful right away. You can change any of this
        later on the Profile and Shop tabs.
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

        {/* Nova shop upgrade levels */}
        <Section title="Nova shop levels">
          <div className="space-y-4">
            {(["FEATURED", "CORE", "WORKSHOP"] as const).map((tree) => (
              <div key={tree}>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-2">
                  {tree}
                </div>
                <div className="space-y-1.5">
                  {novaGroups[tree].map((u) => (
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
        </Section>

        {/* ICONIC droid purchases */}
        <Section title="ICONIC droids bought" count={iconicCount}>
          <div className="space-y-1">
            {NOVA_ICONIC_PURCHASES.map((p) => {
              const key = p.droid.toUpperCase();
              const owned = !!iconicOwned[key];
              return (
                <ToggleRow
                  key={p.droid}
                  label={p.droid}
                  hint={`${p.crystals} ◆`}
                  value={owned}
                  onChange={(v) => setIconicOwned((prev) => ({ ...prev, [key]: v }))}
                />
              );
            })}
          </div>
        </Section>

        {/* Cosmetics owned */}
        <Section title="Cosmetics owned" count={cosmeticCount}>
          <div className="space-y-4">
            {COSMETIC_KINDS.map((kind) => (
              <div key={kind}>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-alt mb-2">
                  {COSMETIC_KIND_LABEL[kind]}
                </div>
                <div className="space-y-1">
                  {cosmeticGroups[kind].map((c) => (
                    <ToggleRow
                      key={c.id}
                      label={c.name}
                      hint={c.requirement}
                      value={!!cosmeticsOwned[c.id]}
                      onChange={(v) => setCosmeticsOwned((prev) => ({ ...prev, [c.id]: v }))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
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

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-[10px] border border-line overflow-hidden">
      <summary className="cursor-pointer select-none px-3 py-2.5 bg-panel-alt font-mono text-[10.5px] uppercase tracking-wider text-muted-alt list-none flex items-center gap-2">
        <span className="flex-1">
          {title} (optional)
          {count ? <span className="text-holo ml-1">· {count}</span> : null}
        </span>
        <span className="text-holo">edit</span>
      </summary>
      <div className="px-3 py-3">{children}</div>
    </details>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md border text-left transition ${
        value ? "border-ok/40 bg-ok/5" : "border-line bg-panel-alt hover:border-line-alt"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] truncate">{label}</div>
        {hint ? <div className="font-mono text-[9.5px] text-muted-alt truncate">{hint}</div> : null}
      </div>
      <span
        className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
          value ? "bg-ok/70" : "bg-line-alt"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            value ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}
