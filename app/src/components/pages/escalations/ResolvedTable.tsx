import { Fragment, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { careTeam, patientById } from "@/data/seed";
import type { Escalation } from "@/data/seed";
import { PriorityTag } from "@/components/shared/PriorityTag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function outcomeBadge(outcome: string) {
  const lower = outcome.toLowerCase();
  const classes = lower.includes("ed")
    ? "bg-coral-500/10 text-coral-600"
    : lower.includes("false")
      ? "bg-slate-500/10 text-slate-500"
      : "bg-green-500/10 text-green-700";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold", classes)}>{outcome}</span>
  );
}

function resolvedByAvatar(name: string) {
  const member = careTeam.find((m) => m.name === name);
  return member?.avatar ?? "/avatar-nurse-ruiz.png";
}

/**
 * Resolved view (design §4) — table of resolved escalations; row click
 * expands inline detail with a height animation.
 */
export function ResolvedTable({ items }: { items: Escalation[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-line bg-card shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h4 className="text-base font-semibold text-slate-900">Resolved</h4>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-line hover:bg-transparent">
            <TableHead className="pl-5 font-mono text-[11px] uppercase tracking-wide text-slate-400">ID</TableHead>
            <TableHead className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Patient</TableHead>
            <TableHead className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Priority</TableHead>
            <TableHead className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Resolved by</TableHead>
            <TableHead className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Resolution note</TableHead>
            <TableHead className="font-mono text-[11px] uppercase tracking-wide text-slate-400">Time to resolve</TableHead>
            <TableHead className="pr-5 font-mono text-[11px] uppercase tracking-wide text-slate-400">Outcome</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((esc, i) => {
            const p = patientById(esc.patientId);
            const res = esc.resolution;
            const open = openId === esc.id;
            return (
              <Fragment key={esc.id}>
                <motion.tr
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onClick={() => setOpenId(open ? null : esc.id)}
                  className={cn("cursor-pointer border-line", open && "bg-paper/60")}
                >
                  <TableCell className="tnum pl-5 font-mono text-[12px] font-semibold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
                      {esc.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {p && <img src={p.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />}
                      <span className="text-[13px] font-semibold text-slate-900">{p?.name ?? esc.patientId}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <PriorityTag priority={esc.priority} />
                  </TableCell>
                  <TableCell>
                    {res && (
                      <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
                        <img src={resolvedByAvatar(res.by)} alt="" className="h-5 w-5 rounded-full object-cover" />
                        {res.by}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    <span className="block truncate text-[12px] text-slate-600">{res?.note}</span>
                  </TableCell>
                  <TableCell className="tnum font-mono text-[12px] font-semibold text-slate-700">
                    {res ? `${res.timeToResolveMin} min` : "—"}
                  </TableCell>
                  <TableCell className="pr-5">{res && outcomeBadge(res.outcome)}</TableCell>
                </motion.tr>

                <AnimatePresence initial={false}>
                  {open && (
                    <tr key={`${esc.id}-detail`}>
                      <td colSpan={7} className="border-b border-line p-0">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden bg-paper/50"
                        >
                          <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                Original context
                              </div>
                              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{esc.context}</p>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                Resolution
                              </div>
                              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{res?.note}</p>
                              <p className="mt-1 font-mono text-[11px] text-slate-400">
                                {res?.by} · {res?.timeToResolveMin} min to resolve · {res?.outcome}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
