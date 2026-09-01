import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Typed mono log — lines type in character by character (12ms/char),
 * sequentially. Used for the connection test and webhook delivery logs.
 */
export function TypedLog({
  lines,
  active,
  className,
  charMs = 12,
}: {
  lines: string[];
  /** when false, shows the idle placeholder */
  active: boolean;
  className?: string;
  charMs?: number;
}) {
  const [chars, setChars] = useState(0);
  const total = lines.reduce((a, l) => a + l.length, 0);

  useEffect(() => {
    setChars(0);
    if (!active || lines.length === 0) return;
    const iv = setInterval(() => setChars((c) => c + 1), charMs);
    return () => clearInterval(iv);
  }, [active, lines, charMs]);

  // map the global char cursor onto lines
  let remaining = chars;
  const rendered: { text: string; partial: boolean }[] = [];
  if (active) {
    for (const line of lines) {
      if (remaining <= 0) break;
      if (remaining >= line.length) {
        rendered.push({ text: line, partial: false });
        remaining -= line.length;
      } else {
        rendered.push({ text: line.slice(0, remaining), partial: true });
        remaining = 0;
      }
    }
  }
  const done = chars >= total && active;

  return (
    <div className={cn("rounded-xl bg-ink-900 p-3 font-mono text-[11px] leading-relaxed", className)}>
      {!active && <span className="text-ink-400">// run a test to see the wire log</span>}
      {rendered.map((r, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }}>
          <span
            className={cn(
              r.text.startsWith("←") || r.text.startsWith("✓")
                ? "text-green-400"
                : r.text.startsWith("→")
                  ? "text-teal-300"
                  : "text-ink-400",
            )}
          >
            {r.text}
          </span>
          {r.partial && !done && (
            <span className="ml-0.5 inline-block h-3 w-[6px] animate-caret-blink bg-violet-500 align-[-1px]" />
          )}
        </motion.div>
      ))}
    </div>
  );
}
