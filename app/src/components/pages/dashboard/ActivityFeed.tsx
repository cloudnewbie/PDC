import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  Braces,
  Flag,
  PhoneOff,
  PhoneOutgoing,
  Siren,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { activityFeed } from "@/data/seed";
import type { ActivityEvent } from "@/data/seed";

const ICONS: Record<ActivityEvent["type"], { icon: typeof Flag; classes: string }> = {
  call_started: { icon: PhoneOutgoing, classes: "bg-teal-500/10 text-teal-600" },
  call_completed: { icon: PhoneOff, classes: "bg-green-500/10 text-green-600" },
  flag: { icon: Flag, classes: "bg-coral-500/10 text-coral-500" },
  escalation: { icon: Siren, classes: "bg-coral-500/10 text-coral-600" },
  result: { icon: Braces, classes: "bg-violet-500/10 text-violet-500" },
  nurse_action: { icon: UserCheck, classes: "bg-slate-500/10 text-slate-500" },
};

/** Simulated future events, prepended to the feed every 6–10s. */
const SIM_POOL: Omit<ActivityEvent, "id" | "ts">[] = [
  { type: "nurse_action", text: "Nurse Ruiz acknowledged ESC-1042 · callback scheduled 10:30", link: "/app/escalations?id=ESC-1042" },
  { type: "call_started", text: "Call started → Robert Okafor · 24h check-in", link: "/app/live" },
  { type: "result", text: "Result ready: M. Ellis · risk 0.68 · action: nurse callback within 2h", link: "/app/results?id=call-1042" },
  { type: "call_completed", text: "Call completed → R. Okafor · 4m 12s · no flags", link: "/app/results?id=call-1043" },
  { type: "call_started", text: "Call started → Linda Vargas · Day 7 check-in", link: "/app/live" },
  { type: "call_completed", text: "Call completed → L. Vargas · 3m 05s · no flags", link: "/app/results?id=call-1044" },
  { type: "nurse_action", text: "Nurse O'Brien called J. Whitfield · diuretic dose confirmed", link: "/app/escalations?id=ESC-1041" },
];

let simId = 0;

/**
 * "Live activity" feed — independent scroll column, auto-prepends simulated
 * events. When the user has scrolled away from the top, events queue behind a
 * "↓ N new" pill instead of shifting content under them.
 */
export function ActivityFeed() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ActivityEvent[]>(activityFeed);
  const [pending, setPending] = useState<ActivityEvent[]>([]);
  const [atTop, setAtTop] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const poolIdx = useRef(0);
  const simMinute = useRef(27);
  const atTopRef = useRef(true);
  atTopRef.current = atTop;

  useEffect(() => {
    let timer: number;
    const scheduleNext = () => {
      timer = window.setTimeout(() => {
        const tmpl = SIM_POOL[poolIdx.current % SIM_POOL.length];
        poolIdx.current += 1;
        simMinute.current += 1 + Math.floor(Math.random() * 3);
        const ev: ActivityEvent = {
          ...tmpl,
          id: `sim-${simId++}`,
          ts: `09:${String(Math.min(59, simMinute.current)).padStart(2, "0")}`,
        };
        if (atTopRef.current) {
          setEvents((prev) => [ev, ...prev].slice(0, 30));
        } else {
          setPending((prev) => [ev, ...prev]);
        }
        scheduleNext();
      }, 6000 + Math.random() * 4000);
    };
    scheduleNext();
    return () => window.clearTimeout(timer);
  }, []);

  const flushPending = () => {
    setEvents((prev) => [...pending, ...prev].slice(0, 30));
    setPending([]);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <h4 className="text-base font-semibold text-slate-900">Live activity</h4>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-teal-700">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-teal-500" />
          Streaming
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* "N new" pill when scrolled away */}
        <AnimatePresence>
          {pending.length > 0 && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={flushPending}
              className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-teal-500 px-3 py-1 text-[11px] font-bold text-white shadow-teal-glow transition-colors hover:bg-teal-600"
            >
              <ArrowDown className="h-3 w-3" />
              {pending.length} new
            </motion.button>
          )}
        </AnimatePresence>

        <div
          ref={scrollRef}
          onScroll={(e) => setAtTop(e.currentTarget.scrollTop < 30)}
          className="scroll-thin h-full max-h-[560px] overflow-y-auto px-5 py-4"
        >
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {events.map((ev) => {
                const cfg = ICONS[ev.type];
                const Icon = cfg.icon;
                return (
                  <motion.button
                    key={ev.id}
                    type="button"
                    layout="position"
                    initial={{ opacity: 0, y: -16, backgroundColor: ev.type === "flag" ? "rgba(244,63,94,0.08)" : "rgba(0,0,0,0)" }}
                    animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
                    transition={{ duration: 0.35, backgroundColor: { duration: 1.4 } }}
                    onClick={() => ev.link && navigate(ev.link)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors",
                      ev.link ? "hover:bg-paper" : "cursor-default",
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", cfg.classes)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] leading-snug text-slate-700">{ev.text}</span>
                    </span>
                    <span className="tnum shrink-0 pt-0.5 font-mono text-[11px] text-slate-400">{ev.ts}</span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
