import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { assetUrl, cn } from "@/lib/utils";
import { careTeam, escalations as seedEscalations } from "@/data/seed";
import type { Escalation } from "@/data/seed";
import { EmptyState } from "@/components/shared/EmptyState";
import { SegmentedControl } from "@/components/pages/dashboard/SegmentedControl";
import { formatAge } from "@/components/pages/dashboard/sla";
import { EscalationCard } from "@/components/pages/escalations/EscalationCard";
import { DetailPane, type Note } from "@/components/pages/escalations/DetailPane";
import { ResolvedTable } from "@/components/pages/escalations/ResolvedTable";

type Filter = "open" | "resolved" | "all";

const PRIORITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2 };

/** Simulated inbound escalation (demo engine) — arrives shortly after mount. */
const INCOMING: Escalation = {
  id: "ESC-1043",
  priority: "P2",
  patientId: "robert-okafor",
  context:
    "24h post-MI check — reported dizziness on standing, resting HR 48 on home monitor. Beta-blocker dose may need review. Agent confidence 0.72.",
  flags: [{ label: "dizziness + bradycardia", confidence: 0.72, tier: "amber" }],
  openedAgoMin: 0,
  slaTargetMin: 240,
  status: "open",
  timeline: [
    { ts: "now", label: "Red flag detected · dizziness + bradycardia (0.72)" },
    { ts: "now", label: "Escalation created by agent" },
    { ts: "now", label: "Awaiting assignment…", pending: true },
  ],
};

const ME = careTeam[0]; // Nurse Ruiz (on-call)

/**
 * Escalations (/app/escalations) — priority triage inbox, per design/escalations.md.
 */
