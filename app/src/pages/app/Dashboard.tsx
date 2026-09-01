import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { PhoneOutgoing } from "lucide-react";
import { kpis, programPulse } from "@/data/seed";
import type { KpiDef } from "@/data/seed";
import { KpiCard } from "@/components/shared/KpiCard";
import { SegmentedControl } from "@/components/pages/dashboard/SegmentedControl";
import { useCountUp } from "@/components/pages/dashboard/hooks";
import { ProgramPulseChart } from "@/components/pages/dashboard/ProgramPulseChart";
import { CohortDonut } from "@/components/pages/dashboard/CohortDonut";
import { CallQueue } from "@/components/pages/dashboard/CallQueue";
import { ActivityFeed } from "@/components/pages/dashboard/ActivityFeed";
import { EscalationsMini } from "@/components/pages/dashboard/EscalationsMini";
import { OutcomesCard } from "@/components/pages/dashboard/OutcomesCard";
import { CalleStatusCard } from "@/components/pages/dashboard/CalleStatusCard";

type Range = "today" | "7d" | "30d";

/** Range-derived KPIs (seed `kpis` describe the default 7-day window). */
function kpisForRange(range: Range): KpiDef[] {
  if (range === "7d") return kpis;
  if (range === "today") {
    return [
      kpis[0],
      { ...kpis[1], value: "7", numeric: 7, delta: "+2 vs yesterday", spark: [4, 5, 3, 6, 7, 9, 7] },
      kpis[2],
      kpis[3],
      kpis[4],
    ];
  }
  return [
    { ...kpis[0], delta: "+6 this month", spark: [9, 11, 13, 15, 16, 17, 18] },
    { ...kpis[1], value: "152", numeric: 152, delta: "+22%", spark: [98, 110, 118, 126, 133, 144, 152] },
    { ...kpis[2], value: "91%", numeric: 91, delta: "+1 pt", spark: [82, 84, 86, 85, 88, 90, 91] },
    kpis[3],
    { ...kpis[4], value: "88%", numeric: 88, delta: "−1 pt", spark: [93, 92, 91, 90, 90, 89, 88] },
  ];
}

function chartForRange(range: Range) {
  if (range === "today") return programPulse.slice(-7);
  return programPulse;
}

/** KpiCard with a count-up numeral; re-tweens whenever the range changes. */
function AnimatedKpi({ kpi }: { kpi: KpiDef }) {
  const n = useCountUp(kpi.numeric, 0.8);
  const display = kpi.value.endsWith("%") ? `${n}%` : `${n}`;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className="h-full"
    >
      <KpiCard kpi={{ ...kpi, value: display }} className="h-full" />
    </motion.div>
  );
}

const section = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

/**
 * Dashboard (/app) — care-team command center, per design/dashboard.md.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("7d");
  const rangeKpis = useMemo(() => kpisForRange(range), [range]);
  const chartData = useMemo(() => chartForRange(range), [range]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-[1400px] p-6 lg:p-8"
    >
      {/* ------------------------------------------------ Section 1: header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-center gap-4"
      >
        <div className="min-w-0">
          <h3 className="text-2xl font-semibold tracking-[-0.01em] text-slate-900">
            Good morning, Nurse Ruiz
          </h3>
          <p className="mt-1 text-[13px] font-medium text-slate-500">
            Tuesday, March 10 · 18 patients under monitoring ·{" "}
            <span className="text-teal-700">next call in 12 min</span>
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <SegmentedControl
            id="dash-range"
            value={range}
            onChange={setRange}
            options={[
              { value: "today", label: "Today" },
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
            ]}
          />
          <button
            type="button"
            onClick={() => navigate("/app/live?autostart=1")}
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgb(20_184_166/.7)] transition-colors hover:bg-teal-600"
          >
            <PhoneOutgoing className="h-4 w-4" />
            Start demo call
          </button>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="mt-6 space-y-6"
      >
        {/* ------------------------------------------- Section 2: KPI row */}
        <motion.section variants={section} className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {rangeKpis.map((k) => (
            <AnimatedKpi key={`${range}-${k.id}`} kpi={k} />
          ))}
        </motion.section>

        {/* ----------------------------------------- Section 3: charts row */}
        <motion.section variants={section} className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
            <div className="mb-1 flex items-baseline justify-between">
              <h4 className="text-base font-semibold text-slate-900">Program pulse</h4>
              <span className="font-mono text-[11px] text-slate-400">
                {range === "today" ? "last 7 days" : "14-day view"}
              </span>
            </div>
            <ProgramPulseChart data={chartData} replayKey={range} />
          </div>
          <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
            <div className="mb-1 flex items-baseline justify-between">
              <h4 className="text-base font-semibold text-slate-900">Cohort risk mix</h4>
              <span className="font-mono text-[11px] text-slate-400">by enrolled cohort</span>
            </div>
            <CohortDonut replayKey={range} />
          </div>
        </motion.section>

        {/* ------------------------------------- Section 4: queue + feed */}
        <motion.section variants={section} className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <CallQueue />
          </div>
          <ActivityFeed />
        </motion.section>

        {/* -------------------------------------- Section 5: bottom row */}
        <motion.section variants={section} className="grid gap-6 lg:grid-cols-3">
          <EscalationsMini />
          <OutcomesCard replayKey={range} />
          <CalleStatusCard />
        </motion.section>
      </motion.div>
    </motion.div>
  );
}
