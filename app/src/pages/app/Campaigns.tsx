import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { campaigns } from "@/data/seed";
import { CampaignCard } from "@/components/pages/campaigns/CampaignCard";
import { CampaignBuilder } from "@/components/pages/campaigns/CampaignBuilder";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function Campaigns() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const isNew = searchParams.get("new") === "1";
  const editing = campaigns.find((c) => c.id === editId);
  const builderOpen = isNew || !!editing;

  const goList = () => setSearchParams({});
  const goNew = () => setSearchParams({ new: "1" });
  const goEdit = (id: string) => setSearchParams({ id });

  return (
    <AnimatePresence mode="wait" initial={false}>
      {builderOpen ? (
        <motion.div
          key={`builder-${editId ?? "new"}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          <CampaignBuilder campaign={editing} onExit={goList} />
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="mx-auto w-full max-w-[1400px] p-6 lg:p-8"
        >
          {/* header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.01em] text-slate-900">Call campaigns</h3>
              <p className="mt-1 text-[13px] font-medium text-slate-500">
                Cadences and goals for each discharge cohort
              </p>
            </div>
            <motion.button
              layoutId="new-campaign-morph"
              type="button"
              onClick={goNew}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-teal-600"
            >
              <Plus className="h-4 w-4" />
              New campaign
            </motion.button>
          </div>

          {/* grid */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {campaigns.map((c, i) => (
              <CampaignCard key={c.id} campaign={c} index={i} onEdit={() => goEdit(c.id)} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
