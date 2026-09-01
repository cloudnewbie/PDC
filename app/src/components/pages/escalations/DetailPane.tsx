import { useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, CalendarClock, Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { callById, careTeam, careTeamById, patientById } from "@/data/seed";
import type { Escalation, Priority } from "@/data/seed";
import { TranscriptBubble } from "@/components/shared/TranscriptBubble";
import { PriorityTag } from "@/components/shared/PriorityTag";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SlaCountdown } from "./SlaCountdown";

export interface Note {
  author: string;
  avatar: string;
  ts: string;
  text: string;
}

interface Bubble {
  speaker: "agent" | "patient";
  text: string;
  ts?: string;
  flagQuote?: string;
}

/** Triggering transcript excerpt (2–3 bubbles) derived from the call record. */
function transcriptFor(esc: Escalation): { bubbles: Bubble[]; callId?: string } {
  const call = callById(esc.id.replace("ESC", "call"));
  if (!call || call.flags.every((f) => !f.quote)) return { bubbles: [] };
  const quoted = call.flags.filter((f) => f.quote);
  const bubbles: Bubble[] = [];
  quoted.forEach((f, i) => {
    if (i > 0) {
      bubbles.push({ speaker: "agent", text: "Thank you for telling me — I'm noting that down for your care team.", ts: call.startedAt });
    }
    bubbles.push({ speaker: "patient", text: f.quote as string, ts: call.startedAt, flagQuote: f.quote });
  });
  bubbles.push({
    speaker: "agent",
    text: "I've flagged this for your nurse — they'll call you back shortly. Is there anything else worrying you?",
    ts: call.startedAt,
  });
  return { bubbles: bubbles.slice(0, 3), callId: call.id };
}

