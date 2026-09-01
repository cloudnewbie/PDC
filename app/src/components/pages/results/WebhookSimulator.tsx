import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Send, Webhook } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface LogLine {
  id: number;
  text: string;
  tone?: "ok" | "info" | "dim";
}

/**
 * Webhook simulation — shows the configured endpoint, a "Fire test webhook"
 * button, and an animated mono request log whose lines type in sequentially.
 * Payload viewer expands with a spring. In demo mode everything is logged
 * as simulated.
 */
export function WebhookSimulator({
  endpoint,
  payload,
}: {
  endpoint: string;
  payload: unknown;
}) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [firing, setFiring] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  const fire = () => {
    if (firing) return;
    setFiring(true);
    setLines([]);
    setShowPayload(false);
    const kb = (JSON.stringify(payload).length / 1024).toFixed(1);
    const script: LogLine[] = [
      { id: 1, text: `→ POST ${endpoint}`, tone: "info" },
      { id: 2, text: "  event: result.ready · content-type: application/json", tone: "dim" },
      { id: 3, text: "  x-pdc-signature: sha256=9f2c…e41a", tone: "dim" },
      { id: 4, text: `← 200 OK · 184ms · payload ${kb} KB (simulated)`, tone: "ok" },
      { id: 5, text: "✓ delivery logged to integration audit trail", tone: "ok" },
    ];
    script.forEach((line, i) => {
      setTimeout(() => {
        setLines((prev) => [...prev, line]);
        if (i === script.length - 1) {
          setFiring(false);
          toast.success("Test webhook delivered", { description: "Simulated delivery — demo mode" });
        }
      }, 520 * (i + 1));
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Webhook className="h-4 w-4 shrink-0 text-violet-500" />
          <code className="truncate font-mono text-[12px] text-slate-600">POST {endpoint}</code>
        </div>
        <button
          type="button"
          onClick={fire}
          disabled={firing}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-violet-500/40 px-3 py-1.5 text-[12px] font-semibold text-violet-600 transition-colors hover:bg-violet-500/10 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {firing ? "Firing…" : "Fire test webhook"}
        </button>
      </div>

      <div className="mt-3 min-h-[118px] flex-1 rounded-xl bg-ink-900 p-3 font-mono text-[11px] leading-relaxed">
        {lines.length === 0 && <span className="text-ink-400">// delivery log appears here</span>}
        {lines.map((l) => (
          <TypedLine key={l.id} text={l.text} tone={l.tone} />
        ))}
        {lines.length >= 4 && (
          <button
            type="button"
            onClick={() => setShowPayload((v) => !v)}
            className="mt-1 flex items-center gap-1 text-violet-400 hover:underline"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", showPayload && "rotate-180")} />
            {showPayload ? "hide payload" : "view payload"}
          </button>
        )}
        <AnimatePresence>
          {showPayload && (
            <motion.pre
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="scroll-thin mt-2 max-h-44 overflow-auto rounded-lg border border-ink-700 bg-ink-950/70 p-2 text-[10px] text-teal-300"
            >
              {JSON.stringify(payload, null, 2)}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TypedLine({ text, tone }: { text: string; tone?: LogLine["tone"] }) {
  const [shown, setShown] = useState(0);
  const typing = shown < text.length;

  useEffect(() => {
    const iv = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(iv);
          return n;
        }
        return n + 2;
      });
    }, 10);
    return () => clearInterval(iv);
  }, [text]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: EASE }}>
      <span className={cn(tone === "ok" ? "text-green-400" : tone === "info" ? "text-teal-300" : "text-ink-400")}>
        {text.slice(0, shown)}
      </span>
      {typing && <span className="ml-0.5 inline-block h-3 w-[6px] animate-caret-blink bg-violet-500 align-[-1px]" />}
    </motion.div>
  );
}
