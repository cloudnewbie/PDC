import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Cadence } from "@/data/seed";
import { CADENCE_LABELS } from "./intents";

/**
 * Cadence timeline visual — dots on a connecting line that draw in
 * sequentially (0.6s) when the card/section enters.
 */
export function CadenceTimeline({
  cadence,
  className,
  nodeTone = "teal",
}: {
  cadence: Cadence[];
  className?: string;
  nodeTone?: "teal" | "violet";
}) {
  const dot = nodeTone === "teal" ? "bg-teal-500" : "bg-violet-500";
  return (
    <div className={cn("relative pt-1", className)}>
      {/* connecting line */}
      <motion.div
        className="absolute left-0 right-0 top-[7px] h-px bg-slate-200"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "left" }}
      />
      <div className="relative flex justify-between">
        {cadence.map((c, i) => (
          <motion.div
            key={c}
            className="flex flex-col items-center gap-1.5"
            initial={{ opacity: 0, y: 6, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.12 + i * 0.12, type: "spring", stiffness: 400, damping: 22 }}
          >
            <span className={cn("h-[13px] w-[13px] rounded-full border-[2.5px] border-white shadow-card ring-1 ring-line", dot)} />
            <span className="tnum whitespace-nowrap font-mono text-[10px] font-bold text-slate-500">{CADENCE_LABELS[c]}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
