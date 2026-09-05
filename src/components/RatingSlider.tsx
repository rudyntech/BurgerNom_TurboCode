"use client";

export function RatingSlider({
  label,
  value,
  onChange,
  accent = "flame",
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  accent?: "flame" | "mustard";
}) {
  const accentClass = accent === "flame" ? "accent-[#e8542a]" : "accent-[#dba300]";

  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-char">{label}</label>
        <div className="flex items-center gap-2">
          <span className="w-10 text-right text-sm font-bold tabular-nums text-char/80">
            {value !== null ? value.toFixed(1) : "—"}
          </span>
          {value !== null && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-xs font-semibold text-char/40 hover:text-char/70"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        step={0.1}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-1 h-2 w-full cursor-pointer appearance-none rounded-full bg-bun ${accentClass}`}
        aria-label={label}
      />
    </div>
  );
}
