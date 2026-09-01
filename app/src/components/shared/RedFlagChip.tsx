import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Red-flag chip — coral, always paired with a confidence score.
 * Light: coral-100 bg / coral-500 text. Dark: coral-500/15 bg.
 * `tier="amber"` renders the amber (logged, non-urgent) variant.
 * `outline` renders the transparent outline variant used on campaign cards.
 */
export function RedFlagChip({
  label,
  confidence,
  tier = "coral",
  dark = false,
  outline = false,
  className,
  onClick,
}: {
  label: string;
  confidence?: number;
  tier?: "coral" | "amber";
  dark?: boolean;
  outline?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  const palette =
    tier === "coral"
      ? outline
        ? "border-coral-500/40 text-coral-600 bg-transparent"
        : dark
          ? "bg-coral-500/15 text-coral-400 border-coral-500/25"
          : "bg-coral-100 text-coral-600 border-coral-500/20"
      : outline
        ? "border-amber-500/40 text-amber-700 bg-transparent"
        : dark
          ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
          : "bg-amber-100 text-amber-700 border-amber-500/20";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        palette,
        onClick && "cursor-pointer transition-transform hover:scale-[1.03]",
        !onClick && "cursor-default",
        className,
      )}
    >
      <Flag className="h-3 w-3" />
      <span>{label}</span>
      {confidence !== undefined && (
        <span className="tnum font-mono text-[11px] font-medium opacity-80">{confidence.toFixed(2)}</span>
      )}
    </button>
  );
}
