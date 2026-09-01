import { useEffect, useRef } from "react";
import { Award, Code2, Globe, Sparkles } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CRITERIA = [
  { icon: Globe, title: "Real World Impact", body: "Attacks the $15B preventable-readmission problem hospitals are penalized for." },
  { icon: Sparkles, title: "Quality of Idea", body: "Not another voice bot — a proactive, scheduled clinical safety net." },
  { icon: Code2, title: "Technical Implementation", body: "CALL-E SDK imported and invoked at runtime; live/demo adapter visible in-app." },
  { icon: Award, title: "Product Experience", body: "A full care-team workflow: enroll → call → detect → escalate → resolve." },
];

/** §8 — hackathon band: built to be judged. */
export function HackathonBand() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hack-header",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", scrollTrigger: { trigger: rootRef.current, start: "top 78%" } },
      );
      gsap.fromTo(
        ".hack-card",
        { rotateX: 12, y: 24, opacity: 0, transformPerspective: 800 },
        {
          rotateX: 0,
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 75%" },
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative border-y border-ink-700 py-24"
      style={{ background: "linear-gradient(180deg, #080D1A 0%, #0D1226 50%, #080D1A 100%)" }}
    >
      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="hack-header opacity-0">
          <div className="font-mono text-xs font-medium tracking-[0.14em] text-violet-400">CALL-E: YOUR CODE IS CALLING</div>
          <h2 className="mt-4 font-display text-[32px] font-medium text-ink-100">Built to be judged.</h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CRITERIA.map((c) => (
            <div key={c.title} className="hack-card rounded-2xl border border-ink-700 bg-ink-800/70 p-5 text-left opacity-0 shadow-dark-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
                <c.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold text-ink-100">{c.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
