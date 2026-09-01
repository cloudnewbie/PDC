import { memo, useEffect, useRef } from "react";

export type WaveformSpeaker = "agent" | "patient" | "listening" | "idle";

interface WaveformCanvasProps {
  /** 0–1 base amplitude multiplier */
  amplitude?: number;
  /** who is speaking — drives color and energy */
  speaking?: WaveformSpeaker;
  /** "bars" (32 vertical bars) or "line" (continuous trace) */
  variant?: "bars" | "line";
  /** override stroke/fill color (hex); default by speaker */
  color?: string;
  className?: string;
  /** canvas pixel height (width fills container) */
  height?: number;
}

const SPEAKER_COLORS: Record<WaveformSpeaker, string> = {
  agent: "#2DD4BF", // teal-400
  patient: "#8B5CF6", // violet-500
  listening: "#7C8DB0", // ink-400
  idle: "#1D2A47", // ink-700
};

/**
 * Reusable 32-bar canvas waveform. Heights oscillate with sine + noise at
 * 60fps; amplitude rises while someone speaks, flattens to a breathing
 * baseline when idle/listening.
 */
export const WaveformCanvas = memo(function WaveformCanvas({
  amplitude = 1,
  speaking = "idle",
  variant = "bars",
  color,
  className,
  height = 96,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ amplitude, speaking, color });
  stateRef.current = { amplitude, speaking, color };
  const energyRef = useRef(0.15);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 600;
      canvas.width = w * dpr;
      canvas.height = height * dpr;
      canvas.style.height = `${height}px`;
      canvas.style.width = "100%";
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const BARS = 32;
    const phases = Array.from({ length: BARS }, (_, i) => i * 0.55);
    const speeds = Array.from({ length: BARS }, (_, i) => 1.6 + ((i * 7) % 5) * 0.32);
    const seeds = Array.from({ length: BARS }, (_, i) => Math.sin(i * 12.9898) * 43758.5453 % 1);

    const draw = (t: number) => {
      const { amplitude: amp, speaking: spk, color: col } = stateRef.current;
      const active = spk === "agent" || spk === "patient";
      const target = spk === "idle" ? 0.12 : active ? 0.9 * amp : 0.25 * amp;
      // smooth energy transitions
      energyRef.current += (target - energyRef.current) * 0.06;
      const energy = energyRef.current;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const stroke = col ?? SPEAKER_COLORS[spk];
      const time = t / 1000;

      if (variant === "bars") {
        const gap = w * 0.012;
        const bw = (w - gap * (BARS - 1)) / BARS;
        for (let i = 0; i < BARS; i++) {
          const wave =
            Math.sin(time * speeds[i] * 2 + phases[i]) * 0.5 +
            Math.sin(time * 1.1 + phases[i] * 2.3) * 0.35 +
            seeds[i] * 0.3;
          const mag = Math.abs(wave);
          const bh = Math.max(h * 0.04, h * 0.88 * mag * energy + h * 0.03);
          const x = i * (bw + gap);
          const y = (h - bh) / 2;
          ctx.fillStyle = stroke;
          ctx.globalAlpha = 0.35 + mag * 0.65 * energy;
          ctx.beginPath();
          const r = Math.min(bw / 2, 3 * dpr);
          ctx.roundRect(x, y, bw, bh, r);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2 * dpr;
        ctx.lineCap = "round";
        ctx.beginPath();
        const mid = h / 2;
        for (let x = 0; x <= w; x += 3 * dpr) {
          const p = x / w;
          const wave =
            Math.sin(p * 12 + time * 3) * 0.5 +
            Math.sin(p * 27 + time * 5.2) * 0.3 +
            Math.sin(p * 5 - time * 1.4) * 0.2;
          const env = Math.sin(p * Math.PI) ** 0.6;
          const y = mid + wave * env * mid * 0.85 * energy;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [variant, height]);

  return <canvas ref={canvasRef} className={className} style={{ display: "block", width: "100%", height }} />;
});
