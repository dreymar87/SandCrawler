import { useState } from "react";
import { TIERS } from "../../constants";
import { useDroidDict } from "../../hooks/useDroidDict";
import { useAppStore } from "../../store/useAppStore";
import type { DroidDef, Tier } from "../../types";
import { Autocomplete } from "./Autocomplete";

interface Props {
  onClose: () => void;
}

export function AddDroidDialog({ onClose }: Props) {
  const { index } = useDroidDict();
  const addOrUpdateDroid = useAppStore((s) => s.addOrUpdateDroid);
  const addCustomDroid = useAppStore((s) => s.addCustomDroid);

  const [name, setName] = useState("");
  const [tier, setTier] = useState<Tier>("DEFAULT");
  const [active, setActive] = useState(true);
  const [resolved, setResolved] = useState<DroidDef | null>(null);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const def = resolved ?? index.resolve(trimmed);

    if (!def) {
      addCustomDroid({ canonical: trimmed, class: "UNKNOWN" });
    }
    const canonical = def?.canonical ?? trimmed;
    addOrUpdateDroid({ droidId: canonical, owned: true, active, tier });
    onClose();
  };

  return (
    <div className="rounded-2xl border border-holo-dim bg-panel p-4 mb-5">
      <h2 className="font-display font-semibold text-base mb-3.5">Add droid</h2>

      <div className="mb-3.5">
        <label className="field-label" htmlFor="d-name">
          Droid name
        </label>
        <Autocomplete
          id="d-name"
          value={name}
          onChange={(raw, def) => {
            setName(raw);
            setResolved(def);
          }}
        />
      </div>

      <div className="mb-3.5">
        <label className="field-label" htmlFor="d-tier">
          Tier
        </label>
        <select
          id="d-tier"
          className="select"
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3.5">
        <span className="field-label">Status</span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            className={`font-display font-semibold text-[13px] px-3 py-2.5 rounded-[9px] border ${
              active
                ? "border-holo text-holo bg-holo/10"
                : "border-line-alt text-muted"
            }`}
            onClick={() => setActive(true)}
          >
            Active (Working / Lounge)
          </button>
          <button
            type="button"
            className={`font-display font-semibold text-[13px] px-3 py-2.5 rounded-[9px] border ${
              !active ? "border-holo text-holo bg-holo/10" : "border-line-alt text-muted"
            }`}
            onClick={() => setActive(false)}
          >
            Stored (doesn't count)
          </button>
        </div>
        <p className="font-mono text-[10px] text-muted-alt mt-1.5">
          Only active droids count toward rebirths. Storing means you own it but it's not deployed.
        </p>
      </div>

      <div className="flex gap-2.5 mt-2">
        <button className="btn btn-ghost flex-1" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary flex-1" type="button" onClick={submit}>
          Add droid
        </button>
      </div>
    </div>
  );
}
