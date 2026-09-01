import { motion } from "framer-motion";

/**
 * Sentiment gauge — semicircle arc (SVG), needle from Calm (green) to
 * Distressed (coral). Score 0..1 drives the needle with a smooth tween.
 */
export function SentimentGauge({
  score,
  label,
  size = 176,
}: {
  /** 0 = calm … 1 = distressed */
  score: number;
  label: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(1, score));
  // needle angle: -80deg (calm, left) → +80deg (distressed, right)
  const angle = -80 + clamped * 160;

  const cx = 100;
  const cy = 92;
  const r = 74;
  const arc = (from: number, to: number) => {
    const p = (a: number) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return `${cx + r * Math.cos(rad)} ${cy + r * Math.sin(rad)}`;
    };
    return `M ${p(from)} A ${r} ${r} 0 0 1 ${p(to)}`;
  };

  const tone =
    clamped < 0.33 ? "text-green-500" : clamped < 0.6 ? "text-amber-400" : "text-coral-400";

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 200 108" width={size} height={(size * 108) / 200}>
        {/* track */}
        <path d={arc(-90, 90)} fill="none" stroke="#1D2A47" strokeWidth={10} strokeLinecap="round" />
        {/* zones */}
        <path d={arc(-90, -36)} fill="none" stroke="#10B981" strokeWidth={10} strokeLinecap="round" opacity={0.85} />
        <path d={arc(-36, 18)} fill="none" stroke="#F59E0B" strokeWidth={10} opacity={0.85} />
        <path d={arc(18, 90)} fill="none" stroke="#F43F5E" strokeWidth={10} strokeLinecap="round" opacity={0.85} />
        {/* needle */}
        <motion.g
          initial={false}
          animate={{ rotate: angle }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          style={{ transformOrigin: "100px 92px" }}
        >
          <line x1={cx} y1={cy} x2={cx} y2={cy - 58} stroke="#E8EDF7" strokeWidth={3} strokeLinecap="round" />
          <circle cx={cx} cy={cy} r={6} fill="#E8EDF7" />
          <circle cx={cx} cy={cy} r={2.5} fill="#0C1426" />
        </motion.g>
        {/* ticks */}
        {[-80, -40, 0, 40, 80].map((a) => {
          const rad = ((a - 90) * Math.PI) / 180;
          const x1 = cx + 84 * Math.cos(rad);
          const y1 = cy + 84 * Math.sin(rad);
          const x2 = cx + 90 * Math.cos(rad);
          const y2 = cy + 90 * Math.sin(rad);
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1D2A47" strokeWidth={2} />;
        })}
      </svg>
      <div className="-mt-3 text-center">
        <div className={`tnum font-mono text-sm font-semibold capitalize ${tone}`}>{label || "—"}</div>
        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">
          patient tone · last 30s
        </div>
      </div>
    </div>
  );
}
