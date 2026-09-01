import { assetUrl } from "@/lib/utils";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Play } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { WaveformCanvas } from "@/components/shared/WaveformCanvas";
import { MagneticButton } from "@/components/landing/home/MagneticButton";

gsap.registerPlugin(ScrollTrigger);

const HeroWaveScene = lazy(() => import("@/components/landing/home/HeroWaveScene"));

const HEADLINE: { word: string; accent?: boolean }[] = [
  { word: "Every" },
  { word: "discharged" },
  { word: "patient" },
  { word: "gets" },
  { word: "a" },
  { word: "call back.", accent: true },
];

const LOOP_LINES = [
  { speaker: "agent" as const, text: "How's the pain today, zero to ten?" },
  { speaker: "patient" as const, text: "Maybe a four. Worse at night." },
  { speaker: "agent" as const, text: "Any redness around the staples?" },
];

/** Floating glass mini-console (lg+) — looping 3-line transcript, tilt to cursor. */
function MiniConsole() {
  const ref = useRef<HTMLDivElement>(null);
  const [lineIdx, setLineIdx] = useState(0);

  // rotate through the fake transcript
  useEffect(() => {
    const id = setInterval(() => setLineIdx((i) => (i + 1) % LOOP_LINES.length), 2800);
    return () => clearInterval(id);
  }, []);

  // subtle 3D tilt toward cursor (max 4deg)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const cur = { x: 0, y: 0 };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const tx = Math.max(-1, Math.min(1, (e.clientX - cx) / 400)) * 4;
      const ty = Math.max(-1, Math.min(1, (e.clientY - cy) / 400)) * -4;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cur.x += (ty - cur.x) * 0.1;
        cur.y += (tx - cur.y) * 0.1;
        el.style.transform = `perspective(900px) rotateX(${cur.x.toFixed(2)}deg) rotateY(${cur.y.toFixed(2)}deg)`;
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="mini-console w-[380px] rounded-2xl border border-ink-700 bg-ink-800/60 p-4 shadow-teal-glow backdrop-blur-xl will-change-transform">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={assetUrl("/avatar-margaret.png")} alt="Margaret Ellis" className="h-8 w-8 rounded-full object-cover ring-1 ring-ink-700" />
          <div>
            <div className="text-[13px] font-semibold text-ink-100">Margaret Ellis · 72</div>
            <div className="font-mono text-[10px] text-ink-400">72h check-in · Ortho</div>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-teal-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-teal-400">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-teal-400" />
          LIVE
        </span>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl bg-ink-900/80">
        <WaveformCanvas speaking="agent" variant="bars" height={56} />
      </div>
      <div className="mt-3 space-y-2">
        {LOOP_LINES.map((l, i) => {
          const visible = (lineIdx + LOOP_LINES.length - i) % LOOP_LINES.length < LOOP_LINES.length;
          const order = (i - lineIdx + LOOP_LINES.length) % LOOP_LINES.length;
          return (
            <div
              key={i}
              className="flex transition-all duration-500 ease-out-expo"
              style={{
                justifyContent: l.speaker === "agent" ? "flex-start" : "flex-end",
                opacity: visible ? 1 - order * 0.25 : 0,
                transform: `translateY(${order === 0 ? 0 : 2}px)`,
              }}
            >
              <div
                className={
                  l.speaker === "agent"
                    ? "rounded-xl rounded-tl-sm bg-ink-700/80 px-3 py-2 text-[12px] text-ink-100"
                    : "rounded-xl rounded-tr-sm bg-violet-500/20 px-3 py-2 text-[12px] text-ink-100"
                }
              >
                {l.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HeroSection() {
  const rootRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // load choreography
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.fromTo(".hero-eyebrow", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.3)
        .fromTo(
          ".hero-word",
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.9, stagger: 0.06 },
          0.35,
        )
        .fromTo(".hero-sub", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.85)
        .fromTo(".hero-ctas", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 1.0)
        .fromTo(".hero-proof", { opacity: 0 }, { opacity: 1, duration: 0.7 }, 1.15)
        .fromTo(
          ".mini-console",
          { x: 60, opacity: 0, rotate: 2 },
          { x: 0, opacity: 1, rotate: 0, duration: 1.0 },
          1.05,
        );

      // scroll: headline parallax + fade, console parallax
      gsap.to(".hero-content", {
        y: -80,
        opacity: 0.2,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "top top", end: "90% top", scrub: true },
      });
      gsap.to(".mini-console-wrap", {
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "top top", end: "bottom top", scrub: true },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const watchCall = () => {
    document.querySelector("#live-demo")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => window.dispatchEvent(new CustomEvent("pdc:start-teaser")), 900);
  };

  return (
    <section ref={rootRef} className="relative flex min-h-[100dvh] items-center overflow-hidden bg-ink-950" style={{ minHeight: "max(100dvh, 720px)" }}>
      {/* poster fallback (always painted beneath the 3D scene; sole bg on mobile) */}
      <img
        src={assetUrl("/hero-poster.png")}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
      />
      {!isMobile && (
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <HeroWaveScene />
          </Suspense>
        </div>
      )}
      {/* dotted grid + vignette for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-dotted-grid opacity-40" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 90% 70% at 50% 45%, transparent 40%, #080D1A 100%)" }}
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-6 pb-24 pt-32 lg:grid-cols-[1fr_auto] lg:pb-16 lg:pt-24">
        {/* content */}
        <div className="hero-content max-w-3xl">
          <div className="hero-eyebrow flex items-center gap-2.5 font-mono text-xs font-medium tracking-[0.14em] text-teal-400 opacity-0">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-teal-400" />
            BUILT ON CALL-E · YOUR CODE IS CALLING HACKATHON
          </div>

          <h1 className="mt-6 font-display text-[48px] font-medium leading-[1.02] tracking-[-0.02em] text-ink-100 sm:text-[72px] lg:text-[88px]">
            {HEADLINE.map((w, i) => (
              <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
                <span className={`hero-word inline-block opacity-0 ${w.accent ? "italic text-teal-400" : ""}`}>
                  {w.word}
                  {i < HEADLINE.length - 1 ? " " : ""}
                </span>
              </span>
            ))}
          </h1>

          <p className="hero-sub mt-6 max-w-xl text-[17px] leading-[1.6] text-ink-400 opacity-0">
            Post-Discharge Check turns the CALL-E platform into a tireless care coordinator: it dials patients at
            24h, 72h, and day 7, holds a real conversation, catches red-flag symptoms, and hands your team
            structured results — before they become readmissions.
          </p>

          <div className="hero-ctas mt-9 flex flex-wrap items-center gap-4 opacity-0">
            <Link to="/app/live">
              <MagneticButton variant="primary">Launch the live demo →</MagneticButton>
            </Link>
            <MagneticButton variant="ghost" onClick={watchCall}>
              <Play className="h-4 w-4" /> Watch a call
            </MagneticButton>
          </div>

          <div className="hero-proof mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-ink-400 opacity-0">
            <span className="text-teal-400">▲ 1,248 check-in calls completed</span>
            <span className="hidden h-3 w-px bg-ink-700 sm:block" />
            <span>avg 4m 12s per call</span>
            <span className="hidden h-3 w-px bg-ink-700 sm:block" />
            <span>0 patients missed today</span>
          </div>
        </div>

        {/* mini console (lg+) */}
        <div className="mini-console-wrap hidden lg:block">
          <MiniConsole />
        </div>
      </div>
    </section>
  );
}
