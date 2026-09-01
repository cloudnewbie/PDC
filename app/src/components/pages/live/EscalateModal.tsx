import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Siren, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PriorityTag } from "@/components/shared/PriorityTag";
import { RedFlagChip } from "@/components/shared/RedFlagChip";
import { careTeam, type Patient } from "@/data/seed";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export interface EscalateRequest {
  flagLabel?: string;
}

/**
 * Escalate-to-nurse modal — opens via Framer `layoutId` morph from the
 * header escalate button. Auto-generated context block, editable note,
 * assignee select, success state with check-draw animation.
 */
export function EscalateModal({
  open,
  onClose,
  patient,
  flags,
  contextLine,
  onEscalated,
}: {
  open: boolean;
  onClose: () => void;
  patient: Patient;
  flags: { label: string; confidence: number; tier: "coral" | "amber" }[];
  contextLine: string;
  onEscalated: () => void;
}) {
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState(careTeam[0].id);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (open) {
      setSent(false);
      setNote("");
      setAssignee(careTeam[0].id);
    }
  }, [open]);

  const topFlag = flags.find((f) => f.tier === "coral") ?? flags[0];
  const nurse = careTeam.find((m) => m.id === assignee) ?? careTeam[0];

  const confirm = () => {
    setSent(true);
    onEscalated();
    toast.success(`Escalation created — ${nurse.name} paged`, {
      description: "New item added to the Escalations inbox.",
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            layoutId="escalate-morph"
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-coral-500/30 bg-ink-900 shadow-modal"
          >
            {!sent ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: 0.08 }}
                className="p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-500/15 text-coral-500">
                      <Siren className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-ink-100">Escalate to nurse</h3>
                      <p className="text-[12px] text-ink-400">Creates a P1 escalation and pages the on-call nurse.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityTag priority="P1" />
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* patient summary */}
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-800/60 p-3">
                  <img src={patient.avatar} alt={patient.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-coral-500/30" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink-100">
                      {patient.name} · {patient.age}
                    </div>
                    <div className="truncate text-[12px] text-ink-400">
                      {patient.cohortLabel} · day {patient.dayPost} post-op · {patient.mrn}
                    </div>
                  </div>
                </div>

                {/* flags */}
                {flags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {flags.map((f) => (
                      <RedFlagChip key={f.label} label={f.label} confidence={f.confidence} tier={f.tier} dark />
                    ))}
                  </div>
                )}

                {/* auto context */}
                <div className="mt-4">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    Auto-generated context
                  </div>
                  <pre className="mt-1.5 whitespace-pre-wrap rounded-xl border border-ink-700 bg-ink-950/60 p-3 font-mono text-[12px] leading-relaxed text-ink-100">
                    {contextLine}
                    {topFlag ? `\nAgent confidence ${topFlag.confidence.toFixed(2)}.` : ""}
                  </pre>
                </div>

                {/* note */}
                <div className="mt-4">
                  <label htmlFor="esc-note" className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    Nurse note (optional)
                  </label>
                  <textarea
                    id="esc-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Anything the nurse should know before calling…"
                    className="mt-1.5 w-full resize-none rounded-xl border border-ink-700 bg-ink-950/60 p-3 text-sm text-ink-100 placeholder:text-ink-700 focus:border-coral-500/50 focus:outline-none"
                  />
                </div>

                {/* assignee */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Assign to</span>
                  <div className="flex gap-2">
                    {careTeam.slice(0, 2).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAssignee(m.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-medium transition-colors",
                          assignee === m.id
                            ? "border-coral-500/50 bg-coral-500/10 text-ink-100"
                            : "border-ink-700 text-ink-400 hover:border-ink-400",
                        )}
                      >
                        <img src={m.avatar} alt={m.name} className="h-6 w-6 rounded-full object-cover" />
                        {m.name}
                        {m.onCall && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* actions */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-ink-700 px-4 py-2 text-sm font-semibold text-ink-400 transition-colors hover:border-ink-400 hover:text-ink-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirm}
                    className="rounded-xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_-6px_rgb(244_63_94/.7)] transition-colors hover:bg-coral-600"
                  >
                    Page nurse now
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex flex-col items-center px-6 py-12 text-center"
              >
                <motion.svg viewBox="0 0 64 64" className="h-16 w-16">
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  />
                  <motion.path
                    d="M20 33 L28.5 41.5 L45 24"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, delay: 0.4, ease: EASE }}
                  />
                </motion.svg>
                <h3 className="mt-4 text-base font-semibold text-ink-100">
                  {nurse.name} paged · ETA &lt; 15 min
                </h3>
                <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-400">
                  Escalation <span className="font-mono text-coral-400">ESC-1043</span> is open in the triage inbox.
                  The agent will stay on the line and brief the patient.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 rounded-xl border border-ink-700 px-4 py-2 text-sm font-semibold text-ink-100 transition-colors hover:border-teal-500/50"
                >
                  Return to call
                </button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
