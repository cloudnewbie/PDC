import { cn } from "@/lib/utils";
import { useElapsed } from "@/components/pages/dashboard/hooks";
import { formatBreach, formatCountdown, slaRemainingSec } from "@/components/pages/dashboard/sla";

/**
 * Live SLA countdown. Ticks each second; coral + pulsing under 10 minutes,
 * red-solid "BREACHED" badge once the target is exceeded.
 */
export function SlaCountdown({
  openedAgoMin,
  slaTargetMin,
  className,
}: {
  openedAgoMin: number;
  slaTargetMin: number;
  className?: string;
}) {
  const elapsed = useElapsed(1000);
  const remaining = slaRemainingSec(openedAgoMin, slaTargetMin, elapsed);

  if (remaining <= 0) {
    return (
      <span
        className={cn(
          "tnum inline-flex items-center rounded-md bg-coral-500 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white",
          className,
        )}
      >
        BREACHED {formatBreach(remaining)}
      </span>
    );
  }

  const critical = remaining < 10 * 60;
  const soon = remaining < 30 * 60;
  return (
    <span
      className={cn(
        "tnum inline-flex items-center gap-1 font-mono text-[12px] font-semibold",
        critical ? "animate-pulse-dot text-coral-600" : soon ? "text-coral-600" : "text-slate-500",
        className,
      )}
      title={`SLA target ${slaTargetMin} min`}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", soon ? "bg-coral-500" : "bg-slate-400")} />
      {formatCountdown(remaining)}
    </span>
  );
}
