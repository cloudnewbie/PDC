import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ROWS = [
  { label: "Check-ins completed", value: "41/44", pct: 93, bar: "bg-teal-500", text: "text-teal-700" },
  { label: "Red flags caught before ED visit", value: "7", pct: 88, bar: "bg-coral-500", text: "text-coral-600" },
  { label: "Follow-up appointments confirmed", value: "12/13", pct: 92, bar: "bg-green-500", text: "text-green-700" },
];

/** "This week's outcomes" — stacked stat rows with animated progress bars. */
export function OutcomesCard({ replayKey }: { replayKey: string }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h4 className="text-base font-semibold text-slate-900">This week's outcomes</h4>
      </div>
      <div className="flex-1 space-y-5 px-5 py-5" key={replayKey}>
        {ROWS.map((r, i) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-slate-600">{r.label}</span>
              <span className={cn("tnum font-mono text-[15px] font-semibold", r.text)}>{r.value}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-500/10">
              <motion.div
                className={cn("h-full rounded-full", r.bar)}
                initial={{ width: 0 }}
                animate={{ width: `${r.pct}%` }}
                transition={{ duration: 1, delay: 0.15 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-slate-500">
        Estimated <span className="font-semibold text-slate-900">2 readmissions avoided</span> this
        week — model based on cohort baseline.
      </p>
    </div>
  );
}
