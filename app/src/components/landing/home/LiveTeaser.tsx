import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Pause, Play } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WaveformCanvas } from "@/components/shared/WaveformCanvas";
import { TranscriptBubble } from "@/components/shared/TranscriptBubble";
import { RedFlagChip } from "@/components/shared/RedFlagChip";
import { ExtractionField } from "@/components/shared/ExtractionField";
import { teaserScript } from "@/lib/simulation";
import { assetUrl, cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

type Phase = "idle" | "playing" | "done";

/** §5 — Live call teaser with a fully playable scripted mini console. */
export function LiveTeaser() {
  const rootRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<number>(0); // how many messages revealed
  const [showFlag, setShowFlag] = useState(false);
  const [extractions, setExtractions] = useState<Record<string, string>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const start = useCallback(() => {
    clearTimers();
    setPhase("playing");
    setTurns(0);
    setShowFlag(false);
    setExtractions({});
    let t = 600;
    teaserScript.forEach((line, i) => {
      t += line.speaker === "agent" ? 1700 : 2400;
      timersRef.current.push(setTimeout(() => setTurns(i + 1), t));
      if (line.flagQuote) {
        t += 900;
        timersRef.current.push(
          setTimeout(() => {
            setShowFlag(true);
            setExtractions((e) => ({ ...e, wound: "redness flagged" }));
          }, t),
        );
      }
      if (i === 1) {
        t += 800;
        timersRef.current.push(setTimeout(() => setExtractions((e) => ({ ...e, pain: "4/10 (worse at night)" })), t));
      }
      if (i === 3) {
        t += 700;
        timersRef.current.push(setTimeout(() => setExtractions((e) => ({ ...e, meds: "on schedule ✓" })), t));
      }
    });
    timersRef.current.push(setTimeout(() => setPhase("done"), t + 1400));
  }, []);

  const toggle = () => {
    if (phase === "playing") {
      clearTimers();
      setPhase("idle");
    } else {
      start();
    }
  };

  // "Watch a call" CTA in hero dispatches this
  useEffect(() => {
    const handler = () => start();
    window.addEventListener("pdc:start-teaser", handler);
    return () => {
      window.removeEventListener("pdc:start-teaser", handler);
      clearTimers();
    };
  }, [start]);

  // auto-scroll transcript
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, showFlag]);

  // entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".teaser-console",
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: rootRef.current, start: "top 70%" } },
      );
      gsap.fromTo(
        ".teaser-copy",
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", scrollTrigger: { trigger: rootRef.current, start: "top 72%" } },
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const currentSpeaker = phase === "playing" && turns < teaserScript.length ? teaserScript[turns]?.speaker : undefined;

  return (
    <section ref={rootRef} id="live-demo" className="relative border-t border-ink-700 bg-ink-950 py-24 lg:py-36">
      <div className="pointer-events-none absolute inset-0 bg-dotted-grid opacity-30" />
      <div className="relative mx-auto grid max-w-7xl items-start gap-14 px-6 lg:grid-cols-2">
        {/* sticky copy */}
        <div className="teaser-copy opacity-0 lg:sticky lg:top-32">
          <div className="font-mono text-xs font-medium tracking-[0.14em] text-teal-400">SEE IT WORK</div>
          <h2 className="mt-4 font-display text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-ink-100 lg:text-[56px]">
            This call is <em className="italic text-teal-400">happening right now.</em>
          </h2>
          <p className="mt-4 max-w-md text-[16px] leading-[1.6] text-ink-400">
            A CALL-E agent checks on Margaret Ellis, 72, three days after hip surgery. Watch the conversation —
            and the structured record it builds.
          </p>
          <Link
            to="/app/live"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-teal-glow transition-colors hover:bg-teal-600"
          >
            Open the full console →
          </Link>
        </div>

        {/* console */}
        <div className="teaser-console w-full max-w-[520px] rounded-2xl border border-ink-700 bg-ink-900/90 p-5 opacity-0 shadow-dark-card backdrop-blur lg:justify-self-end">
          {/* patient header */}
          <div className="flex items-center gap-3">
            <img src={assetUrl("/avatar-margaret.png")} alt="Margaret Ellis" className="h-11 w-11 rounded-full object-cover ring-1 ring-ink-700" />
            <div>
              <div className="text-sm font-semibold text-ink-100">Margaret Ellis · 72</div>
              <div className="font-mono text-[11px] text-ink-400">day 3 post-op · 72h check-in</div>
            </div>
            <span className="ml-auto rounded-full border border-ink-700 bg-ink-800 px-2.5 py-1 font-mono text-[10px] text-teal-400">
              Ortho · L hip
            </span>
            <button
              type="button"
              onClick={toggle}
              aria-label={phase === "playing" ? "Pause" : "Play"}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-white transition-colors hover:bg-teal-600",
                phase !== "playing" && "animate-ring-breathe",
              )}
            >
              {phase === "playing" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
            </button>
          </div>

          {/* waveform */}
          <div className="mt-4 overflow-hidden rounded-xl bg-ink-800/70">
            <WaveformCanvas speaking={phase === "playing" ? (currentSpeaker ?? "listening") : "idle"} variant="bars" height={64} />
          </div>

          {/* transcript */}
          <div ref={scrollRef} className="scroll-thin mt-4 max-h-[300px] space-y-3 overflow-y-auto pr-1">
            {turns === 0 && phase === "idle" && (
              <div className="py-8 text-center font-mono text-xs text-ink-400">press ▶ to replay this morning's call</div>
            )}
            {teaserScript.slice(0, turns).map((line, i) => (
              <div key={i} className="animate-[fadeSlideUp_.35s_ease-out]">
                <TranscriptBubble speaker={line.speaker} text={line.text} flagQuote={line.flagQuote} dark />
              </div>
            ))}
            {phase === "playing" && turns < teaserScript.length && teaserScript[turns]?.speaker === "patient" && (
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-tr-sm bg-ink-700 px-4 py-3">
                  <span className="inline-flex gap-1">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-ink-400" style={{ animationDelay: `${d * 0.2}s` }} />
                    ))}
                  </span>
                </div>
              </div>
            )}
            {showFlag && (
              <div className="flex justify-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <span className="inline-block animate-[popIn_.35s_cubic-bezier(.34,1.56,.64,1)]">
                      <RedFlagChip label="wound discharge" confidence={0.87} dark onClick={() => undefined} />
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 border-ink-700 bg-ink-800 text-ink-100">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-coral-400">red-flag detection</div>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
                      matched <span className="text-ink-100">"redness"</span> + <span className="text-ink-100">"incision"</span> →
                      wound-infection protocol. Confidence 0.87 ≥ 0.8 threshold — escalation rule armed.
                    </p>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* extraction card */}
          <div className="mt-4 rounded-xl border border-violet-500/25 bg-ink-800/60 p-3.5">
            <div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-violet-400">
              <span className={cn("h-1.5 w-1.5 rounded-full bg-violet-400", phase === "playing" && "animate-pulse-dot")} />
              structured result · building live
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ExtractionField label="Pain" value={extractions.pain} confidence={0.93} />
              <ExtractionField label="Meds" value={extractions.meds} confidence={0.95} />
              <ExtractionField label="Wound" value={extractions.wound} confidence={0.87} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
