import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Segmented control with a sliding knob (layoutId spring).
 * Used by the dashboard date-range switch and the escalations filter.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  id,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-xs",
        className,
      )}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
              active ? "text-teal-700" : "text-slate-500 hover:text-slate-900",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-teal-50 ring-1 ring-teal-500/25"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
