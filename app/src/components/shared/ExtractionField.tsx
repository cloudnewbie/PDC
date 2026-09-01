import { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExtractionState = "pending" | "filling" | "filled" | "edited";

/**
 * Extraction field — "the machine listening". A label + value that types
 * itself in character-by-character (18ms/char) with a violet caret when
 * `value` arrives. States: pending (dashed placeholder), filling (caret),
 * filled (value + confidence dot), edited (amber "verified by nurse" dot).
 */
export function ExtractionField({
  label,
  value,
  confidence,
  edited = false,
  dark = true,
  typeMs = 18,
  className,
  onEdit,
}: {
  label: string;
  value?: string;
  confidence?: number;
  edited?: boolean;
  dark?: boolean;
  typeMs?: number;
  className?: string;
  onEdit?: () => void;
}) {
  const [shown, setShown] = useState(0);
  const [state, setState] = useState<ExtractionState>(value ? "filling" : "pending");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!value) {
      setState("pending");
      setShown(0);
      return;
    }
    setState("filling");
    setShown(0);
    timerRef.current = setInterval(() => {
      setShown((n) => {
        if (n >= value.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          setState(edited ? "edited" : "filled");
          return n;
        }
        return n + 1;
      });
    }, typeMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [value, typeMs, edited]);

  const displayValue = value ? value.slice(0, shown) : "";
  const done = state === "filled" || state === "edited";

  return (
    <div
      className={cn(
        "group rounded-xl border px-3 py-2.5",
        dark
          ? state === "pending"
            ? "border-dashed border-ink-700 bg-ink-900/40"
            : "border-ink-700 bg-ink-800/60"
          : state === "pending"
            ? "border-dashed border-line bg-paper"
            : "border-line bg-white",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("font-mono text-[11px] uppercase tracking-[0.08em]", dark ? "text-ink-400" : "text-slate-500")}>
          {label}
        </span>
        {done && confidence !== undefined && (
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                state === "edited" ? "bg-amber-500" : "bg-violet-500",
              )}
              title={state === "edited" ? "verified by nurse" : `confidence ${confidence.toFixed(2)}`}
            />
            <span className={cn("tnum font-mono text-[10px]", dark ? "text-ink-400" : "text-slate-400")}>
              {state === "edited" ? "verified" : confidence.toFixed(2)}
            </span>
          </span>
        )}
        {done && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="opacity-0 transition-opacity group-hover:opacity-100"
            aria-label={`Edit ${label}`}
          >
            <Pencil className={cn("h-3 w-3", dark ? "text-ink-400" : "text-slate-400")} />
          </button>
        )}
      </div>
      <div
        className={cn(
          "mt-1 min-h-[20px] font-mono text-[13px] leading-snug",
          dark ? "text-ink-100" : "text-slate-900",
          state === "pending" && (dark ? "text-ink-700" : "text-slate-300"),
        )}
      >
        {state === "pending" ? (
          "· · ·"
        ) : (
          <>
            {displayValue}
            {state === "filling" && <span className="ml-0.5 inline-block h-3.5 w-[7px] animate-caret-blink bg-violet-500 align-[-2px]" />}
            {done && state === "filled" && <Check className="ml-1.5 inline h-3 w-3 text-teal-400" />}
          </>
        )}
      </div>
    </div>
  );
}
