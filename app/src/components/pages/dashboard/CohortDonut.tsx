import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { cohortMix } from "@/data/seed";

interface SectorShapeProps {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
}

const COLORS: Record<string, string> = {
  cardiac: "#14B8A6",
  ortho: "#8B5CF6",
  surgical: "#F59E0B",
  copd: "#64748B",
};

const renderActive = (props: SectorShapeProps) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={(outerRadius ?? 0) * 1.04}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      cornerRadius={4}
    />
  );
};

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { payload?: { label: string; count: number; highRisk: number } }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  if (!d) return null;
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-[11px] text-ink-100 shadow-modal">
      <div className="font-semibold">{d.label}</div>
      <div className="mt-0.5 text-ink-400">
        {d.count} patients · <span className="text-coral-500">{d.highRisk} high-risk</span>
      </div>
    </div>
  );
}

/**
 * "Cohort risk mix" donut — 4 cohorts, center mono label, hover expands the
 * segment 4% and shows cohort + high-risk count.
 */
export function CohortDonut({ replayKey }: { replayKey: string }) {
  const [active, setActive] = useState<number>(-1);
  const total = cohortMix.reduce((s, c) => s + c.count, 0);

  return (
    <div className="relative h-[260px] w-full" key={replayKey}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<DonutTooltip />} />
          <Pie
            data={cohortMix}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={64}
            outerRadius={92}
            paddingAngle={3}
            cornerRadius={4}
            strokeWidth={0}
            activeIndex={active}
            activeShape={renderActive}
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(-1)}
            isAnimationActive
            animationDuration={900}
          >
            {cohortMix.map((c) => (
              <Cell key={c.cohort} fill={COLORS[c.cohort]} className="cursor-pointer outline-none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum font-mono text-[32px] font-medium leading-none text-slate-900">{total}</span>
        <span className="mt-1 text-[12px] font-medium text-slate-500">patients</span>
      </div>
      {/* legend */}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {cohortMix.map((c) => (
          <span key={c.cohort} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[c.cohort] }} />
            {c.label}
            <span className="tnum font-mono text-slate-400">{c.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
