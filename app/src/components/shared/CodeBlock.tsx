import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* Tiny TS syntax tinter — keyword / string / comment / number / type. */
function tint(code: string): { text: string; cls?: string }[] {
  const tokens: { text: string; cls?: string }[] = [];
  const re =
    /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(import|export|from|const|let|var|function|return|await|async|new|type|interface|extends|if|else|for|of|in|typeof)\b|\b(true|false|null|undefined)\b|(\b\d+(?:\.\d+)?\b)|\b([A-Z][A-Za-z0-9_]*)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) tokens.push({ text: code.slice(last, m.index) });
    const [full, comment, str, kw, lit, num, typeName] = m;
    const cls = comment
      ? "text-ink-400 italic"
      : str
        ? "text-teal-400"
        : kw
          ? "text-violet-400"
          : lit || num
            ? "text-amber-400"
            : typeName
              ? "text-teal-300"
              : undefined;
    tokens.push({ text: full, cls });
    last = m.index + full.length;
  }
  if (last < code.length) tokens.push({ text: code.slice(last) });
  return tokens;
}

/**
 * CodeBlock — dark ink-900 card, violet title bar with filename + copy
 * button, syntax-tinted TypeScript.
 */
export function CodeBlock({
  code,
  filename = "src/lib/calle.ts",
  title,
  className,
  maxHeight,
}: {
  code: string;
  filename?: string;
  title?: string;
  className?: string;
  maxHeight?: number;
}) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => tint(code), [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard unavailable — still show feedback */
    }
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-dark-card", className)}>
      <div className="flex items-center justify-between border-b border-ink-700 bg-gradient-to-r from-violet-500/15 via-ink-900 to-teal-500/10 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-coral-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </span>
          <span className="font-mono text-xs text-violet-300">{title ?? filename}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre
        className="scroll-thin overflow-auto p-4 font-mono text-[13px] leading-[1.7] text-ink-100"
        style={maxHeight ? { maxHeight } : undefined}
      >
        <code>
          {tokens.map((t, i) => (
            <span key={i} className={t.cls}>
              {t.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
