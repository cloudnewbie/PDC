import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { value: 15.3, suffix: "%", decimals: 1, label: "average 30-day readmission rate, US hospitals" },
  { value: 15, prefix: "$", suffix: "B+", decimals: 0, label: "annual cost of preventable readmissions" },
  { value: 50, prefix: "~", suffix: "%", decimals: 0, label: "of readmissions are linked to issues detectable by phone" },
  { value: 3, suffix: " calls", decimals: 0, label: "24h / 72h / day 7 — the cadence that catches them" },
];

/** §2 — stats strip with count-up numerals + scrubbed teal rule. */
export function StatsStrip() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // teal rule draws left→right, scrubbed
      gsap.fromTo(
        ".stats-rule",
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: rootRef.current, start: "top 90%", end: "top 40%", scrub: 0.4 },
        },
      );
      // cells stagger + count up at 80% viewport
      gsap.fromTo(
        ".stat-cell",
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: "expo.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 80%" },
        },
      );
      const nums = gsap.utils.toArray<HTMLElement>(".stat-num");
      nums.forEach((el) => {
        const target = parseFloat(el.dataset.value ?? "0");
        const decimals = parseInt(el.dataset.decimals ?? "0", 10);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 80%" },
          onUpdate: () => {
            el.textContent = `${el.dataset.prefix ?? ""}${obj.v.toFixed(decimals)}${el.dataset.suffix ?? ""}`;
          },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} className="relative border-y border-ink-700 bg-ink-950">
      <div className="stats-rule absolute left-0 top-0 h-px w-full origin-left bg-teal-400" style={{ transform: "scaleX(0)" }} />
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px lg:grid-cols-4">
        {STATS.map((s, i) => (
          <div key={i} className="stat-cell px-6 py-10 opacity-0 lg:border-l lg:border-ink-700 lg:first:border-l-0">
            <div
              className="stat-num tnum font-mono text-[44px] font-medium leading-none text-ink-100"
              data-value={s.value}
              data-decimals={s.decimals}
              data-prefix={s.prefix ?? ""}
              data-suffix={s.suffix ?? ""}
            >
              {(s.prefix ?? "") + (0).toFixed(s.decimals) + s.suffix}
            </div>
            <div className="mt-3 max-w-[26ch] text-[13px] leading-snug text-ink-400">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