function Card({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-card shadow-card", className)}>
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h4 className="text-[15px] font-semibold text-slate-900">{title}</h4>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

/**
 * Sticky detail pane (design §3): context + transcript excerpt, timeline,
 * actions, and nurse notes. Content crossfades on selection change.
 */
export function DetailPane({
  esc,
  notes,
  onChange,
  onTimeline,
  onResolve,
  onAddNote,
}: {
  esc: Escalation;
  notes: Note[];
  onChange: (patch: Partial<Escalation>) => void;
  onTimeline: (label: string) => void;
  onResolve: (note: string) => void;
  onAddNote: (text: string) => void;
}) {
  const navigate = useNavigate();
  const p = patientById(esc.patientId);
  const { bubbles, callId } = transcriptFor(esc);
  const assignee = esc.assigneeId ? careTeamById(esc.assigneeId) : undefined;
  const [cbWhen, setCbWhen] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

  if (!p) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={esc.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-5"
      >
        {/* ---------------------------------------------- context card */}
        <Card
          title="Auto-generated context"
          action={<SlaCountdown openedAgoMin={esc.openedAgoMin} slaTargetMin={esc.slaTargetMin} />}
        >
          <div className="flex items-center gap-2.5">
            <img src={p.avatar} alt={p.name} className="h-9 w-9 rounded-full object-cover ring-1 ring-line" />
            <div>
              <div className="text-[14px] font-semibold text-slate-900">{p.name}</div>
              <div className="font-mono text-[11px] text-slate-400">
                {p.mrn} · {p.cohortLabel} · Day {p.dayPost}
              </div>
            </div>
            <PriorityTag priority={esc.priority} className="ml-auto" />
          </div>

          <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-line bg-paper p-3 font-mono text-[12px] leading-relaxed text-slate-700">
            {esc.context}
          </pre>

          {bubbles.length > 0 ? (
            <div className="mt-3 space-y-2.5 rounded-xl border border-line bg-paper/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Triggering transcript excerpt
              </div>
              {bubbles.map((b, i) => (
                <TranscriptBubble key={i} speaker={b.speaker} text={b.text} timestamp={b.ts} flagQuote={b.flagQuote} />
              ))}
              {callId && (
                <button
                  type="button"
                  onClick={() => navigate(`/app/results?id=${callId}`)}
                  className="flex items-center gap-1 pt-1 text-[12px] font-semibold text-teal-700 hover:underline"
                >
                  Open full call
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-line bg-paper/60 px-3 py-2.5 text-[12px] text-slate-500">
              No transcript — the call never connected. Last successful contact is shown in the patient record.
            </p>
          )}
        </Card>

        {/* ---------------------------------------------- timeline card */}
        <Card title="Timeline">
          <ol className="relative ml-1.5 space-y-4">
            {/* connecting line draws on mount */}
            <motion.span
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-2 left-[5px] top-2 w-px origin-top bg-line"
              aria-hidden
            />
            {esc.timeline.map((t, i) => (
              <motion.li
                key={`${t.ts}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.08 + i * 0.08 }}
                className="relative flex items-start gap-3 pl-5"
              >
                <span
                  className={cn(
                    "absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2",
                    t.pending
                      ? "animate-pulse-dot border-coral-500 bg-coral-100"
                      : "border-teal-500 bg-teal-50",
                  )}
                />
                <span className="tnum w-20 shrink-0 pt-px font-mono text-[11px] text-slate-400">{t.ts}</span>
                <span className={cn("text-[13px] leading-snug", t.pending ? "font-medium text-coral-600" : "text-slate-700")}>
                  {t.label}
                </span>
              </motion.li>
            ))}
          </ol>
        </Card>

        {/* ----------------------------------------------- actions card */}
        <Card title="Actions">
          <div className="space-y-4">
            {/* assignee */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Assignee
              </label>
              <Select
                value={esc.assigneeId ?? "unassigned"}
                onValueChange={(v) => {
                  if (v === "unassigned") {
                    onChange({ assigneeId: undefined });
                  } else {
                    onChange({ assigneeId: v });
                    const m = careTeamById(v);
                    onTimeline(`Assigned to ${m?.name ?? v}`);
                    toast.success(`${esc.id} assigned to ${m?.name}`);
                  }
                }}
              >
                <SelectTrigger className="h-9 rounded-xl border-line text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {careTeam
                    .filter((m) => m.id.startsWith("nurse"))
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          <img src={m.avatar} alt="" className="h-5 w-5 rounded-full object-cover" />
                          {m.name}
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {assignee && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Currently with {assignee.name} · {assignee.role}
                </p>
              )}
            </div>

            {/* priority override */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Priority override
              </label>
              <Select
                value={esc.priority}
                onValueChange={(v) => {
                  onChange({ priority: v as Priority });
                  onTimeline(`Priority changed to ${v} by Nurse Ruiz`);
                  toast(`Priority override — ${esc.id} now ${v}`, { description: "Logged to the audit trail." });
                }}
              >
                <SelectTrigger className="h-9 w-36 rounded-xl border-line text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1 — urgent</SelectItem>
                  <SelectItem value="P2">P2 — same day</SelectItem>
                  <SelectItem value="P3">P3 — routine</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-slate-400">Priority changes are logged to the audit trail.</p>
            </div>

            {/* callback scheduler */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Schedule callback
              </label>
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={cbWhen}
                  onChange={(e) => setCbWhen(e.target.value)}
                  className="h-9 rounded-xl border-line font-mono text-[12px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!cbWhen) {
                      toast.error("Pick a date & time first");
                      return;
                    }
                    const label = `Callback scheduled for ${cbWhen.replace("T", " · ")}`;
                    onTimeline(label);
                    toast.success("Callback scheduled — added to today's queue", { description: `${p.name} · ${cbWhen.replace("T", " ")}` });
                    setCbWhen("");
                  }}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-teal-500 px-3 text-[12px] font-bold text-white transition-colors hover:bg-teal-600"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Schedule
                </button>
              </div>
            </div>

            {/* resolution panel */}
            <div className="rounded-xl border border-green-500/25 bg-green-500/[0.04] p-3">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-green-700">
                Resolution
              </label>
              <Textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="What was done? e.g. Callback done — wound checked, surgeon notified…"
                className="min-h-[68px] border-line bg-white text-[13px]"
              />
              <button
                type="button"
                onClick={() => {
                  onResolve(resolveNote.trim() || "Resolved by Nurse Ruiz");
                  setResolveNote("");
                }}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-500 py-2 text-[13px] font-bold text-white transition-colors hover:bg-green-600"
              >
                <Check className="h-4 w-4" />
                Resolve {esc.id}
              </button>
            </div>
          </div>
        </Card>

        {/* ----------------------------------------------- nurse notes */}
        <Card title={`Nurse notes${notes.length > 0 ? ` · ${notes.length}` : ""}`}>
          <div className="space-y-3">
            {notes.length === 0 && (
              <p className="text-[12px] text-slate-400">No notes yet — start the thread for the care team.</p>
            )}
            {notes.map((n, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <img src={n.avatar} alt={n.author} className="mt-0.5 h-6 w-6 rounded-full object-cover" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12px] font-semibold text-slate-900">{n.author}</span>
                    <span className="tnum font-mono text-[10px] text-slate-400">{n.ts}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{n.text}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && noteDraft.trim()) {
                    onAddNote(noteDraft.trim());
                    setNoteDraft("");
                  }
                }}
                placeholder="Add a note for the care team…"
                className="h-9 rounded-xl border-line text-[13px]"
              />
              <button
                type="button"
                onClick={() => {
                  if (!noteDraft.trim()) return;
                  onAddNote(noteDraft.trim());
                  setNoteDraft("");
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white transition-colors hover:bg-teal-600"
                aria-label="Post note"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
