import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { careTeamById, openEscalations, patientById } from "@/data/seed";
import { PriorityTag } from "@/components/shared/PriorityTag";
import { useElapsed } from "./hooks";
import { formatCountdown, slaRemainingSec } from "./sla";

function MiniSla({ openedAgoMin, slaTargetMin }: { openedAgoMin: number; slaTargetMin: number }) {
  const elapsed = useElapsed(1000);
  const remaining = slaRemainingSec(openedAgoMin, slaTargetMin, elapsed);
  const urgent = remaining < 30 * 60;
  return (
    <span
      className={cn(
        "tnum font-mono text-[12px] font-semibold",
        remaining <= 0 ? "text-coral-600" : urgent ? "text-coral-600" : "text-slate-500",
      )}
    >
      {remaining <= 0 ? "breached" : formatCountdown(remaining)}
    </span>
  );
}

/**
 * "Escalations needing you" — top 3 open escalations with live SLA countdowns
 * (coral under 30m) and a hover "Take" button.
 */
export function EscalationsMini() {
  const navigate = useNavigate();
  const top = [...openEscalations]
    .sort((a, b) => a.priority.localeCompare(b.priority) || b.openedAgoMin - a.openedAgoMin)
    .slice(0, 3);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <h4 className="text-base font-semibold text-slate-900">Escalations needing you</h4>
        <span className="tnum ml-auto rounded-full bg-coral-500 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
          {top.length}
        </span>
      </div>

      <div className="flex-1 space-y-2.5 px-4 py-4">
        {top.map((esc, i) => {
          const p = patientById(esc.patientId);
          const assignee = esc.assigneeId ? careTeamById(esc.assigneeId) : undefined;
          return (
            <motion.div
              key={esc.id}
              role="button"
              tabIndex={0}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => navigate(`/app/escalations?id=${esc.id}`)}
              onKeyDown={(e) => e.key === "Enter" && navigate(`/app/escalations?id=${esc.id}`)}
              className={cn(
                "group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-card",
                esc.priority === "P1" && "border-l-2 border-l-coral-500",
              )}
            >
              <PriorityTag priority={esc.priority} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-slate-900">{p?.name}</div>
                <div className="truncate text-[12px] text-slate-500">{esc.context}</div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <MiniSla openedAgoMin={esc.openedAgoMin} slaTargetMin={esc.slaTargetMin} />
                <span className="text-[10px] text-slate-400">{assignee ? assignee.name : "Unassigned"}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success(`${esc.id} assigned to you`, { description: "Nurse Ruiz is now the owner (demo)." });
                }}
                className="hidden shrink-0 rounded-lg bg-teal-500 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-teal-600 group-hover:block"
              >
                Take
              </button>
            </motion.div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate("/app/escalations")}
        className="flex items-center justify-center gap-1.5 border-t border-line py-3 text-[13px] font-semibold text-teal-700 transition-colors hover:bg-teal-50/60"
      >
        Open triage inbox
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
