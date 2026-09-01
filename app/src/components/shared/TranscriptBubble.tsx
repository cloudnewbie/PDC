import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Transcript bubble — agent left (teal label), patient right (violet label
 * on dark / slate on light). Mono timestamp. Red-flag phrases render with a
 * coral underline highlight + inline flag icon.
 */
export function TranscriptBubble({
  speaker,
  text,
  timestamp,
  flagQuote,
  dark = false,
  className,
}: {
  speaker: "agent" | "patient";
  text: string;
  timestamp?: string;
  flagQuote?: string;
  dark?: boolean;
  className?: string;
}) {
  const isAgent = speaker === "agent";

  const body = flagQuote && text.includes(flagQuote) ? (
    <>
      {text.slice(0, text.indexOf(flagQuote))}
      <mark className="rounded-sm bg-coral-500/15 px-0.5 text-inherit underline decoration-coral-500 decoration-2 underline-offset-2">
        <Flag className="mr-0.5 inline h-3 w-3 text-coral-500" aria-label="red flag" />
        {flagQuote}
      </mark>
      {text.slice(text.indexOf(flagQuote) + flagQuote.length)}
    </>
  ) : (
    text
  );

  return (
    <div className={cn("flex w-full", isAgent ? "justify-start" : "justify-end", className)}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isAgent
            ? dark
              ? "rounded-tl-sm bg-ink-800 text-ink-100"
              : "rounded-tl-sm bg-teal-50 text-slate-900 ring-1 ring-teal-500/15"
            : dark
              ? "rounded-tr-sm bg-ink-700 text-ink-100"
              : "rounded-tr-sm bg-white text-slate-900 ring-1 ring-line shadow-xs",
        )}
      >
        <div
          className={cn(
            "mb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]",
            isAgent ? "text-teal-500" : dark ? "text-violet-400" : "text-slate-500",
          )}
        >
          {isAgent ? "Agent" : "Patient"}
          {timestamp && (
            <span className={cn("ml-2 font-normal normal-case tracking-normal", dark ? "text-ink-400" : "text-slate-400")}>
              {timestamp}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
