import { useEffect, useMemo, useRef, useState } from "react";
import { useDroidDict } from "../../hooks/useDroidDict";
import type { DroidDef } from "../../types";
import { ClassPill } from "./ClassPill";

interface Props {
  value: string;
  onChange: (raw: string, resolved: DroidDef | null) => void;
  placeholder?: string;
  /** ID for the underlying input so labels can target it. */
  id?: string;
  /** Called when the user picks a suggestion. */
  onSelect?: (def: DroidDef) => void;
}

/**
 * A combobox over the droid dictionary. Unknown names are allowed (free text)
 * — the dict will be wrong for weeks, and forcing a match would block users
 * from logging newly-released droids.
 */
export function Autocomplete({ value, onChange, onSelect, placeholder = "Droid name", id }: Props) {
  const { index } = useDroidDict();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => index.search(value, 8), [index, value]);
  const exact = useMemo(() => index.resolve(value), [index, value]);

  useEffect(() => setHighlighted(0), [matches.length]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  const pick = (def: DroidDef) => {
    onChange(def.canonical, def);
    onSelect?.(def);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && matches.length) {
      e.preventDefault();
      setOpen(true);
      setHighlighted((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp" && matches.length) {
      e.preventDefault();
      setOpen(true);
      setHighlighted((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" && open && matches[highlighted]) {
      e.preventDefault();
      pick(matches[highlighted].def);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        type="text"
        className="input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value, index.resolve(e.target.value));
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value.trim() && !exact && !open ? (
        <p className="font-mono text-[10px] text-warn mt-1">
          Unknown droid — we'll add it as a custom entry.
        </p>
      ) : null}
      {open && matches.length > 0 ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-[10px] border border-line bg-panel shadow-[0_8px_30px_rgba(0,0,0,.4)]"
        >
          {matches.map((m, i) => (
            <li
              key={`${m.def.canonical}-${i}`}
              role="option"
              aria-selected={i === highlighted}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-[14px] ${
                i === highlighted ? "bg-panel-alt" : ""
              }`}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m.def);
              }}
            >
              <span className="flex-1 truncate">
                <span className="font-medium">{m.def.canonical}</span>
                {m.viaAlias ? (
                  <span className="text-muted text-[12px] ml-1.5">(also: {m.matched})</span>
                ) : null}
              </span>
              <ClassPill kind={m.def.class} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
