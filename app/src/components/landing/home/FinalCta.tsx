import { useEffect, useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MagneticButton } from "@/components/landing/home/MagneticButton";

gsap.registerPlugin(ScrollTrigger);

/** §9 — final CTA with a looped faint ECG pulse line behind. */
export function FinalCta() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cta-word",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.05,
          ease: "expo.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 75%" },
        },
      );
      gsap.fromTo(
        ".cta-sub, .cta-buttons",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: "expo.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 72%" },
        },
      );
      // ECG draws once, then CSS loop takes over at 20% opacity
      gsap.fromTo(
        ".cta-ecg",
        { strokeDashoffset: 1400 },
        {
          strokeDashoffset: 0,
          duration: 1.6,
          ease: "power2.inOut",
          scrollTrigger: { trigger: rootRef.current, start: "top 70%" },
          onComplete: () => rootRef.current?.querySelector(".cta-ecg")?.classList.add("cta-ecg-loop"),
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const words = ["Someone", "should", "call."];

  return (
    <section ref={rootRef} className="relative overflow-hidden bg-ink-950 py-24 lg:py-36">
      {/* faint looped ECG behind text */}
      <svg
        className="pointer-events-none absolute left-1/2 top-1/2 w-[160%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-20"
        viewBox="0 0 1400 220"
        aria-hidden
      >
        <path
          className="cta-ecg"
          d="M0 110 H420 l14 -10 l12 20 l14 -96 l16 140 l14 -54 h60 l12 -8 l12 16 l14 -88 l16 128 l14 -48 H900 l12 -8 l12 16 l14 -88 l16 128 l14 -48 H1400"
          fill="none"
          stroke="#2DD4BF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1400"
          strokeDashoffset="1400"
        />
      </svg>

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-display text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-ink-100 lg:text-[56px]">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-1">
              <span className={`cta-word inline-block opacity-0 ${w === "call." ? "italic text-teal-400" : ""}`}>
                {w}
                {i < words.length - 1 ? " " : ""}
              </span>
            </span>
          ))}
        </h2>
        <p className="cta-sub mx-auto mt-5 max-w-xl text-[16px] leading-[1.6] text-ink-400 opacity-0">
          Open the console and watch the agent work — then enroll a patient and plan your own campaign.
        </p>
        <div className="cta-buttons mt-9 flex flex-wrap items-center justify-center gap-4 opacity-0">
          <Link to="/app/live?autostart=1">
            <MagneticButton variant="primary">Launch live demo →</MagneticButton>
          </Link>
          <Link to="/app">
            <MagneticButton variant="ghost">Explore the dashboard</MagneticButton>
          </Link>
        </div>
      </div>
    </section>
  );
}
