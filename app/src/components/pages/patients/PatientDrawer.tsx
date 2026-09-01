import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  FileText,
  MoreHorizontal,
  Phone,
  PhoneMissed,
  Siren,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CallRecord, Patient } from "@/data/seed";
import { callRecords, campaigns, careTeam, escalations } from "@/data/seed";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { RedFlagChip } from "@/components/shared/RedFlagChip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

type TabId = "timeline" | "medications" | "notes";
const TABS: { id: TabId; label: string }[] = [
  { id: "timeline", label: "Timeline" },
  { id: "medications", label: "Medications" },
  { id: "notes", label: "Notes" },
];

const CADENCE_LABEL: Record<string, string> = {
  "24h": "24h",
  "48h": "48h",
  "72h": "72h",
  day7: "Day 7",
  day14: "Day 14",
};

function fmtDuration(sec?: number) {
  if (!sec) return null;
  return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
}

/* ------------------------------------------------------------ notes seed */
interface Note {
  id: string;
  authorId: string;
  ts: string;
  text: string;
}

const NOTES: Record<string, Note[]> = {
  "margaret-ellis": [
    {
      id: "n1",
      authorId: "dr-chen",
      ts: "Mar 8 · 14:20",
      text: "Daughter is primary contact if unreachable after 2 attempts. Hard of hearing — agent should speak slowly.",
    },
    {
      id: "n2",
      authorId: "nurse-ruiz",
      ts: "Today · 09:26",
      text: "Reviewing wound-photo request from 72h call. Will callback within the hour per P1 protocol.",
    },
  ],
  "james-whitfield": [
    {
      id: "n1",
      authorId: "dr-chen",
      ts: "Mar 7 · 16:05",
      text: "Fluid protocol: escalate any weight gain >1.5 kg over 3 days. Wife manages medications — include her in callbacks.",
    },
  ],
  "robert-okafor": [
    {
      id: "n1",
      authorId: "nurse-obrien",
      ts: "Mar 9 · 18:40",
      text: "Post-PCI, first night home. Reinforced dual antiplatelet importance at discharge — confirm clopidogrel on every call.",
    },
  ],
};

/* ---------------------------------------------------- timeline building */

interface TimelineItem {
  id: string;
  kind: "call" | "escalation" | "missed" | "enrollment";
  when: string;
  call?: CallRecord;
  escalationId?: string;
  escalationPriority?: string;
  text?: string;
}

function buildTimeline(p: Patient): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const c of callRecords.filter((c) => c.patientId === p.id)) {
    if (c.status === "scheduled") continue;
    items.push({
      id: c.id,
      kind: c.status === "missed" || c.status === "failed" ? "missed" : "call",
      when: c.scheduledFor,
      call: c,
    });
  }
  for (const e of escalations.filter((e) => e.patientId === p.id)) {
    items.push({
      id: e.id,
      kind: "escalation",
      when: e.status === "open" ? "Active" : "Resolved",
      escalationId: e.id,
      escalationPriority: e.priority,
      text: e.context,
    });
  }
  const campaign = campaigns.find((c) => c.id === p.campaignId);
  items.push({
    id: "enrolled",
    kind: "enrollment",
    when: new Date(p.discharged + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    text: `Enrolled by Dr. Chen · campaign: ${campaign?.name ?? "—"}`,
  });
  return items;
}

/* -------------------------------------------------------- call card */

