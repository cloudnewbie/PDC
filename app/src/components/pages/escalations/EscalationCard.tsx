import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Check, Phone, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { careTeam, careTeamById, patientById } from "@/data/seed";
import type { Escalation } from "@/data/seed";
import { PriorityTag } from "@/components/shared/PriorityTag";
import { RedFlagChip } from "@/components/shared/RedFlagChip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { SlaCountdown } from "./SlaCountdown";

/**
 * Open-queue escalation card (design §2): priority + ID + SLA, patient row,
 * 2-line context clamp, flag chips, assignee + quick actions.
 */
export function EscalationCard({
  esc,
  selected,
  onSelect,
  onResolve,
  onAssign,
  flash = false,
}: {
  esc: Escalation;
  selected: boolean;
  onSelect: () => void;
  onResolve: (note: string) => void;
  onAssign: (memberId: string) => void;
  flash?: boolean;
}) {
  const navigate = useNavigate();
  const p = patientById(esc.patientId);
  const assignee = esc.assigneeId ? careTeamById(esc.assigneeId) : undefined;
  const [note, setNote] = useState("");
  const [resolveOpen, setResolveOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  if (!p) return null;

  return (
    <motion.div
      layout="position"
      initial={flash ? { opacity: 0, y: -20, backgroundColor: "rgba(244,63,94,0.10)" } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, backgroundColor: "rgba(244,63,94,0)" }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], backgroundColor: { duration: 1.6 } }}
      onClick={onSelect}
      className={cn(
        "w-full cursor-pointer rounded-2xl border bg-white p-4 text-left shadow-card transition-shadow hover:shadow-modal",
        esc.priority === "P1"
          ? "border-l-2 border-l-coral-500 border-line bg-coral-500/[0.04]"
          : "border-line",
        selected ? "ring-2 ring-teal-500/40" : "ring-0",
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      {/* top row */}
      <div className="flex items-center gap-2">
        <PriorityTag priority={esc.priority} />
        <span className="tnum font-mono text-[12px] font-semibold text-slate-500">{esc.id}</span>
        <span className="ml-auto">
          <SlaCountdown openedAgoMin={esc.openedAgoMin} slaTargetMin={esc.slaTargetMin} />
        </span>
      </div>

      {/* patient row */}
      <div className="mt-3 flex items-center gap-2.5">
        <img src={p.avatar} alt={p.name} className="h-10 w-10 rounded-full object-cover ring-1 ring-line" />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-slate-900">{p.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="rounded-full bg-slate-500/10 px-2 py-px text-[10px] font-semibold text-slate-600">
              {p.cohortLabel.split(" · ")[0]}
            </span>
            <span className="rounded-full bg-teal-50 px-2 py-px font-mono text-[10px] font-semibold text-teal-700">
              Day {p.dayPost}
            </span>
          </div>
        </div>
      </div>

      {/* context */}
      <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-slate-600">{esc.context}</p>

      {/* flags */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {esc.flags.map((f) => (
          <RedFlagChip key={f.label} label={f.label} confidence={f.confidence} tier={f.tier} />
        ))}
      </div>

      {/* footer */}
      <div className="mt-3.5 flex items-center gap-2 border-t border-line pt-3">
        {assignee ? (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
            <img src={assignee.avatar} alt={assignee.name} className="h-5 w-5 rounded-full object-cover" />
            {assignee.name}
          </span>
        ) : (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-700">
            Unassigned
          </span>
        )}

        <span className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/app/live?patient=${p.id}&reason=escalation`)}
            className="flex items-center gap-1.5 rounded-lg bg-teal-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-teal-600"
          >
            <Phone className="h-3 w-3" />
            Call back now
          </button>

          {/* resolve with confirm popover */}
          <Popover open={resolveOpen} onOpenChange={setResolveOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Resolve"
                className="rounded-lg border border-line bg-white p-1.5 text-slate-500 transition-colors hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-600"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <div className="text-[13px] font-semibold text-slate-900">Resolve {esc.id}</div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Resolution note (e.g. callback done — wound checked, surgeon notified)…"
                className="mt-2 min-h-[72px] text-[13px]"
              />
              <button
                type="button"
                onClick={() => {
                  onResolve(note.trim() || "Resolved by Nurse Ruiz");
                  setNote("");
                  setResolveOpen(false);
                }}
                className="mt-2.5 w-full rounded-lg bg-green-500 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-green-600"
              >
                Mark resolved
              </button>
            </PopoverContent>
          </Popover>

          {/* assign */}
          <Popover open={assignOpen} onOpenChange={setAssignOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Assign"
                className="rounded-lg border border-line bg-white p-1.5 text-slate-500 transition-colors hover:border-teal-500/40 hover:bg-teal-50 hover:text-teal-600"
              >
                <UserPlus className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-1.5">
              {careTeam
                .filter((m) => m.id.startsWith("nurse"))
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onAssign(m.id);
                      setAssignOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-paper"
                  >
                    <img src={m.avatar} alt={m.name} className="h-7 w-7 rounded-full object-cover" />
                    <span>
                      <span className="block text-[13px] font-semibold text-slate-900">{m.name}</span>
                      <span className="block text-[11px] text-slate-400">{m.role}</span>
                    </span>
                    {esc.assigneeId === m.id && <Check className="ml-auto h-3.5 w-3.5 text-teal-600" />}
                  </button>
                ))}
            </PopoverContent>
          </Popover>
        </span>
      </div>
    </motion.div>
  );
}
