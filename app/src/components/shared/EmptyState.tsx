import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Empty state — dotted-border card, lucide icon in a tinted circle,
 * headline, body copy, optional CTA.
 */
export function EmptyState({
  icon: Icon,
  headline,
  body,
  cta,
  onCta,
  tone = "teal",
  dark = false,
  className,
}: {
  icon: LucideIcon;
  headline: string;
  body?: string;
  cta?: string;
  onCta?: () => void;
  tone?: "teal" | "green" | "coral" | "slate";
  dark?: boolean;
  className?: string;
}) {
  const tones = {
    teal: "bg-teal-500/10 text-teal-500",
    green: "bg-green-500/10 text-green-500",
    coral: "bg-coral-500/10 text-coral-500",
    slate: "bg-slate-500/10 text-slate-500",
  };
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed px-8 py-12 text-center",
        dark ? "border-ink-700 bg-ink-900/40" : "border-line bg-white",
        className,
      )}
    >
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-full", tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <h4 className={cn("mt-4 text-base font-semibold", dark ? "text-ink-100" : "text-slate-900")}>{headline}</h4>
      {body && (
        <p className={cn("mt-1.5 max-w-sm text-[13px] leading-relaxed", dark ? "text-ink-400" : "text-slate-500")}>{body}</p>
      )}
      {cta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-5 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
        >
          {cta}
        </button>
      )}
    </div>
  );
}
