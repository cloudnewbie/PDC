import { useEffect, useRef } from "react";
import { AudioWaveform, Braces, ClipboardList, PhoneOutgoing } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    n: "01",
    icon: ClipboardList,
    title: "Plan the call",
    body: "Define goals in plain language: pain, meds, wound, appointment.",
    visual: "goals",
  },
  {
    n: "02",
    icon: PhoneOutgoing,
    title: "Dial out",
    body: "CALL-E places a real phone call at the scheduled time.",
    visual: "dial",
  },
  {
    n: "03",
    icon: AudioWaveform,
    title: "Hold a real conversation",
    body: "Natural voice, adapts in real time — slows down, repeats, probes symptoms.",
    visual: "convo",
  },
  {
    n: "04",
    icon: Braces,
    title: "Return structured results",
    body: "JSON the care team can act on: risk score, red flags, next action.",
    visual: "json",
  },
];

function MicroVisual({ kind }: { kind: string }) {
  if (kind === "goals") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {["pain 0–10", "apixaban ✓", "wound check", "appt Mar 14"].map((g, i) => (
          <span
            key={g}
            className="animate-breathe rounded-full bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] text-violet-300"
            style={{ animationDelay: `${i * 0.55}s` }}
          >
            {g}
          </span>
        ))}
      </div>
    );
  }
  if (kind === "dial") {
    return (
      <div className="relative flex h-10 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="absolute left-4 h-6 w-6 animate-ping rounded-full border border-teal-400"
            style={{ animationDuration: "2.2s", animationDelay: `${i * 0.7}s` }}
          />
        ))}
        <PhoneOutgoing className="absolute left-4 h-5 w-5 -translate-x-[1px] text-teal-400" />
      </div>
    );
  }
  if (kind === "convo") {
    return (
      <div className="space-y-1.5">
        <div className="animate-breathe w-4/5 rounded-lg rounded-tl-sm bg-ink-700 px-2.5 py-1.5 font-mono text-[10px] text-ink-100">
          how's the pain today?
        </div>
        <div
          className="animate-breathe ml-auto w-3/5 rounded-lg rounded-tr-sm bg-violet-500/25 px-2.5 py-1.5 text-right font-mono text-[10px] text-ink-100"
          style={{ animationDelay: "1.4s" }}
        >
          maybe a four…
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-ink-900 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-teal-400">
      {"{ risk: 0.82, flag: \"fever\" }"}
      <span className="ml-1 inline-block h-3 w-[6px] animate-caret-blink bg-violet-500 align-[-2px]" />
    </div>
  );
}

/** §4 — How it works: 4 cards + scrubbed dashed connector. */
export function HowItWorks() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hiw-header",
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: rootRef.current, start: "top 75%" } },
      );
      gsap.fromTo(
        ".hiw-card",
        { y: 48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.12,
          ease: "expo.out",
          scrollTrigger: { trigger: ".hiw-grid", start: "top 75%" },
        },
      );
      gsap.fromTo(
        ".hiw-connector",
        { strokeDashoffset: 1200 },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: { trigger: ".hiw-grid", start: "top 80%", end: "bottom 55%", scrub: 0.5 },
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} id="how-it-works" className="relative bg-ink-950 py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="hiw-header opacity-0">
          <div className="font-mono text-xs font-medium tracking-[0.14em] text-teal-400">THE LOOP</div>
          <h2 className="mt-4 font-display text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-ink-100 lg:text-[56px]">
            Plan. Dial. <em className="italic text-teal-400">Converse.</em> Return.
          </h2>
          <p className="mt-4 max-w-xl text-[16px] leading-[1.6] text-ink-400">
            Four steps, fully automated by the CALL-E platform — humans only step in when it matters.
          </p>
        </div>

        <div className="hiw-grid relative mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {/* connector line (desktop) */}
          <svg className="pointer-events-none absolute -top-8 left-0 hidden h-8 w-full xl:block" preserveAspectRatio="none" viewBox="0 0 1200 32">
            <path
              className="hiw-connector"
              d="M40 16 H1160"
              fill="none"
              stroke="#2DD4BF"
              strokeWidth="1.5"
              strokeDasharray="6 8"
              opacity="0.5"
            />
          </svg>
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="hiw-card group rounded-2xl border border-ink-700 bg-ink-800 p-6 opacity-0 shadow-dark-card transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-400/50"
            >
              <div className="flex items-center justify-between">
                <span className="tnum font-mono text-sm font-bold text-teal-400">{s.n}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10 text-teal-400 transition-transform duration-300 group-hover:scale-110">
                  <s.icon className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mt-5 font-display text-[28px] font-medium text-ink-100">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-400">{s.body}</p>
              <div className="mt-5">
                <MicroVisual kind={s.visual} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
