const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-2.5 py-1 gap-1.5",
  lg: "text-lg px-3.5 py-1.5 gap-2",
};

export function RatingBadge({
  value,
  tone = "flame",
  size = "md",
  emptyLabel = "—",
}: {
  value: number | null;
  tone?: "flame" | "neutral" | "mustard";
  size?: keyof typeof SIZE_CLASSES;
  emptyLabel?: string;
}) {
  const toneClass =
    tone === "flame"
      ? "bg-flame-500 text-white"
      : tone === "mustard"
        ? "bg-mustard-400 text-char"
        : "bg-black/5 text-char/70";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold tabular-nums ${toneClass} ${SIZE_CLASSES[size]}`}
    >
      {value !== null ? value.toFixed(1) : emptyLabel}
    </span>
  );
}
