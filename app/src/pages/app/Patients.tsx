import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router";
import { Search, UserPlus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Cohort, Patient, RiskLevel } from "@/data/seed";
import { cohortMix, patientById, patients } from "@/data/seed";
import { EmptyState } from "@/components/shared/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RosterTable } from "@/components/pages/patients/RosterTable";
import { PatientDrawer } from "@/components/pages/patients/PatientDrawer";
import { EnrollWizard } from "@/components/pages/patients/EnrollWizard";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

type SortKey = "next" | "risk" | "discharge";

function nextCallKey(p: Patient): number {
  if (!p.nextCall) return Number.POSITIVE_INFINITY;
  const m = p.nextCall.when.match(/(\d{1,2}):(\d{2})/);
  const mins = m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 24 * 60;
  return (p.nextCall.when.includes("Tomorrow") ? 1440 : 0) + mins;
}

export default function Patients() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [cohorts, setCohorts] = useState<Cohort[]>(() => {
    const c = searchParams.get("cohort");
    return c && ["cardiac", "ortho", "surgical", "copd"].includes(c) ? [c as Cohort] : [];
  });
  const [risk, setRisk] = useState<"all" | RiskLevel>("all");
  const [sort, setSort] = useState<SortKey>("next");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const firstRender = useRef(true);

  const totalMonitored = cohortMix.reduce((a, c) => a + c.count, 0);
  const totalHighRisk = cohortMix.reduce((a, c) => a + c.highRisk, 0);

  const openPatient = patientById(searchParams.get("patient") ?? "") ?? null;

  const setCohortParams = (next: Cohort[]) => {
    setCohorts(next);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next.length === 1) p.set("cohort", next[0]);
        else p.delete("cohort");
        return p;
      },
      { replace: true },
    );
  };

  const openDrawer = (p: Patient) =>
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.set("patient", p.id);
      return sp;
    });

  const closeDrawer = () =>
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      sp.delete("patient");
      return sp;
    });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = patients.filter((p) => {
      if (cohorts.length > 0 && !cohorts.includes(p.cohort)) return false;
      if (risk !== "all" && p.riskLevel !== risk) return false;
      if (q && ![p.name, p.mrn, p.phone].some((f) => f.toLowerCase().includes(q))) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "risk") return b.riskScore - a.riskScore;
      if (sort === "discharge") return b.discharged.localeCompare(a.discharged);
      return nextCallKey(a) - nextCallKey(b);
    });
    return rows;
  }, [query, cohorts, risk, sort]);

  const stagger = firstRender.current ? 0.04 : 0.03;
  firstRender.current = false;

  const hasFilters = cohorts.length > 0 || risk !== "all" || query.trim() !== "";
  const clearAll = () => {
    setQuery("");
    setRisk("all");
    setCohortParams([]);
  };

  const toggleCohort = (c: Cohort) =>
    setCohortParams(cohorts.includes(c) ? cohorts.filter((x) => x !== c) : [...cohorts, c]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="mx-auto w-full max-w-[1400px] p-6 lg:p-8"
    >
      {/* ---------------------------------------------------------- header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold tracking-[-0.01em] text-slate-900">Patients</h3>
          <p className="mt-1 text-[13px] font-medium text-slate-500">
            {totalMonitored} under monitoring · {totalHighRisk} high risk
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnrollOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-teal-600"
        >
          <UserPlus className="h-4 w-4" />
          Enroll patient
        </button>
      </div>

      {/* --------------------------------------------------------- toolbar */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, MRN, phone…"
            className="w-full rounded-xl border border-line bg-white py-2.5 pl-9 pr-12 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            ⌘K
          </kbd>
        </div>

        {/* cohort chips (multi-select) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCohortParams([])}
            className={cn(
              "relative rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
              cohorts.length === 0
                ? "border-teal-500/40 bg-teal-50 text-teal-700"
                : "border-line bg-white text-slate-500 hover:border-slate-300",
            )}
          >
            All <span className="tnum font-mono text-[11px] opacity-70">{totalMonitored}</span>
          </button>
          {cohortMix.map((c) => {
            const active = cohorts.includes(c.cohort);
            return (
              <button
                key={c.cohort}
                type="button"
                onClick={() => toggleCohort(c.cohort)}
                className={cn(
                  "relative rounded-full border px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors",
                  active
                    ? "border-teal-500/40 bg-teal-50 text-teal-700"
                    : "border-line bg-white text-slate-500 hover:border-slate-300",
                )}
              >
                {c.label} <span className="tnum font-mono text-[11px] opacity-70">{c.count}</span>
                {active && (
                  <motion.span
                    layoutId={`cohort-chip-underline-${c.cohort}`}
                    className="absolute inset-x-3 -bottom-[5px] h-0.5 rounded-full bg-teal-500"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select value={risk} onValueChange={(v) => setRisk(v as typeof risk)}>
            <SelectTrigger className="w-[136px] rounded-xl border-line bg-white text-[13px]">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk</SelectItem>
              <SelectItem value="high">High risk</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[156px] rounded-xl border-line bg-white text-[13px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="next">Next call</SelectItem>
              <SelectItem value="risk">Risk</SelectItem>
              <SelectItem value="discharge">Discharge date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ------------------------------------------- active filter chips */}
      <AnimatePresence initial={false}>
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 pt-4">
              {cohorts.map((c) => (
                <FilterChip key={c} label={`Cohort: ${c}`} onRemove={() => toggleCohort(c)} />
              ))}
              {risk !== "all" && <FilterChip label={`Risk: ${risk}`} onRemove={() => setRisk("all")} />}
              {query.trim() && <FilterChip label={`“${query.trim()}”`} onRemove={() => setQuery("")} />}
              <button
                type="button"
                onClick={clearAll}
                className="text-[12px] font-semibold text-teal-600 transition-colors hover:text-teal-700"
              >
                Clear all
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------ table */}
      <div className="mt-4">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            headline="No patients match these filters"
            body="Try widening the cohort or risk selection, or clear the search."
            cta="Clear all filters"
            onCta={clearAll}
            tone="slate"
          />
        ) : (
          <RosterTable
            rows={filtered}
            stagger={stagger}
            onOpen={openDrawer}
            onCallNow={(p) => navigate(`/app/live?patient=${p.id}&autostart=1`)}
          />
        )}
      </div>

      {/* ----------------------------------------------------------- drawer */}
      <AnimatePresence>
        {openPatient && <PatientDrawer key={openPatient.id} patient={openPatient} onClose={closeDrawer} />}
      </AnimatePresence>

      {/* ------------------------------------------------------------ wizard */}
      <EnrollWizard open={enrollOpen} onClose={() => setEnrollOpen(false)} />
    </motion.div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.18 }}
      className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-50 px-2.5 py-1 text-[12px] font-semibold capitalize text-teal-700"
    >
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full p-0.5 hover:bg-teal-500/10">
        <X className="h-3 w-3" />
      </button>
    </motion.span>
  );
}
