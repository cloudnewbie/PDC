import { motion } from "framer-motion";
import { Bone, Copy, HeartPulse, MoreHorizontal, Pause, Scissors, Trash2, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import type { Campaign, Cohort } from "@/data/seed";
import { patients } from "@/data/seed";
import { StatusPill } from "@/components/shared/StatusPill";
import { RedFlagChip } from "@/components/shared/RedFlagChip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CadenceTimeline } from "./CadenceTimeline";

export const COHORT_ICONS: Record<Cohort, LucideIcon> = {
  cardiac: HeartPulse,
  ortho: Bone,
  surgical: Scissors,
  copd: Wind,
};

export function CampaignCard({
  campaign,
  index,
  onEdit,
}: {
  campaign: Campaign;
  index: number;
  onEdit: () => void;
}) {
  const Icon = COHORT_ICONS[campaign.cohort];
  const enrolled = patients.filter((p) => p.campaignId === campaign.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col rounded-2xl border border-line bg-white shadow-card transition-colors hover:border-teal-500/50"
    >
      {/* body (click → edit) */}
      <button type="button" onClick={onEdit} className="flex-1 p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-base font-semibold text-slate-900">{campaign.name}</h4>
              <span className="font-mono text-[11px] capitalize text-slate-400">{campaign.cohort} cohort</span>
            </div>
          </div>
          <StatusPill status={campaign.status} />
        </div>

        {/* cadence visual */}
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Cadence</div>
          <CadenceTimeline cadence={campaign.cadence} className="px-1 pb-1" />
        </div>

        {/* stats */}
        <div className="tnum mt-5 grid grid-cols-3 gap-2 rounded-xl bg-paper p-3 text-center">
          <div>
            <div className="font-mono text-lg font-semibold text-slate-900">{campaign.patientsEnrolled}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">patients</div>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold text-slate-900">{campaign.callsPerWeek}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">calls / wk</div>
          </div>
          <div>
            <div className="font-mono text-lg font-semibold text-green-600">{campaign.completionPct}%</div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">completion</div>
          </div>
        </div>

        {/* flags screened */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {campaign.flagsScreened.map((f) => (
            <RedFlagChip key={f} label={f} outline />
          ))}
        </div>
      </button>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-line px-5 py-3">
        <div className="flex items-center">
          {enrolled.slice(0, 5).map((p, i) => (
            <img
              key={p.id}
              src={p.avatar}
              alt={p.name}
              title={p.name}
              className="h-6 w-6 rounded-full object-cover ring-2 ring-white"
              style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 5 - i }}
            />
          ))}
          <span className="ml-2 text-[11px] font-medium text-slate-400">enrolled</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-paper hover:text-teal-700"
          >
            Edit
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-paper hover:text-slate-600">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => toast.info(`${campaign.name} paused`)}>
                <Pause className="mr-2 h-3.5 w-3.5" /> Pause
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast.success(`${campaign.name} duplicated`)}>
                <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-coral-600 focus:text-coral-600" onSelect={() => toast.info(`${campaign.name} archived`)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
