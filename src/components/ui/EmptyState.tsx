import type { ReactNode } from "react";

export function EmptyState({
  icon = "🍔",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-char/15 bg-white/60 px-6 py-10 text-center">
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <p className="font-display text-lg font-semibold text-char">{title}</p>
      {description && <p className="max-w-sm text-sm text-char/60">{description}</p>}
      {action}
    </div>
  );
}
