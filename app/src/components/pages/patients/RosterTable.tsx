import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, CheckCircle2, ChevronRight, Phone, PhoneMissed, Siren } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Patient } from "@/data/seed";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { StatusPill } from "@/components/shared/StatusPill";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Grid template shared by header + rows. */
export const ROSTER_GRID =
  "minmax(220px,1.5fr) minmax(150px,1fr) 110px 170px 110px minmax(160px,1.1fr) 150px 108px 36px";

/** Tiny 7-day risk trend spark, draws itself on row entry. */
export function RiskSpark({ points, tone }: { points: number[]; tone: "up" | "down" | "flat" }) {
  const w = 56;
  const h = 20;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 2 - ((p - min) / span) * (h - 4)).toFixed(1)}`)
    .join(" ");
  const stroke = tone === "up" ? "#F43F5E" : tone === "down" ? "#10B981" : "#94A3B8";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <motion.path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
      />
    </svg>
  );
}

function OutcomeIcon({ status }: { status: Patient["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
  if (status === "missed" || status === "failed") return <PhoneMissed className="h-3.5 w-3.5 text-amber-500" />;
  if (status === "escalated") return <Siren className="h-3.5 w-3.5 text-coral-500" />;
  return null;
}

export function RosterTable({
  rows,
  stagger,
  onOpen,
  onCallNow,
}: {
  rows: Patient[];
  /** per-row stagger delay (0.04 mount / 0.03 filter change) */
  stagger: number;
  onOpen: (p: Patient) => void;
  onCallNow: (p: Patient) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
      <div className="min-w-[1240px]">
        {/* header */}
        <div
          className="grid items-center gap-3 border-b border-line px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400"
          style={{ gridTemplateColumns: ROSTER_GRID }}
        >
          <span>Patient</span>
          <span>Cohort</span>
          <span>Discharged</span>
          <span>Risk score</span>
          <span>Med adherence</span>
          <span>Last call</span>
          <span>Next call</span>
          <span>Status</span>
          <span />
        </div>

        {/* rows */}
        <AnimatePresence mode="popLayout" initial={false}>
          {rows.map((p, i) => (
            <motion.div
              layout="position"
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 12, transition: { duration: 0.15 } }}
              transition={{ duration: 0.35, ease: EASE, delay: i * stagger }}
              onClick={() => onOpen(p)}
              className={cn(
                "group relative grid cursor-pointer items-center gap-3 border-b border-line px-5 py-3 transition-colors last:border-b-0 hover:bg-paper",
                p.riskLevel === "high" && "border-l-2 border-l-coral-500 pl-[18px]",
              )}
              style={{ gridTemplateColumns: ROSTER_GRID }}
            >
              {/* patient */}
              <div className="flex min-w-0 items-center gap-3">
                <motion.img
                  layoutId={`patient-avatar-${p.id}`}
                  src={p.avatar}
                  alt={p.name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-line"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{p.name}</div>
                  <div className="font-mono text-xs text-slate-400">{p.mrn}</div>
                </div>
              </div>

              {/* cohort */}
              <div className="min-w-0">
                <span className="inline-block truncate rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {p.cohortLabel}
                </span>
              </div>

              {/* discharged */}
              <div>
                <div className="text-[13px] font-medium text-slate-700">
                  {new Date(p.discharged + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <span className="tnum mt-0.5 inline-block rounded-md bg-teal-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-700">
                  day {p.dayPost}
                </span>
              </div>

              {/* risk */}
              <div className="flex items-center gap-2.5">
                <span className="tnum font-mono text-sm font-semibold text-slate-900">{p.riskScore.toFixed(2)}</span>
                <RiskBadge level={p.riskLevel} showDot={false} className="px-2 py-0 text-[11px]" />
                <RiskSpark points={p.riskSpark} tone={p.riskTrend} />
              </div>

              {/* adherence */}
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-[60px] overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      p.adherence >= 90 ? "bg-green-500" : p.adherence >= 75 ? "bg-teal-500" : "bg-amber-500",
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.adherence}%` }}
                    transition={{ duration: 0.6, ease: EASE, delay: i * stagger + 0.2 }}
                  />
                </div>
                <span className="tnum font-mono text-xs font-semibold text-slate-600">{p.adherence}%</span>
              </div>

              {/* last call */}
              <div className="flex min-w-0 items-center gap-1.5">
                <OutcomeIcon status={p.status} />
                {p.lastCall ? (
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-slate-700">{p.lastCall.when}</div>
                    <div className="truncate text-[11px] text-slate-400">{p.lastCall.outcome}</div>
                  </div>
                ) : (
                  <span className="text-[13px] text-slate-400">—</span>
                )}
              </div>

              {/* next call */}
              <div>
                {p.nextCall ? (
                  <>
                    <div className="tnum font-mono text-[13px] font-semibold text-slate-900">{p.nextCall.when}</div>
                    <span className="mt-0.5 inline-block rounded-md bg-slate-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">
                      {p.nextCall.cadence === "day7" ? "Day 7" : p.nextCall.cadence === "day14" ? "Day 14" : p.nextCall.cadence}
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] text-slate-400">— (escalated)</span>
                )}
              </div>

              {/* status */}
              <div>
                <StatusPill status={p.status} />
              </div>

              {/* chevron + hover quick actions */}
              <div className="relative flex items-center justify-end">
                <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" />
                <div className="pointer-events-none absolute right-6 top-1/2 flex -translate-y-1/2 translate-x-2 items-center gap-1 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
                  <button
                    type="button"
                    title="Call now"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCallNow(p);
                    }}
                    className="rounded-lg border border-line bg-white p-1.5 text-teal-600 shadow-card transition-colors hover:bg-teal-50"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Reschedule"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg border border-line bg-white p-1.5 text-slate-500 shadow-card transition-colors hover:bg-paper"
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
