import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/data/seed";

const styles: Record<RiskLevel, { dot: string; text: string; bg: string; ring: string; label: string }> = {
  low: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-500/10", ring: "ring-green-500/20", label: "Low" },
  moderate: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-500/10", ring: "ring-amber-500/25", label: "Moderate" },
  high: { dot: "bg-coral-500", text: "text-coral-600", bg: "bg-coral-500/10", ring: "ring-coral-500/25", label: "High" },
};

export function RiskBadge({
  level,
  className,
  showDot = true,
}: {
  level: RiskLevel;
  className?: string;
  showDot?: boolean;
}) {
  const s = styles[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        s.bg,
        s.text,
        s.ring,
        className,
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />}
      {s.label}
    </span>
  );
}