function CallCard({ item, index }: { item: TimelineItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const c = item.call!;
  const duration = fmtDuration(c.durationSec);
  const chips = (c.outcome ?? "").split("·").map((s) => s.trim()).filter(Boolean);
  const json = useMemo(() => {
    const payload = c.extraction ?? {
      outcome: { value: c.outcome ?? "—", confidence: 1 },
      ...(c.riskAfter !== undefined
        ? { risk_score: { value: `${c.riskAfter.toFixed(2)}${c.riskBefore !== undefined && c.riskAfter > c.riskBefore ? " ↑" : ""}`, confidence: 0.9 } }
        : {}),
      ...(c.sentiment ? { sentiment: { value: c.sentiment, confidence: 0.8 } } : {}),
    };
    return JSON.stringify(payload, null, 2);
  }, [c]);

  const tone =
    item.kind === "missed"
      ? "border-amber-500/40 bg-amber-500/5"
      : c.status === "escalated"
        ? "border-coral-500/40 bg-coral-500/5"
        : "border-line bg-white";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay: 0.08 + index * 0.05 }}
      className={cn("relative rounded-xl border p-3.5", tone)}
    >
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-start justify-between gap-2 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-slate-900">{c.scheduledFor}</span>
            <span className="rounded-md bg-slate-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">
              {CADENCE_LABEL[c.cadence]}
            </span>
            {duration && <span className="tnum font-mono text-[11px] text-slate-400">{duration}</span>}
            {item.kind === "missed" && <PhoneMissed className="h-3.5 w-3.5 text-amber-500" />}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span key={chip} className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {chip}
              </span>
            ))}
            {c.flags.map((f) => (
              <RedFlagChip key={f.label} label={f.label} confidence={f.confidence} tier={f.tier} />
            ))}
          </div>
        </div>
        <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <pre className="scroll-thin mt-3 max-h-44 overflow-auto rounded-lg bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-ink-100">
              {json}
            </pre>
            <Link
              to={`/app/results?id=${c.id}`}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-teal-600 hover:text-teal-700"
            >
              View result →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      {!expanded && c.status !== "missed" && c.status !== "failed" && (
        <Link
          to={`/app/results?id=${c.id}`}
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-teal-600 hover:text-teal-700"
        >
          View result →
        </Link>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------ drawer */

export function PatientDrawer({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const [tab, setTab] = useState<TabId>("timeline");
  const navigate = useNavigate();
  const timeline = useMemo(() => buildTimeline(patient), [patient]);
  const [notes, setNotes] = useState<Note[]>(NOTES[patient.id] ?? []);
  const [draft, setDraft] = useState("");
  const nurse = careTeam[0];

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    setNotes((ns) => [{ id: `n-${Date.now()}`, authorId: nurse.id, ts: "Just now", text }, ...ns]);
    setDraft("");
    toast.success("Note added");
  };

  return (
    <>
      {/* overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-ink-950/30 backdrop-blur-[2px]"
      />
      {/* panel */}
      <motion.aside
        initial={{ x: 480 }}
        animate={{ x: 0 }}
        exit={{ x: 480 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-line bg-white shadow-modal"
      >
        {/* header */}
        <div className="border-b border-line p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <motion.img
                layoutId={`patient-avatar-${patient.id}`}
                src={patient.avatar}
                alt={patient.name}
                className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-line"
              />
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold tracking-[-0.01em] text-slate-900">{patient.name}</h3>
                <div className="mt-0.5 font-mono text-xs text-slate-400">
                  {patient.age}y {patient.sex} · {patient.mrn}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {patient.cohortLabel}
                  </span>
                  <RiskBadge level={patient.riskLevel} />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-paper hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* actions */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/app/live?patient=${patient.id}&autostart=1`)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
            >
              <Phone className="h-4 w-4" />
              Call now
            </button>
            <button
              type="button"
              onClick={() => toast.success(`Next call rescheduled for ${patient.name.split(" ")[0]}`)}
              className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-paper"
            >
              <CalendarClock className="h-4 w-4" />
              Schedule
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-xl border border-line bg-white p-2.5 text-slate-500 transition-colors hover:bg-paper">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => toast.info("Edit patient — demo")}>Edit details</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => toast.info(`Monitoring paused for ${patient.firstName}`)}>
                  Pause monitoring
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-coral-600 focus:text-coral-600"
                  onSelect={() => {
                    if (window.confirm(`Discharge ${patient.name} from the program? This stops all scheduled calls.`)) {
                      toast.success(`${patient.firstName} discharged from program`);
                      onClose();
                    }
                  }}
                >
                  Discharge from program
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-line px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative px-3 py-2.5 text-[13px] font-semibold transition-colors",
                tab === t.id ? "text-teal-700" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {t.label}
              {tab === t.id && (
                <motion.span
                  layoutId="drawer-tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal-500"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* body */}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait" initial={false}>
            {tab === "timeline" && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="relative space-y-3 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-line"
              >
                {timeline.map((item, i) => (
                  <div key={item.id} className="relative pl-5">
                    <span
                      className={cn(
                        "absolute left-0 top-4 h-[11px] w-[11px] rounded-full border-2 border-white",
                        item.kind === "escalation"
                          ? "bg-coral-500"
                          : item.kind === "missed"
                            ? "bg-amber-500"
                            : item.kind === "enrollment"
                              ? "bg-violet-500"
                              : "bg-teal-500",
                      )}
                    />
                    {item.kind === "call" || item.kind === "missed" ? (
                      <CallCard item={item} index={i} />
                    ) : item.kind === "escalation" ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: EASE, delay: 0.08 + i * 0.05 }}
                      >
                        <Link
                          to={`/app/escalations?id=${item.escalationId}`}
                          className="block rounded-xl border border-coral-500/40 bg-coral-500/5 p-3.5 transition-colors hover:bg-coral-500/10"
                        >
                          <div className="flex items-center gap-2">
                            <Siren className="h-3.5 w-3.5 text-coral-500" />
                            <span className="font-mono text-[11px] font-bold text-coral-600">
                              {item.escalationId} · {item.escalationPriority} · {item.when}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-600">{item.text}</p>
                        </Link>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: EASE, delay: 0.08 + i * 0.05 }}
                        className="flex items-center gap-2.5 rounded-xl border border-dashed border-line bg-paper p-3.5"
                      >
                        <UserCheck className="h-4 w-4 shrink-0 text-violet-500" />
                        <div>
                          <div className="text-[12px] font-medium text-slate-700">{item.text}</div>
                          <div className="mt-0.5 font-mono text-[10px] text-slate-400">{item.when}</div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {tab === "medications" && (
              <motion.div
                key="medications"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="space-y-2.5"
              >
                {patient.medications.map((m, i) => {
                  const warn = m.adherence < 75;
                  return (
                    <motion.div
                      key={m.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: EASE, delay: i * 0.05 }}
                      className={cn(
                        "rounded-xl border p-3.5",
                        warn ? "border-amber-500/40 bg-amber-500/5" : "border-line bg-white",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {m.name} <span className="font-normal text-slate-500">{m.dose}</span>
                        </div>
                        <span className="tnum font-mono text-xs font-semibold text-slate-600">{m.adherence}%</span>
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-400">{m.schedule}</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          className={cn("h-full rounded-full", warn ? "bg-amber-500" : "bg-teal-500")}
                          initial={{ width: 0 }}
                          animate={{ width: `${m.adherence}%` }}
                          transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.05 }}
                        />
                      </div>
                      {warn && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-700" title="2 missed doses reported on last call">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {m.note ?? "2 missed doses reported on last call"}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {tab === "notes" && (
              <motion.div
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex min-h-full flex-col"
              >
                <div className="flex-1 space-y-3">
                  {notes.length === 0 && (
                    <div className="rounded-xl border border-dashed border-line bg-paper p-6 text-center text-[13px] text-slate-400">
                      <FileText className="mx-auto mb-2 h-5 w-5" />
                      No care-team notes yet.
                    </div>
                  )}
                  {notes.map((n, i) => {
                    const author = careTeam.find((m) => m.id === n.authorId) ?? nurse;
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: EASE, delay: i * 0.05 }}
                        className="flex gap-3 rounded-xl border border-line bg-white p-3.5"
                      >
                        <img src={author.avatar} alt={author.name} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-line" />
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[13px] font-semibold text-slate-900">{author.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">{n.ts}</span>
                          </div>
                          <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{n.text}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* composer */}
                <div className="sticky bottom-0 mt-4 rounded-xl border border-line bg-white p-3 shadow-card">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add a care-team note…"
                    rows={2}
                    className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") addNote();
                    }}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <ClipboardList className="h-3 w-3" /> Visible to the whole care team
                    </span>
                    <button
                      type="button"
                      onClick={addNote}
                      disabled={!draft.trim()}
                      className="rounded-lg bg-teal-500 px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-40"
                    >
                      Add note
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
}
