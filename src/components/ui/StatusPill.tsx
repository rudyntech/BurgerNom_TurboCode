import type { EntryStatus } from "@/types/database";
import { CircleDashed, Heart, CheckCircle2 } from "lucide-react";

const STYLES: Record<EntryStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  untried: { label: "Not Tried", className: "bg-black/5 text-char/60", Icon: CircleDashed },
  want_to_try: { label: "Want to Try", className: "bg-mustard-400/20 text-mustard-500", Icon: Heart },
  tried: { label: "Tried", className: "bg-lettuce-500/15 text-lettuce-600", Icon: CheckCircle2 },
};

export function StatusPill({ status, className = "" }: { status: EntryStatus; className?: string }) {
  const { label, className: styleClassName, Icon } = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styleClassName} ${className}`}
    >
      <Icon size={14} strokeWidth={2.5} />
      {label}
    </span>
  );
}
