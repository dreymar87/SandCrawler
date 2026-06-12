import { useState } from "react";
import { TIERS } from "../../constants";
import { useAppStore } from "../../store/useAppStore";
import type { Rank, RebirthReq, Tier } from "../../types";
import { Autocomplete } from "../Collection/Autocomplete";

interface Props {
  initial?: { groupId: string; level: string; rank: Rank };
  onClose: () => void;
}

export function SuperRebirthEditor({ initial, onClose }: Props) {
  const upsert = useAppStore((s) => s.upsertSuperRank);

  const [level, setLevel] = useState(initial?.level ?? "");
  const [rankNum, setRankNum] = useState(initial?.rank.rank ?? "");
  const [credits, setCredits] = useState(initial?.rank.credits ?? "");
  const [creditsReady, setCreditsReady] = useState(initial?.rank.creditsReady ?? false);
  const [droids, setDroids] = useState<RebirthReq[]>(
    initial?.rank.droids.length
      ? initial.rank.droids.map((d) => ({ ...d }))
      : [{ name: "", tier: "DEFAULT" }],
  );
  const [gainCredits, setGainCredits] = useState(initial?.rank.gain?.credits ?? "");
  const [gainMult, setGainMult] = useState(initial?.rank.gain?.multiplier ?? "");
  const [gainSlot, setGainSlot] = useState(initial?.rank.gain?.slot ?? "");
  const [gainForce, setGainForce] = useState(initial?.rank.gain?.force ?? "");
  const [notes, setNotes] = useState(initial?.rank.notes ?? "");

  const updateDroid = (i: number, patch: Partial<RebirthReq>) => {
    setDroids((arr) => arr.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };
  const addDroid = () => setDroids((arr) => [...arr, { name: "", tier: "DEFAULT" }]);
  const removeDroid = (i: number) => {
    setDroids((arr) => {
      const next = arr.filter((_, idx) => idx !== i);
      return next.length ? next : [{ name: "", tier: "DEFAULT" }];
    });
  };

  const save = () => {
    if (!level.trim()) return;
    upsert({
      existingGroupId: initial?.groupId,
      existingRankId: initial?.rank.id,
      level: level.trim(),
      rank: rankNum.trim(),
      credits: credits.trim(),
      creditsReady,
      droids: droids.filter((d) => d.name.trim()),
      gain: {
        credits: gainCredits.trim(),
        multiplier: gainMult.trim(),
        slot: gainSlot.trim(),
        force: gainForce.trim(),
      },
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="rounded-2xl border border-holo-dim bg-panel p-4 mb-5">
      <h2 className="font-display font-semibold text-base mb-3.5">
        {initial ? "Edit" : "New"} rebirth rank
      </h2>

      <div className="grid grid-cols-2 gap-2.5 mb-3.5">
        <div>
          <label className="field-label" htmlFor="f-level">
            Super Rebirth #
          </label>
          <input
            id="f-level"
            type="text"
            inputMode="numeric"
            className="input"
            placeholder="e.g. 2"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="f-rank">
            Rank #
          </label>
          <input
            id="f-rank"
            type="text"
            inputMode="numeric"
            className="input"
            placeholder="e.g. 1"
            value={rankNum}
            onChange={(e) => setRankNum(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3.5">
        <label className="field-label" htmlFor="f-credits">
          Credits needed
        </label>
        <div className="grid grid-cols-[1fr_130px] gap-2.5">
          <input
            id="f-credits"
            type="text"
            className="input"
            placeholder="e.g. 10.00K"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-ghost text-xs px-2"
            onClick={() => setCreditsReady((v) => !v)}
          >
            {creditsReady ? "✓ Have it" : "Mark ready"}
          </button>
        </div>
      </div>

      <div className="mb-3.5">
        <span className="field-label">Droids needed</span>
        {droids.map((d, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_40px] gap-2 mb-2 items-start">
            <Autocomplete
              value={d.name}
              onChange={(raw, def) => updateDroid(i, { name: def?.canonical ?? raw })}
              placeholder="Droid name"
            />
            <select
              className="select py-2.5"
              value={d.tier}
              onChange={(e) => updateDroid(i, { tier: e.target.value as Tier })}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="h-10 rounded-[9px] border border-line-alt text-muted hover:text-danger hover:border-danger/50 grid place-items-center"
              onClick={() => removeDroid(i)}
              aria-label="Remove droid row"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          className="font-mono text-[11px] uppercase tracking-wider text-holo py-2"
          onClick={addDroid}
        >
          + Add another droid
        </button>
      </div>

      <details className="border border-line rounded-[10px] mb-3.5 bg-bg-alt px-3 [&[open]]:pb-2">
        <summary className="font-mono text-[10.5px] uppercase tracking-wider text-muted py-2.5 cursor-pointer">
          Rewards from this rebirth (optional)
        </summary>
        <div className="grid grid-cols-2 gap-2.5 mt-2">
          <Field id="g-cr" label="Credits gain" value={gainCredits} onChange={setGainCredits} placeholder="e.g. 2K" />
          <Field id="g-mu" label="Multiplier" value={gainMult} onChange={setGainMult} placeholder="e.g. +45%" />
          <Field id="g-sl" label="Slot" value={gainSlot} onChange={setGainSlot} placeholder="e.g. Worker" />
          <Field id="g-fo" label="Force" value={gainForce} onChange={setGainForce} placeholder="e.g. Push" />
        </div>
      </details>

      <div className="mb-3.5">
        <label className="field-label" htmlFor="f-notes">
          Notes (optional)
        </label>
        <textarea
          id="f-notes"
          className="textarea"
          placeholder="Anything to remember…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-2.5">
        <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary flex-1" onClick={save}>
          {initial ? "Save changes" : "Add rank"}
        </button>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
