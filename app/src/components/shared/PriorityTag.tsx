import { cn } from "@/lib/utils";
import type { Priority } from "@/data/seed";

const styles: Record<Priority, string> = {
  P1: "bg-coral-500 text-white shadow-[0_0_16px_-4px_rgb(244_63_94/.6)]",
  P2: "bg-amber-500 text-white",
  P3: "bg-slate-400 text-white",
};

export function PriorityTag({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "tnum inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wide",
        styles[priority],
        className,
      )}
    >
      {priority}
    </span>
  );
}
