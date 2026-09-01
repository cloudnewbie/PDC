import { memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Simulated audio playback strip — static bar heights (seeded per call),
 * play cursor sweeps linearly; speed toggle 1×/1.5×/2×. No real audio:
 * progress only, per call-results.md §3a.
 */
export const WaveformPlayer = memo(function WaveformPlayer({
  seedKey,
  durationSec,
  playing,
  onPlayingChange,
  onProgress,
}: {
  seedKey: string;
  durationSec: number;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
  onProgress: (fraction: number) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const rafRef = useRef(0);
  const lastRef = useRef(0);

  // deterministic bar heights from seed
  const bars = (() => {
    let h = 0;
    for (let i = 0; i < seedKey.length; i++) h = (h * 31 + seedKey.charCodeAt(i)) >>> 0;
    return Array.from({ length: 64 }, (_, i) => {
      h = (h * 1103515245 + 12345) >>> 0;
      const base = ((h >> 8) % 1000) / 1000;
      const env = Math.sin(((i + 0.5) / 64) * Math.PI) ** 0.5;
      return 0.18 + base * 0.82 * env;
    });
  })();

  useEffect(() => {
    setProgress(0);
  }, [seedKey]);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      setProgress((p) => {
        const next = p + (dt * speed) / durationSec;
        if (next >= 1) {
          onPlayingChange(false);
          onProgress(1);
          return 1;
        }
        onProgress(next);
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, durationSec, onPlayingChange, onProgress]);

  const elapsed = Math.floor(progress * durationSec);

  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (progress >= 1) setProgress(0);
            onPlayingChange(!playing);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white transition-colors hover:bg-teal-600"
          aria-label={playing ? "Pause recording" : "Play recording"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>

        <div className="relative h-10 flex-1">
          <div className="flex h-full items-center gap-[2px]">
            {bars.map((b, i) => {
              const played = i / 64 <= progress;
              return (
                <motion.span
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.01 }}
                  className={cn("w-full origin-center rounded-full", played ? "bg-teal-500" : "bg-teal-500/30")}
                  style={{ height: `${b * 100}%` }}
                />
              );
            })}
          </div>
          {/* progress cursor */}
          <div
            className="pointer-events-none absolute top-0 h-full w-0.5 bg-teal-600"
            style={{ left: `calc(${progress * 100}% - 1px)` }}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="tnum font-mono text-[11px] text-slate-500">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} / {Math.floor(durationSec / 60)}:
            {String(durationSec % 60).padStart(2, "0")}
          </span>
          <div className="flex overflow-hidden rounded-lg border border-line">
            {[1, 1.5, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "px-2 py-1 font-mono text-[10px] font-semibold transition-colors",
                  speed === s ? "bg-teal-500 text-white" : "bg-white text-slate-500 hover:bg-paper",
                )}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
