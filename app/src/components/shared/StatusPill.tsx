import { cn } from "@/lib/utils";
import type { CallStatus } from "@/data/seed";

type Status = CallStatus | "active" | "paused" | "resolved" | "dialing" | "connected";

const styles: Record<Status, { dot: string; text: string; bg: string; label: string; pulse?: boolean; strike?: boolean }> = {
  scheduled: { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-500/10", label: "Scheduled" },
  dialing: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-500/10", label: "Dialing…", pulse: true },
  connected: { dot: "bg-teal-500", text: "text-teal-700", bg: "bg-teal-500/10", label: "Connected", pulse: true },
  in_progress: { dot: "bg-teal-500", text: "text-teal-700", bg: "bg-teal-500/10", label: "In progress", pulse: true },
  completed: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-500/10", label: "Completed" },
  escalated: { dot: "bg-coral-500", text: "text-coral-600", bg: "bg-coral-500/10", label: "Escalated" },
  missed: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-500/10", label: "Missed" },
  failed: { dot: "bg-slate-400", text: "text-slate-500", bg: "bg-slate-500/10", label: "Failed", strike: true },
  active: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-500/10", label: "Active" },
  paused: { dot: "bg-slate-400", text: "text-slate-600", bg: "bg-slate-500/10", label: "Paused" },
  resolved: { dot: "bg-green-500", text: "text-green-700", bg: "bg-green-500/10", label: "Resolved" },
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const s = styles[status] ?? styles.scheduled;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        s.bg,
        s.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, s.pulse && "animate-pulse-dot")} />
      <span className={cn(s.strike && "line-through decoration-slate-400")}>{s.label}</span>
    </span>
  );
}
