import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KpiDef } from "@/data/seed";

function Sparkline({ points, tone }: { points: number[]; tone: "green" | "coral" }) {
  const w = 60;
  const h = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 2 - ((p - min) / span) * (h - 4)).toFixed(1)}`)
    .join(" ");
  const stroke = tone === "green" ? "#10B981" : "#F43F5E";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - 2 - ((points[points.length - 1] - min) / span) * (h - 4)} r="2" fill={stroke} />
    </svg>
  );
}

export function KpiCard({ kpi, className }: { kpi: KpiDef; className?: string }) {
  const up = !kpi.delta.startsWith("−") && !kpi.delta.startsWith("-");
  const DeltaIcon = up ? TrendingUp : TrendingDown;
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-card p-4 shadow-card transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="text-[13px] font-medium text-slate-500">{kpi.label}</div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="tnum font-mono text-[28px] font-medium leading-none text-slate-900">{kpi.value}</span>
        <Sparkline points={kpi.spark} tone={kpi.deltaTone} />
      </div>
      <div className="mt-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
            kpi.deltaTone === "green" ? "bg-green-500/10 text-green-700" : "bg-coral-500/10 text-coral-600",
          )}
        >
          <DeltaIcon className="h-3 w-3" />
          {kpi.delta}
        </span>
      </div>
    </div>
  );
}
