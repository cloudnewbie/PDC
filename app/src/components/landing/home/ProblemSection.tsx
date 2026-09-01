import { assetUrl } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { PhoneMissed, Thermometer, Pill, SquareActivity } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RiskBadge } from "@/components/shared/RiskBadge";

gsap.registerPlugin(ScrollTrigger);

/** §3 — The Problem: pinned 300vh storytelling, 3 beats crossfade. */
export function ProblemSection() {
  const rootRef = useRef<HTMLElement>(null);
  const captionRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        const beats = [".beat-1", ".beat-2", ".beat-3"];
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 0.6,
            onUpdate: (self) => {
              const idx = Math.min(2, Math.floor(self.progress * 3));
              if (captionRef.current) captionRef.current.textContent = `0${idx + 1} / 03`;
            },
          },
        });

        // background ken-burns
        tl.fromTo(".problem-bg", { scale: 1 }, { scale: 1.08, ease: "none", duration: 3 }, 0);
        // beat 1 → out at 0.8–1.0
        tl.fromTo(beats[0], { opacity: 1, y: 0 }, { opacity: 1, y: 0, duration: 0.8 }, 0)
          .to(beats[0], { opacity: 0, y: -40, duration: 0.25 }, 0.85)
          .fromTo(beats[1], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.25 }, 1.05)
          .to(beats[1], { opacity: 0, y: -40, duration: 0.25 }, 1.85)
          .fromTo(beats[2], { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.25 }, 2.05)
          // flatline → ECG snap on beat 3
          .fromTo(".ecg-snap", { strokeDashoffset: 400 }, { strokeDashoffset: 0, duration: 0.4, ease: "power2.in" }, 2.1)
          // drama: darken background on beat 3
          .to(".problem-bg", { filter: "brightness(0.9)", duration: 0.3 }, 2.05)
          .to({}, { duration: 0.6 }); // hold
      });

      mm.add("(max-width: 767px)", () => {
        // stacked, simple fades
        gsap.utils.toArray<HTMLElement>(".beat").forEach((el) => {
          gsap.fromTo(
            el,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 75%" } },
          );
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} id="problem" className="relative overflow-hidden bg-ink-950">
      {/* background: ward-light.jpg at 12% opacity */}
      <div className="problem-bg pointer-events-none absolute inset-0 will-change-transform">
        <img src={assetUrl("/ward-light.jpg")} alt="" aria-hidden className="h-full w-full object-cover opacity-[0.12]" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-950/70 to-ink-950" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl items-center px-6 py-24 md:py-0">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          {/* narrative beats (absolute-stacked on desktop, stacked on mobile) */}
          <div className="relative space-y-16 md:h-[340px] md:space-y-0">
            {/* BEAT 1 */}
            <div className="beat beat-1 md:absolute md:inset-0">
              <div className="font-mono text-xs tracking-[0.14em] text-ink-400">01 — DISCHARGE</div>
              <h2 className="mt-4 font-display text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-ink-100 lg:text-[56px]">
                They go home.
              </h2>
              <p className="mt-4 max-w-md text-[16px] leading-[1.6] text-ink-400">
                The average discharge conversation lasts 8 minutes. Patients retain less than half of their
                instructions.
              </p>
            </div>
            {/* BEAT 2 */}
            <div className="beat beat-2 md:absolute md:inset-0 md:opacity-0">
              <div className="font-mono text-xs tracking-[0.14em] text-ink-400">02 — SILENCE</div>
              <h2 className="mt-4 font-display text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-ink-100 lg:text-[56px]">
                Then… <em className="italic text-ink-400">silence.</em>
              </h2>
              <p className="mt-4 max-w-md text-[16px] leading-[1.6] text-ink-400">
                No one checks in until something hurts. By then it's the ED, not a phone call.
              </p>
            </div>
            {/* BEAT 3 */}
            <div className="beat beat-3 md:absolute md:inset-0 md:opacity-0">
              <div className="font-mono text-xs tracking-[0.14em] text-coral-500">03 — READMISSION</div>
              <h2 className="mt-4 font-display text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-ink-100 lg:text-[56px]">
                They come back <em className="italic text-coral-500">worse.</em>
              </h2>
              <p className="mt-4 max-w-md text-[16px] leading-[1.6] text-ink-400">
                1 in 6 patients is readmitted within 30 days. Most of them said the warning signs were there —
                nobody asked.
              </p>
            </div>
          </div>

          {/* supporting visual cards — swap per beat via CSS (desktop pinned) */}
          <div className="relative hidden h-[380px] md:block">
            {/* card 1: discharge card */}
            <div className="beat beat-1 absolute inset-0 flex items-center justify-center md:opacity-100">
              <div className="w-80 rounded-2xl border border-ink-700 bg-ink-800/90 p-5 shadow-dark-card backdrop-blur">
                <div className="flex items-center gap-3">
                  <img src={assetUrl("/avatar-margaret.png")} alt="Margaret Ellis" className="h-12 w-12 rounded-full object-cover ring-1 ring-ink-700" />
                  <div>
                    <div className="text-sm font-semibold text-ink-100">Margaret Ellis · 72</div>
                    <div className="font-mono text-[11px] text-ink-400">L hip replacement · day 0</div>
                  </div>
                  <RiskBadge level="moderate" className="ml-auto" />
                </div>
                <div className="mt-4 rounded-xl bg-ink-900 px-3 py-2 font-mono text-[11px] text-teal-400">
                  DISCHARGED ✓ instructions given — 8 min
                </div>
              </div>
            </div>
            {/* card 2: flatline + missed symptoms */}
            <div className="beat beat-2 absolute inset-0 flex flex-col items-center justify-center md:opacity-0">
              <div className="w-80 rounded-2xl border border-ink-700 bg-ink-800/90 p-5 shadow-dark-card backdrop-blur">
                <div className="flex items-center gap-2 text-ink-400">
                  <PhoneMissed className="h-4 w-4" />
                  <span className="font-mono text-[11px]">no check-in scheduled</span>
                </div>
                <svg viewBox="0 0 300 40" className="mt-3 w-full">
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#7C8DB0" strokeWidth="1.5" strokeDasharray="2 5" />
                </svg>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { icon: Thermometer, label: "fever 38.4°" },
                    { icon: Pill, label: "missed doses ×2" },
                    { icon: SquareActivity, label: "wound redness" },
                  ].map((c) => (
                    <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 font-mono text-[10px] text-ink-400">
                      <c.icon className="h-3 w-3" /> {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* card 3: readmitted stamp + ECG snap */}
            <div className="beat beat-3 absolute inset-0 flex items-center justify-center md:opacity-0">
              <div className="relative w-80 rounded-2xl border border-coral-500/40 bg-ink-800/90 p-5 shadow-dark-card backdrop-blur">
                <svg viewBox="0 0 300 60" className="w-full">
                  <path
                    className="ecg-snap"
                    d="M0 30 H80 l8 -6 l8 24 l10 -38 l10 32 l8 -12 H300"
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="400"
                    strokeDashoffset="400"
                  />
                </svg>
                <div className="mt-3 text-center">
                  <span className="inline-block -rotate-3 rounded-lg border-2 border-coral-500 px-4 py-1.5 font-mono text-sm font-bold tracking-widest text-coral-500">
                    READMITTED — day 12
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* scroll progress caption */}
        <span ref={captionRef} className="absolute bottom-8 left-6 hidden font-mono text-xs text-ink-400 md:block">
          01 / 03
        </span>
      </div>
    </section>
  );
}
