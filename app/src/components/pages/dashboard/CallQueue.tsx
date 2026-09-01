import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowUpRight, CalendarClock, Phone, PhoneMissed } from "lucide-react";
import { cn } from "@/lib/utils";
import { patientById, todayQueue } from "@/data/seed";
import type { CallStatus, Patient, QueueRow } from "@/data/seed";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CADENCE_LABEL: Record<string, string> = {
  "24h": "24h",
  "48h": "48h",
  "72h": "72h",
  day7: "Day 7",
  day14: "Day 14",
};

type Filter = "all" | "scheduled" | "done" | "flagged";

const SIM_SCRIPT: { callId: string; to: CallStatus; toast: string; toastTone?: "success" | "error" }[] = [
  { callId: "call-1043", to: "in_progress", toast: "Call connected to R. Okafor — 24h check-in" },
  { callId: "call-1043", to: "completed", toast: "Call completed → R. Okafor · 4m 12s · no flags", toastTone: "success" },
  { callId: "call-1044", to: "in_progress", toast: "Call connected to L. Vargas — Day 7 check-in" },
  { callId: "call-1039", to: "scheduled", toast: "Retry scheduled → F. Doyle · 11:00" },
  { callId: "call-1044", to: "completed", toast: "Call completed → L. Vargas · 3m 05s · no flags", toastTone: "success" },
];

const ESC_FOR_PATIENT: Record<string, string> = {
  "margaret-ellis": "ESC-1042",
  "james-whitfield": "ESC-1041",
  "frank-doyle": "ESC-1039",
};

/* -------------------------------------------------- patient peek drawer */

