import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChartDay } from "@/data/seed";

const TEAL = "#14B8A6";
const CORAL = "#F43F5E";

function PulseTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number; dataKey?: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const calls = payload.find((p) => p.dataKey === "calls")?.value ?? 0;
  const flags = payload.find((p) => p.dataKey === "flags")?.value ?? 0;
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-[11px] text-ink-100 shadow-modal">
      <span className="text-ink-400">{label}</span>
      <span className="mx-1.5 text-ink-700">·</span>
      <span className="text-teal-400">{calls} calls</span>
      <span className="mx-1.5 text-ink-700">·</span>
      <span className="text-coral-500">{flags} flags</span>
    </div>
  );
}

/**
 * "Program pulse" — 14-day ComposedChart: teal bars (calls/day) + coral line
 * (red flags, right axis). Legend chips toggle series; bar click deep-links to
 * the results page for that date. `replayKey` re-runs the draw animation.
 */
export function ProgramPulseChart({ data, replayKey }: { data: ChartDay[]; replayKey: string }) {
  const navigate = useNavigate();
  const [showCalls, setShowCalls] = useState(true);
  const [showFlags, setShowFlags] = useState(true);

  const rows = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        iso: format(parse(d.date, "MMM d", new Date(2026, 0, 1)), "yyyy-MM-dd"),
      })),
    [data],
  );

  return (
    <div>
      {/* legend chips */}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowCalls((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-200",
            showCalls ? "border-teal-500/30 bg-teal-50 text-teal-700" : "border-line bg-white text-slate-400",
          )}
        >
          <span className="h-2 w-2 rounded-sm bg-teal-500" />
          Calls
        </button>
        <button
          type="button"
          onClick={() => setShowFlags((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-200",
            showFlags ? "border-coral-500/30 bg-coral-100/60 text-coral-600" : "border-line bg-white text-slate-400",
          )}
        >
          <span className="h-2 w-2 rounded-full bg-coral-500" />
          Red flags
        </button>
        <span className="ml-auto font-mono text-[11px] text-slate-400">click a bar → day results</span>
      </div>

      <div className="h-[260px] w-full" key={replayKey}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: -18 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#E4E7EE" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: "#E4E7EE" }}
              tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono, monospace" }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              yAxisId="calls"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#64748B", fontFamily: "JetBrains Mono, monospace" }}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="flags"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#F43F5E", fontFamily: "JetBrains Mono, monospace" }}
              allowDecimals={false}
            />
            <Tooltip content={<PulseTooltip />} cursor={{ fill: "rgba(20,184,166,0.06)" }} />
            {showCalls && (
              <Bar
                yAxisId="calls"
                dataKey="calls"
                fill={TEAL}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
                onClick={(d) => {
                  const iso = (d as unknown as { iso?: string }).iso;
                  if (iso) navigate(`/app/results?date=${iso}`);
                }}
                className="cursor-pointer"
              />
            )}
            {showFlags && (
              <Line
                yAxisId="flags"
                type="monotone"
                dataKey="flags"
                stroke={CORAL}
                strokeWidth={2}
                dot={{ r: 2.5, fill: CORAL, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                animationDuration={1200}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
