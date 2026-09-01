import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BriefLine } from "./intents";

/**
 * "Agent brief" — dark AI-artifact card that re-types its generated brief
 * (24ms/char, violet caret) whenever the form-derived lines change
 * (300ms debounce). Struck lines get an animated strikethrough.
 */
export function AgentBrief({
  lines,
  fieldsExtracted,
  voice,
  glow = false,
}: {
  lines: BriefLine[];
  fieldsExtracted: number;
  voice: string;
  glow?: boolean;
}) {
  const fullText = useMemo(() => lines.map((l) => l.text).join("\n"), [lines]);
  const [shown, setShown] = useState(fullText.length);
  const [typing, setTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setShown(0);
      setTyping(true);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setShown((n) => {
          if (n >= fullText.length) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTyping(false);
            return n;
          }
          return n + 1;
        });
      }, 24);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fullText]);

  // per-line typed windows
  let cursor = 0;
  const windows = lines.map((l) => {
    const start = cursor;
    cursor += l.text.length + 1; // + "\n"
    return { start, len: l.text.length };
  });

  return (
    <motion.div
      animate={
        glow
          ? { boxShadow: "0 0 44px -6px rgb(45 212 191 / .45)", borderColor: "rgb(45 212 191 / .6)" }
          : { boxShadow: "0 0 0px 0px rgb(45 212 191 / 0)", borderColor: "rgb(139 92 246 / .35)" }
      }
      transition={{ duration: 0.6 }}
      className="overflow-hidden rounded-2xl border bg-ink-900"
    >
      {/* header */}
      <div className="flex items-center justify-between border-b border-ink-700 bg-gradient-to-r from-violet-500/15 via-ink-900 to-teal-500/10 px-4 py-2.5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-violet-300">
          Agent brief · generated for CALL-E
        </span>
        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
      </div>

      {/* body */}
      <div className="min-h-[300px] p-4 font-mono text-[12.5px] leading-[1.75] text-ink-100">
        {lines.map((line, i) => {
          const w = windows[i];
          const visible = Math.max(0, Math.min(w.len, shown - w.start));
          const text = line.text.slice(0, visible);
          const isCurrent = typing && shown >= w.start && shown < w.start + w.len;
          if (visible === 0 && !(typing && shown === w.start)) return null;
          return (
            <div key={line.id} className={cn("relative whitespace-pre-wrap", line.header ? "text-teal-300" : line.struck ? "text-ink-400" : undefined)}>
              <span className={cn(line.struck && "opacity-60")}>{text}</span>
              {line.struck && visible >= w.len && (
                <motion.span
                  className="absolute left-0 top-1/2 h-px w-full bg-coral-400/80"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: "left" }}
                />
              )}
              {isCurrent && <span className="ml-0.5 inline-block h-3.5 w-[7px] animate-caret-blink bg-violet-500 align-[-2px]" />}
            </div>
          );
        })}
        {typing && shown >= fullText.length - 1 && null}
      </div>

      {/* stats */}
      <div className="flex items-center gap-4 border-t border-ink-700 px-4 py-2.5 font-mono text-[11px] text-ink-400">
        <span className="tnum">~4 min</span>
        <span className="text-ink-700">·</span>
        <span className="tnum">{fieldsExtracted} fields extracted</span>
        <span className="text-ink-700">·</span>
        <span>
          voice: <span className="text-teal-400">{voice}</span>
        </span>
        {typing && <span className="ml-auto animate-pulse-dot text-violet-400">regenerating…</span>}
      </div>
    </motion.div>
  );
}
