import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bone, HeartPulse, Scissors, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Cohort } from "@/data/seed";

gsap.registerPlugin(ScrollTrigger);

const COHORTS: {
  cohort: Cohort;
  icon: LucideIcon;
  name: string;
  count: number;
  screens: string[];
  question: string;
}[] = [
  {
    cohort: "cardiac",
    icon: HeartPulse,
    name: "Cardiac",
    count: 6,
    screens: ["chest pain", "dyspnea", "med adherence"],
    question: "Have you had any chest discomfort since coming home?",
  },
  {
    cohort: "ortho",
    icon: Bone,
    name: "Orthopedic",
    count: 4,
    screens: ["wound status", "mobility", "pain control"],
    question: "How is your pain today on a scale of one to ten?",
  },
  {
    cohort: "surgical",
    icon: Scissors,
    name: "General surgery",
    count: 5,
    screens: ["fever", "incision", "bowel function"],
    question: "Any fever or chills in the last 24 hours?",
  },
  {
    cohort: "copd",
    icon: Wind,
    name: "COPD / Pneumonia",
    count: 3,
    screens: ["breathlessness", "O₂ sat", "inhaler use"],
    question: "Are you more short of breath than when you left?",
  },
];

function CohortCard({ c }: { c: (typeof COHORTS)[number] }) {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTyping = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTyped("");
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setTyped(c.question.slice(0, i));
      if (i >= c.question.length && timerRef.current) clearInterval(timerRef.current);
    }, 22);
  };
  const stopTyping = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTyped("");
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate(`/app/patients?cohort=${c.cohort}`)}
      onMouseEnter={startTyping}
      onMouseLeave={stopTyping}
      className="cohort-card group shrink-0 snap-start rounded-2xl border border-ink-700 bg-ink-800 p-6 text-left opacity-0 shadow-dark-card transition-all duration-300 hover:border-teal-400/60 hover:shadow-teal-glow w-[280px] xl:w-auto"
    >
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-500/10 text-teal-400">
          <c.icon className="h-5 w-5" />
        </span>
        <span className="tnum rounded-full bg-ink-900 px-2.5 py-1 font-mono text-[11px] text-ink-400">
          {c.count} patients
        </span>
      </div>
      <h3 className="mt-5 font-display text-[26px] font-medium text-ink-100">{c.name}</h3>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.screens.map((s) => (
          <span key={s} className="rounded-full border border-coral-500/30 px-2 py-0.5 text-[11px] font-medium text-coral-400">
            {s}
          </span>
        ))}
      </div>
      <p className="mt-4 min-h-[44px] font-display text-[15px] italic leading-snug text-teal-400">
        {typed ? `“${typed}”` : <span className="text-ink-700">hover to hear the agent…</span>}
      </p>
    </button>
  );
}

/** §6 — cohorts we cover. */
export function CohortsSection() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cohorts-header",
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: rootRef.current, start: "top 75%" } },
      );
      gsap.fromTo(
        ".cohort-card",
        { clipPath: "inset(100% 0 0 0)", opacity: 0, y: 24 },
        {
          clipPath: "inset(0% 0 0 0)",
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "expo.out",
          scrollTrigger: { trigger: ".cohorts-grid", start: "top 70%" },
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative border-t border-ink-700 bg-ink-950 py-24 lg:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="cohorts-header opacity-0">
          <div className="font-mono text-xs font-medium tracking-[0.14em] text-teal-400">CLINICAL COVERAGE</div>
          <h2 className="mt-4 font-display text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-ink-100 lg:text-[56px]">
            Every discharge cohort. One agent.
          </h2>
        </div>
        <div className="cohorts-grid mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 xl:grid xl:grid-cols-4 xl:overflow-visible">
          {COHORTS.map((c) => (
            <CohortCard key={c.cohort} c={c} />
          ))}
        </div>
      </div>
    </section>
  );
}
