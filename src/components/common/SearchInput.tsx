/** Small controlled search box with a clear button. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search droids…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-alt pointer-events-none"
        aria-hidden
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="text"
        className="input pl-9 pr-9"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-alt hover:text-ink"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
