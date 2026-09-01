import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CodeBlock } from "@/components/shared/CodeBlock";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

const ADAPTER_SNIPPET = `import { CalleClient } from "@call-e/calle";      // CALL-E platform

export const calle = new CalleClient({
  apiKey: import.meta.env.VITE_CALLE_API_KEY,   // live mode when set
});                                             // → api.heycall-e.com

// every check-in starts here — task, dial, converse, extract
export async function runCheckIn(p: Patient, goals: CallGoals) {
  const call = await calle.calls.createAndWait({
    task: buildTask(p, goals),                  // real phone call
    resultSchema: pdcResultSchema,
  });
  return call.structuredResult;                 // JSON for the team
}`;

/** §7 — Integration: CALL-E is actually imported. */
export function IntegrationSection() {
  const rootRef = useRef<HTMLElement>(null);
  const [liveToggled, setLiveToggled] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".int-copy",
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: rootRef.current, start: "top 72%" } },
      );
      gsap.fromTo(
        ".int-code",
        { x: 40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.9,
          ease: "expo.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 70%" },
          onComplete: () => {
            // one-time syntax highlight sweep
            const sweep = rootRef.current?.querySelector(".int-sweep");
            if (sweep) gsap.fromTo(sweep, { xPercent: -110 }, { xPercent: 110, duration: 1, ease: "power2.inOut" });
          },
        },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} id="integration" className="relative border-t border-ink-700 bg-ink-950 py-24 lg:py-36">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-2">
        <div className="int-copy opacity-0">
          <div className="font-mono text-xs font-medium tracking-[0.14em] text-violet-400">TECHNICAL IMPLEMENTATION</div>
          <h2 className="mt-4 font-display text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-ink-100 lg:text-[56px]">
            CALL-E is <em className="italic text-violet-400">actually imported.</em>
          </h2>
          <p className="mt-4 max-w-md text-[16px] leading-[1.6] text-ink-400">
            Post-Discharge Check talks to CALL-E through a typed adapter. Set{" "}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[13px] text-teal-400">VITE_CALLE_API_KEY</code>{" "}
            and every call in this demo dials for real — the interface never changes.
          </p>

          {/* mode diagram */}
          <div className="mt-8 rounded-2xl border border-ink-700 bg-ink-800/60 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
              the app always shows which mode is live
            </div>
            <button
              type="button"
              onClick={() => setLiveToggled((v) => !v)}
              className="mt-4 flex w-full items-center rounded-full border border-ink-700 bg-ink-900 p-1.5 text-left"
            >
              <span
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-center text-[13px] font-semibold transition-all duration-300",
                  !liveToggled ? "bg-amber-500/15 text-amber-400 shadow-[inset_0_0_0_1px_rgb(245_158_11/.3)]" : "text-ink-400",
                )}
              >
                Demo Simulation
              </span>
              <span
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-center text-[13px] font-semibold transition-all duration-300",
                  liveToggled ? "bg-green-500/15 text-green-400 shadow-[inset_0_0_0_1px_rgb(16_185_129/.3)]" : "text-ink-400",
                )}
              >
                Live · CALL-E
              </span>
            </button>
            <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-400">
              {liveToggled
                ? "Live mode: real PSTN calls via CALL-E — planCall → startCall → events → structured result."
                : "Demo mode: scripted engine, zero real calls — identical adapter interface."}
            </p>
          </div>
        </div>

        <div className="int-code relative opacity-0">
          <CodeBlock code={ADAPTER_SNIPPET} filename="src/lib/calle.ts" />
          {/* syntax sweep overlay */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <div
              className="int-sweep absolute inset-y-0 w-1/3 -translate-x-full bg-gradient-to-r from-transparent via-teal-400/15 to-transparent"
              style={{ transform: "translateX(-110%)" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
