import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Magnetic CTA (home.md) — subtle pull (≤6px toward cursor within 120px)
 * plus a radial teal glow tracking the pointer inside the button.
 * Plain CSS-transform implementation (no animation library).
 */
export function MagneticButton({
  children,
  href,
  onClick,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const [transform, setTransform] = useState("translate(0px, 0px)");
  const [glow, setGlow] = useState({ x: 50, y: 50, on: false });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 120) {
      const k = 6 / Math.max(dist, 1);
      setTransform(`translate(${(dx * k * (dist / 120) * 2).toFixed(1)}px, ${(dy * k * (dist / 120) * 2).toFixed(1)}px)`);
    } else {
      setTransform("translate(0px, 0px)");
    }
    setGlow({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, on: true });
  };

  const onLeave = () => {
    setTransform("translate(0px, 0px)");
    setGlow((g) => ({ ...g, on: false }));
  };

  const cls = cn(
    "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-[15px] font-semibold transition-[transform,border-color,background-color] duration-200 ease-out-expo will-change-transform",
    variant === "primary"
      ? "bg-teal-500 text-white shadow-teal-glow hover:bg-teal-600"
      : "border border-ink-700 bg-transparent text-ink-100 hover:border-teal-400/60",
    className,
  );

  const glowEl = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 transition-opacity duration-300"
      style={{
        opacity: glow.on ? 1 : 0,
        background: `radial-gradient(140px circle at ${glow.x}% ${glow.y}%, rgb(45 212 191 / 0.28), transparent 70%)`,
      }}
    />
  );

  const style = { transform };

  if (href) {
    return (
      <a ref={ref as React.RefObject<HTMLAnchorElement>} href={href} onClick={onClick} onMouseMove={onMove} onMouseLeave={onLeave} className={cls} style={style}>
        {glowEl}
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </a>
    );
  }
  return (
    <button ref={ref as React.RefObject<HTMLButtonElement>} type="button" onClick={onClick} onMouseMove={onMove} onMouseLeave={onLeave} className={cls} style={style}>
      {glowEl}
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