export default function Escalations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [list, setList] = useState<Escalation[]>(seedEscalations);
  const [filter, setFilter] = useState<Filter>("open");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, Note[]>>({
    "ESC-1042": [
      {
        author: "Nurse O'Brien",
        avatar: assetUrl("/avatar-nurse-obrien.png"),
        ts: "09:26",
        text: "Saw the page — I can cover the callback if you're tied up on 3W.",
      },
    ],
  });
  const mountedAt = useRef(Date.now());

  const open = useMemo(
    () =>
      list
        .filter((e) => e.status === "open")
        .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.openedAgoMin - a.openedAgoMin),
    [list],
  );
  const resolved = useMemo(() => list.filter((e) => e.status === "resolved"), [list]);

  // selected escalation — deep link ?id=ESC-1042, else first open
  const selectedId = searchParams.get("id");
  const selected =
    list.find((e) => e.id === selectedId) ?? (selectedId ? undefined : open[0]);

  const select = (id: string) => setSearchParams({ id });

  // a new escalation arrives once, ~22s in (design §2 animation)
  useEffect(() => {
    const t = window.setTimeout(() => {
      setList((prev) => (prev.some((e) => e.id === INCOMING.id) ? prev : [INCOMING, ...prev]));
      setFlashId(INCOMING.id);
      toast.error("Escalation created — ESC-1043 (P2)", {
        description: "R. Okafor · dizziness + bradycardia · awaiting assignment",
      });
      window.setTimeout(() => setFlashId(null), 2000);
    }, 22000);
    return () => window.clearTimeout(t);
  }, []);

  /* ------------------------------------------------------------ actions */

  const patchEsc = (id: string, patch: Partial<Escalation>) =>
    setList((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const pushTimeline = (id: string, label: string) =>
    setList((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const tl = [...e.timeline];
        const last = tl[tl.length - 1];
        const entry = { ts: "now", label };
        if (last?.pending) tl.splice(tl.length - 1, 0, entry);
        else tl.push(entry);
        return { ...e, timeline: tl };
      }),
    );

  const resolveEsc = (id: string, note: string) => {
    const before = list.find((e) => e.id === id);
    if (!before) return;
    const elapsedMin = Math.floor((Date.now() - mountedAt.current) / 60000);
    patchEsc(id, {
      status: "resolved",
      resolution: {
        by: ME.name,
        note,
        timeToResolveMin: before.openedAgoMin + Math.max(1, elapsedMin),
        outcome: "Callback done",
      },
    });
    if (selectedId === id) setSearchParams({});
    toast.success(`${id} resolved`, {
      description: note,
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () =>
          patchEsc(id, { status: "open", resolution: undefined }),
      },
    });
  };

  const addNote = (id: string, text: string) =>
    setNotes((prev) => ({
      ...prev,
      [id]: [
        ...(prev[id] ?? []),
        { author: ME.name, avatar: ME.avatar, ts: "now", text },
      ],
    }));

  /* ------------------------------------------------------------- header */

  const oldestP1 = open.filter((e) => e.priority === "P1").sort((a, b) => b.openedAgoMin - a.openedAgoMin)[0];
  const counts = {
    P1: open.filter((e) => e.priority === "P1").length,
    P2: open.filter((e) => e.priority === "P2").length,
    P3: open.filter((e) => e.priority === "P3").length,
  };
  // pulse while any open P1 is unassigned or still awaiting acknowledgment
  const p1NeedsAttention = open.some(
    (e) => e.priority === "P1" && (!e.assigneeId || e.timeline[e.timeline.length - 1]?.pending),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-[1400px] p-6 lg:p-8"
    >
      {/* ------------------------------------------ Section 1: header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="min-w-0">
          <h3 className="text-2xl font-semibold tracking-[-0.01em] text-slate-900">Escalations</h3>
          <p className="mt-1 text-[13px] font-medium text-slate-500">
            {open.length} open
            {oldestP1 && (
              <>
                {" "}
                · oldest P1 opened{" "}
                <span className="font-semibold text-coral-600">{formatAge(oldestP1.openedAgoMin)}</span>
              </>
            )}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* summary chips */}
          <motion.span
            animate={p1NeedsAttention ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
            transition={p1NeedsAttention ? { duration: 2.2, repeat: Infinity } : undefined}
            className="tnum inline-flex items-center gap-1 rounded-full bg-coral-500 px-2.5 py-1 font-mono text-[11px] font-bold text-white"
          >
            P1 ×{counts.P1}
          </motion.span>
          <span className="tnum inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 font-mono text-[11px] font-bold text-white">
            P2 ×{counts.P2}
          </span>
          <span className="tnum inline-flex items-center gap-1 rounded-full bg-slate-400 px-2.5 py-1 font-mono text-[11px] font-bold text-white">
            P3 ×{counts.P3}
          </span>
          <span
            key={resolved.length}
            className="tnum inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1 font-mono text-[11px] font-bold text-white"
          >
            Resolved today ×{resolved.length}
          </span>

          <SegmentedControl
            id="esc-filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: "Open" },
              { value: "resolved", label: "Resolved" },
              { value: "all", label: "All" },
            ]}
            className="ml-2"
          />
        </div>
      </motion.div>

      {/* ------------------------------------------- body */}
      {(filter === "open" || filter === "all") && (
        <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
          {/* open queue (independent scroll) */}
          <div className="scroll-thin space-y-3.5 xl:max-h-[calc(100dvh-180px)] xl:overflow-y-auto xl:pr-1">
            <AnimatePresence initial={true}>
              {open.map((esc, i) => (
                <motion.div
                  key={esc.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <EscalationCard
                    esc={esc}
                    selected={selected?.id === esc.id}
                    flash={flashId === esc.id}
                    onSelect={() => select(esc.id)}
                    onResolve={(note) => resolveEsc(esc.id, note)}
                    onAssign={(memberId) => {
                      patchEsc(esc.id, { assigneeId: memberId });
                      const m = careTeam.find((c) => c.id === memberId);
                      pushTimeline(esc.id, `Assigned to ${m?.name ?? memberId}`);
                      toast.success(`${esc.id} assigned to ${m?.name}`);
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {open.length === 0 && (
              <EmptyState
                icon={ShieldCheck}
                tone="green"
                headline="Queue clear"
                body="The agent is monitoring 18 patients. You'll be paged here the moment something needs a human."
                className="border-green-500/30"
              />
            )}
          </div>

          {/* detail pane (sticky) */}
          <div className={cn("xl:sticky xl:top-20 xl:self-start", open.length === 0 && "hidden xl:block")}>
            {selected ? (
              <DetailPane
                esc={selected}
                notes={notes[selected.id] ?? []}
                onChange={(patch) => patchEsc(selected.id, patch)}
                onTimeline={(label) => pushTimeline(selected.id, label)}
                onResolve={(note) => resolveEsc(selected.id, note)}
                onAddNote={(text) => addNote(selected.id, text)}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center text-[13px] text-slate-400">
                Select an escalation to see its context, timeline, and actions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* resolved table — sole view for "Resolved", appended for "All" */}
      {(filter === "resolved" || filter === "all") && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={cn(filter === "all" ? "mt-6" : "mt-6")}
        >
          <ResolvedTable items={resolved} />
        </motion.div>
      )}
    </motion.div>
  );
}
