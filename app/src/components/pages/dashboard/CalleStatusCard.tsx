import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowRight, PhoneOutgoing, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { calleStatus } from "@/data/seed";
import { useCallEMode } from "@/lib/calle";

function LatencySpark({ points }: { points: number[] }) {
  const w = 220;
  const h = 36;
  const min = 100;
  const max = 260;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 3 - ((p - min) / (max - min)) * (h - 6)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={w}
        cy={h - 3 - ((points[points.length - 1] - min) / (max - min)) * (h - 6)}
        r="2.5"
        fill="#8B5CF6"
      />
    </svg>
  );
}

/**
 * "CALL-E status" — adapter mode pill, live-updating latency sparkline,
 * daily call quota, voice config, test-call action.
 */
export function CalleStatusCard() {
  const navigate = useNavigate();
  const { mode } = useCallEMode();
  const live = mode === "live";
  const [latency, setLatency] = useState<number[]>(calleStatus.latencySeries);

  // latency sparkline live-updates every 2s (shift + draw)
  useEffect(() => {
    const t = window.setInterval(() => {
      setLatency((prev) => [...prev.slice(1), 120 + Math.round(Math.random() * 120)]);
    }, 2000);
    return () => window.clearInterval(t);
  }, []);

  const remaining = calleStatus.callsQuotaToday - calleStatus.callsUsedToday;
  const p95 = latency[latency.length - 1];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <Zap className="h-4 w-4 text-violet-500" />
        <h4 className="text-base font-semibold text-slate-900">CALL-E status</h4>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            live
              ? "border-green-500/30 bg-green-500/10 text-green-600"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700",
          )}
        >
          <span className={cn("h-1.5 w-1.5 animate-pulse-dot rounded-full", live ? "bg-green-500" : "bg-amber-500")} />
          {live ? "Live · CALL-E" : "Demo Mode"}
        </span>
      </div>

      <div className="flex-1 space-y-4 px-5 py-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-slate-500">API latency (p95)</span>
            <span className="tnum font-mono text-[13px] font-semibold text-violet-500">{p95} ms</span>
          </div>
          <LatencySpark points={latency} />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-medium text-slate-500">Calls remaining today</span>
            <span className="tnum font-mono text-[13px] font-semibold text-slate-900">
              {remaining}/{calleStatus.callsQuotaToday}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-500/10">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-500"
              style={{ width: `${(calleStatus.callsUsedToday / calleStatus.callsQuotaToday) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 font-mono text-[11px] text-slate-500">
          <span>
            voice: <span className="text-slate-900">{calleStatus.voice}</span> · {calleStatus.language}
          </span>
          <span className="text-slate-400">{calleStatus.workspace}</span>
        </div>

        <button
          type="button"
          onClick={() =>
            toast("Test call queued — agent will call the sandbox number", {
              description: live ? "Dialing via CALL-E PSTN…" : "Demo mode — simulated ring, no PSTN charges.",
            })
          }
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-white py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-paper"
        >
          <PhoneOutgoing className="h-3.5 w-3.5 text-teal-600" />
          Run test call
        </button>
      </div>

      <button
        type="button"
        onClick={() => navigate("/app/settings")}
        className="flex items-center justify-center gap-1.5 border-t border-line py-3 text-[13px] font-semibold text-teal-700 transition-colors hover:bg-teal-50/60"
      >
        Integration settings
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