function PatientDrawer({ patient, onClose }: { patient: Patient | null; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Sheet open={!!patient} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[380px] overflow-y-auto bg-white sm:max-w-[380px]">
        {patient && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <img src={patient.avatar} alt={patient.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-line" />
                <div>
                  <SheetTitle className="text-left text-lg">{patient.name}</SheetTitle>
                  <p className="font-mono text-[11px] text-slate-400">
                    {patient.mrn} · {patient.age}{patient.sex} · Day {patient.dayPost}
                  </p>
                </div>
              </div>
            </SheetHeader>
            <div className="mt-5 space-y-4 px-1 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {patient.cohortLabel}
                </span>
                <RiskBadge level={patient.riskLevel} />
                <StatusPill status={patient.status} />
              </div>
              <div className="rounded-xl border border-line bg-paper p-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Procedure</div>
                <p className="mt-1 text-sm text-slate-900">{patient.procedure}</p>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Discharged {patient.discharged} · risk{" "}
                  <span className="tnum font-mono font-semibold text-slate-900">{patient.riskScore.toFixed(2)}</span>
                </p>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Medications</div>
                <div className="space-y-2">
                  {patient.medications.map((m) => (
                    <div key={m.name} className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2">
                      <div>
                        <div className="text-[13px] font-semibold text-slate-900">
                          {m.name} <span className="font-mono text-[11px] font-normal text-slate-400">{m.dose}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{m.schedule}</div>
                      </div>
                      <span
                        className={cn(
                          "tnum font-mono text-[12px] font-semibold",
                          m.adherence >= 90 ? "text-green-600" : m.adherence >= 75 ? "text-amber-600" : "text-coral-600",
                        )}
                      >
                        {m.adherence}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {patient.lastCall && (
                <div className="rounded-xl border border-line bg-paper p-3">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Last call</div>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{patient.lastCall.when}</p>
                  <p className="mt-0.5 text-[13px] text-slate-700">{patient.lastCall.outcome}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate("/app/patients")}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-white py-2 text-[13px] font-semibold text-teal-700 transition-colors hover:bg-teal-50"
              >
                Open full patient record
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------ queue card */

export function CallQueue() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<QueueRow[]>(todayQueue);
  const [filter, setFilter] = useState<Filter>("all");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [peekId, setPeekId] = useState<string | null>(null);
  const simIdx = useRef(0);

  // every 8s a simulated event updates a row (design §4a)
  useEffect(() => {
    const t = window.setInterval(() => {
      const step = SIM_SCRIPT[simIdx.current % SIM_SCRIPT.length];
      simIdx.current += 1;
      setRows((prev) => prev.map((r) => (r.callId === step.callId ? { ...r, status: step.to } : r)));
      setFlashId(step.callId);
      if (step.toastTone === "success") toast.success(step.toast);
      else toast(step.toast);
      window.setTimeout(() => setFlashId((f) => (f === step.callId ? null : f)), 900);
    }, 8000);
    return () => window.clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      if (filter === "all") return true;
      if (filter === "scheduled") return r.status === "scheduled" || r.status === "in_progress";
      if (filter === "done") return r.status === "completed" || r.status === "missed" || r.status === "failed";
      return r.status === "escalated";
    });
  }, [rows, filter]);

  const peek = peekId ? (patientById(peekId) ?? null) : null;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card shadow-card">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <h4 className="text-base font-semibold text-slate-900">Today's call queue</h4>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-teal-700">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-teal-500" />
          Live
        </span>
        <div className="ml-auto">
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="h-8 w-[136px] rounded-lg border-line text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={PhoneMissed}
            headline="No calls scheduled"
            body="Nothing matches this filter right now. Enroll a patient to start automated check-ins."
            cta="Enroll a patient"
            onCta={() => navigate("/app/patients")}
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-line hover:bg-transparent">
              <TableHead className="pl-5 font-mono text-[11px] uppercase tracking-wide text-slate-400">Time</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Patient</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Cadence</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Risk</TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Status</TableHead>
              <TableHead className="pr-5 text-right font-mono text-[11px] uppercase tracking-wide text-slate-400">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence initial={true}>
              {visible.map((row, i) => {
                const p = patientById(row.patientId);
                if (!p) return null;
                const inProgress = row.status === "in_progress";
                const flashed = flashId === row.callId;
                return (
                  <motion.tr
                    key={row.callId}
                    layout="position"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      backgroundColor: flashed
                        ? ["rgba(240,253,250,0)", "rgba(240,253,250,1)", "rgba(240,253,250,0)"]
                        : "rgba(240,253,250,0)",
                    }}
                    transition={{
                      opacity: { duration: 0.3, delay: i * 0.04 },
                      x: { duration: 0.3, delay: i * 0.04 },
                      backgroundColor: { duration: 0.9 },
                    }}
                    className={cn("group border-line", inProgress && "bg-teal-50/70 hover:bg-teal-50")}
                  >
                    <TableCell className="tnum pl-5 font-mono text-[13px] font-medium text-slate-900">{row.time}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <img src={p.avatar} alt={p.name} className="h-8 w-8 rounded-full object-cover ring-1 ring-line" />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setPeekId(p.id)}
                            className="block truncate text-[13px] font-semibold text-slate-900 hover:text-teal-700 hover:underline"
                          >
                            {p.name}
                          </button>
                          <span className="block truncate text-[11px] text-slate-400">{p.cohortLabel.split(" · ")[0]}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md bg-slate-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                        {CADENCE_LABEL[row.cadence] ?? row.cadence}
                      </span>
                    </TableCell>
                    <TableCell>
                      <RiskBadge level={p.riskLevel} />
                    </TableCell>
                    <TableCell>
                      <StatusPill status={row.status} />
                      {row.status === "missed" && (
                        <span className="ml-1.5 font-mono text-[11px] text-amber-600">retry 11:00</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* primary contextual action */}
                        {inProgress && (
                          <button
                            type="button"
                            onClick={() => navigate("/app/live")}
                            className="rounded-lg bg-teal-500 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-teal-600"
                          >
                            Open console
                          </button>
                        )}
                        {row.status === "escalated" && (
                          <button
                            type="button"
                            onClick={() => navigate(`/app/escalations?id=${ESC_FOR_PATIENT[p.id] ?? ""}`)}
                            className="rounded-lg bg-coral-500 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-coral-600"
                          >
                            View escalation
                          </button>
                        )}
                        {row.status === "completed" && (
                          <button
                            type="button"
                            onClick={() => navigate(`/app/results?id=${row.callId}`)}
                            className="rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-paper"
                          >
                            Result
                          </button>
                        )}
                        {/* hover quick actions */}
                        <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <button
                            type="button"
                            title="Call now"
                            onClick={() => navigate(`/app/live?patient=${p.id}`)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Reschedule"
                            onClick={() => toast(`Reschedule — ${p.firstName} ${p.name.split(" ")[1]}`, { description: "Pick a new slot in the campaign calendar (demo)." })}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Open patient"
                            onClick={() => navigate("/app/patients")}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-teal-50 hover:text-teal-600"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      )}

      <PatientDrawer patient={peek} onClose={() => setPeekId(null)} />
    </div>
  );
}
