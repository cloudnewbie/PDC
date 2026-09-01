import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  Braces,
  Copy,
  Mic,
  MicOff,
  MoreVertical,
  PhoneOff,
  Radar,
  RotateCcw,
  Siren,
  Sparkles,
} from "lucide-react";
import {
  getCallEClient,
  useCallEMode,
  type AdapterState,
  type CallPlan,
  type StructuredResult,
} from "@/lib/calle";
import { campaigns, patientById, type Patient } from "@/data/seed";
import { WaveformCanvas, type WaveformSpeaker } from "@/components/shared/WaveformCanvas";
import { TranscriptBubble } from "@/components/shared/TranscriptBubble";
import { ExtractionField } from "@/components/shared/ExtractionField";
import { RiskBadge } from "@/components/shared/RiskBadge";
import { StatusPill } from "@/components/shared/StatusPill";
import { SentimentGauge } from "@/components/pages/live/SentimentGauge";
import { EscalateModal } from "@/components/pages/live/EscalateModal";
import { IdleConsole } from "@/components/pages/live/IdleConsole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const STATE_CHAIN: AdapterState[] = ["idle", "planned", "dialing", "connected", "extracting", "completed"];

interface TranscriptItem {
  id: number;
  speaker: "agent" | "patient";
  text: string;
  ts: number;
  flagQuote?: string;
}
interface FlagItem {
  label: string;
  confidence: number;
  quote: string;
  tier: "coral" | "amber";
  ts: number;
}
interface AdaptItem {
  id: number;
  note: string;
  ts: number;
}

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const fmtWall = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });

/* ------------------------------------------- streaming transcript bubble */

function StreamingBubble({
  item,
  baseMs,
  onFlagClick,
  flash,
}: {
  item: TranscriptItem;
  baseMs: number;
  onFlagClick?: () => void;
  flash?: boolean;
}) {
  const isAgent = item.speaker === "agent";
  // agent types at 22ms/char; patient pops in after a brief "composing" beat
  const [shown, setShown] = useState(isAgent ? 0 : -1);

  useEffect(() => {
    if (isAgent) {
      const iv = setInterval(() => {
        setShown((n) => {
          if (n >= item.text.length) {
            clearInterval(iv);
            return n;
          }
          return n + 1;
        });
      }, 22);
      return () => clearInterval(iv);
    }
    const t = setTimeout(() => setShown(item.text.length), 700 + Math.random() * 500);
    return () => clearTimeout(t);
  }, [item.text, isAgent]);

  if (!isAgent && shown < 0) {
    // patient typing ellipsis
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full justify-end">
        <div className="flex items-center gap-1.5 rounded-2xl rounded-tr-sm bg-ink-700 px-4 py-3.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-ink-400"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      onClick={item.flagQuote ? onFlagClick : undefined}
      className={cn(item.flagQuote && "cursor-pointer")}
      title={item.flagQuote ? "Red-flag quote — click to locate in analysis" : undefined}
    >
      <div className={cn("rounded-2xl transition-shadow", flash && "ring-2 ring-teal-400")}>
        <TranscriptBubble
          speaker={item.speaker}
          text={isAgent ? item.text.slice(0, shown) : item.text}
          timestamp={fmtWall(baseMs + item.ts)}
          flagQuote={item.flagQuote}
          dark
        />
      </div>
    </motion.div>
  );
}

/* ---------------------------------------------------------- console page */

export default function LiveCall() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mode } = useCallEMode();
  const client = useMemo(() => getCallEClient(), []);

  const [patient, setPatient] = useState<Patient>(() => patientById("margaret-ellis")!);
  const [adapterState, setAdapterState] = useState<AdapterState>("idle");
  const [plan, setPlan] = useState<CallPlan | null>(null);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [flags, setFlags] = useState<FlagItem[]>([]);
  const [adaptations, setAdaptations] = useState<AdaptItem[]>([]);
  const [sentiment, setSentiment] = useState({ score: 0.12, label: "listening" });
  const [extraction, setExtraction] = useState<Record<string, { value: string; confidence: number }>>({});
  const [speaker, setSpeaker] = useState<WaveformSpeaker>("idle");
  const [muted, setMuted] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [result, setResult] = useState<StructuredResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [flashFlag, setFlashFlag] = useState<string | null>(null);
  const [flashBubble, setFlashBubble] = useState<number | null>(null);
  const [riskFlash, setRiskFlash] = useState(0);
  const [escalatePulse, setEscalatePulse] = useState(false);

  const runIdRef = useRef(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const callIdRef = useRef<string | null>(null);
  const connectAtRef = useRef(0);
  const speakerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const flagsCardRef = useRef<HTMLDivElement>(null);
  const bubbleRefs = useRef(new Map<number, HTMLDivElement>());

  const live = adapterState !== "idle";
  const connected = adapterState === "connected" || adapterState === "extracting";
  const escalateEnabled = flags.length > 0;

  /* --------------------------------------------------------- call control */

  const reset = useCallback(() => {
    runIdRef.current++;
    cancelRef.current?.();
    cancelRef.current = null;
    callIdRef.current = null;
    if (speakerTimerRef.current) clearTimeout(speakerTimerRef.current);
    setAdapterState("idle");
    setPlan(null);
    setTranscript([]);
    setFlags([]);
    setAdaptations([]);
    setSentiment({ score: 0.12, label: "listening" });
    setExtraction({});
    setSpeaker("idle");
    setResult(null);
    setElapsed(0);
    setEscalated(false);
    setEscalateOpen(false);
    setEscalatePulse(false);
  }, []);

  const start = useCallback(
    async (patientId?: string, phone?: string) => {
      reset();
      const p = patientById(patientId ?? "margaret-ellis") ?? patientById("margaret-ellis")!;
      setPatient(p);
      const runId = ++runIdRef.current;
      const alive = () => runIdRef.current === runId;
      try {
        const camp = campaigns.find((c) => c.id === p.campaignId);
        const planned = await client.planCall(
          {
            campaignId: camp?.id,
            cadence: p.nextCall?.cadence ?? "72h",
            instructions: camp?.goals ?? "Post-discharge check-in.",
            voice: "alloy",
            language: p.language === "Español" ? "es-US" : "en-US",
          },
          p,
        );
        if (!alive()) return;
        setPlan(planned);
        const callId = await client.startCall(planned, { phone });
        if (!alive()) return;
        callIdRef.current = callId;

        cancelRef.current = client.streamCall(callId, {
          onStateChange: (s) => {
            if (!alive()) return;
            setAdapterState(s);
            if (s === "connected") {
              connectAtRef.current = Date.now();
              toast.success(`Call connected to ${p.firstName} ${p.name.split(" ").slice(-1)}`, {
                description: `via CALL-E adapter · ${client.getMode()} mode`,
              });
            }
            if (s === "dialing") setSpeaker("listening");
          },
          onTranscript: (e) => {
            if (!alive()) return;
            const id = ++idRef.current;
            setTranscript((prev) => [...prev, { id, speaker: e.speaker, text: e.text, ts: e.ts, flagQuote: e.flagQuote }]);
            setSpeaker(e.speaker);
            if (speakerTimerRef.current) clearTimeout(speakerTimerRef.current);
            speakerTimerRef.current = setTimeout(
              () => alive() && setSpeaker("listening"),
              Math.max(2000, e.text.length * 45),
            );
          },
          onRedFlag: (e) => {
            if (!alive()) return;
            setFlags((prev) => {
              if (prev.length === 0) {
                setEscalatePulse(true);
                setTimeout(() => alive() && setEscalatePulse(false), 1600);
              }
              return [...prev, e];
            });
            toast(e.tier === "coral" ? "Red flag detected" : "Flag logged", {
              description: `${e.label} · confidence ${e.confidence.toFixed(2)}`,
              icon: <Siren className="h-4 w-4 text-coral-500" />,
            });
          },
          onAdaptation: (e) => {
            if (!alive()) return;
            setAdaptations((prev) => [...prev, { id: ++idRef.current, note: e.note, ts: e.ts }]);
          },
          onExtraction: (e) => {
            if (!alive()) return;
            setExtraction((prev) => ({ ...prev, [e.field]: { value: e.value, confidence: e.confidence } }));
            if (e.field === "risk_score") setRiskFlash((n) => n + 1);
          },
          onSentiment: (e) => {
            if (!alive()) return;
            setSentiment({ score: e.score, label: e.label });
          },
          onEnded: (outcome) => {
            if (!alive()) return;
            setResult(outcome);
            setSpeaker("idle");
            if (outcome.outcome.startsWith("failed")) {
              toast.error("Call failed", { description: outcome.recommendedAction });
            } else {
              toast.success("Call completed — structured result ready", {
                description: `${outcome.flags.length} flags · risk ${outcome.riskBefore.toFixed(2)} → ${outcome.riskAfter.toFixed(2)}`,
              });
            }
          },
          onError: (err) => toast.error("CALL-E stream error", { description: err.message }),
        });
      } catch (err) {
        if (alive()) {
          setAdapterState("failed");
          toast.error("Could not start call", { description: (err as Error).message });
        }
      }
    },
    [client, reset],
  );

  const endCall = useCallback(async () => {
    cancelRef.current?.();
    cancelRef.current = null;
    runIdRef.current++;
    setSpeaker("idle");
    try {
      const id = callIdRef.current ?? plan?.id ?? "call-1042";
      await client.endCall(id);
      // fetch what CALL-E has extracted so far — same call the results page makes
      const r = await client.getStructuredResult(id);
      setResult(r);
      setExtraction((prev) => ({ ...r.extraction, ...prev }));
      setAdapterState("completed");
    } catch {
      setAdapterState("ended");
    }
  }, [client, plan]);

  /* ------------------------------------------------------------- effects */

  // autostart via URL params
  useEffect(() => {
    if (searchParams.get("autostart") === "1") {
      const t = setTimeout(() => start(searchParams.get("patient") ?? "margaret-ellis"), 1200);
      return () => clearTimeout(t);
    }
  }, [searchParams, start]);

  // cleanup on unmount
  useEffect(
    () => () => {
      runIdRef.current++;
      cancelRef.current?.();
      if (speakerTimerRef.current) clearTimeout(speakerTimerRef.current);
    },
    [],
  );

  // call timer — ticks every second while connected
  useEffect(() => {
    if (!connected) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - connectAtRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [connected]);

  // auto-scroll transcript (throttled with rAF)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stop = setTimeout(() => cancelAnimationFrame(raf), 1200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(stop);
    };
  }, [transcript.length]);

  /* ------------------------------------------------------------- helpers */

  const jumpToFlag = (label: string) => {
    setFlashFlag(label);
    flagsCardRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setFlashFlag(null), 1400);
  };
  const jumpToQuote = (quote: string) => {
    const item = transcript.find((t) => t.text.includes(quote));
    if (!item) return;
    bubbleRefs.current.get(item.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashBubble(item.id);
    setTimeout(() => setFlashBubble(null), 1400);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result ?? { extraction }, null, 2));
    } catch {
      /* clipboard unavailable */
    }
    toast.success("Structured JSON copied");
  };

  const extractionFields = plan?.extractionFields ?? [
    "pain_score",
    "med_adherence.apixaban",
    "wound.status",
    "wound.fever",
    "appointment.follow_up",
    "sentiment",
    "risk_score",
    "recommended_action",
  ];

  const contextLine = [
    `72h post ${patient.procedure.replace("Left total hip arthroplasty", "L hip replacement")}.`,
    extraction["wound.status"] ? `Reports incision ${extraction["wound.status"].value.replace(" reported", "")}, ${extraction["wound.fever"] ? "afebrile" : "fever unconfirmed"}.` : "",
    extraction["med_adherence.apixaban"] ? `${extraction["med_adherence.apixaban"].value} apixaban.` : "",
    extraction["pain_score"] ? `Pain ${extraction["pain_score"].value.split(" ")[0]}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const statusLabel =
    adapterState === "dialing" ? "dialing" : connected ? "connected" : adapterState === "completed" ? "completed" : "scheduled";

  /* -------------------------------------------------------------- render */

  if (!live) {
    return (
      <div className="bg-ink-950 bg-dotted-grid">
        <IdleConsole onStart={start} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="min-h-[calc(100dvh-64px)] bg-ink-950 bg-dotted-grid text-ink-100"
    >
      {/* --------------------------------------------------- console header */}
      <div className="flex h-16 items-center justify-between gap-4 border-b border-ink-700 bg-ink-900/90 px-4 backdrop-blur lg:px-6">
        {/* left: patient chip */}
        <div className="flex min-w-0 items-center gap-3">
          <img src={patient.avatar} alt={patient.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-teal-500/30" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {patient.name} · {patient.age}
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-ink-800 px-2 py-0.5 font-mono text-[10px] text-ink-400">
                {patient.cohortLabel} · day {patient.dayPost}
              </span>
              <RiskBadge level={patient.riskLevel} className="hidden sm:inline-flex" />
            </div>
          </div>
        </div>

        {/* center: status + timer + adapter state */}
        <div className="hidden flex-col items-center md:flex">
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.span
                key={statusLabel}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <StatusPill status={statusLabel} />
              </motion.span>
            </AnimatePresence>
            {connected && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="tnum font-mono text-xl font-medium text-teal-400 [text-shadow:0_0_18px_rgb(45_212_191/.45)]"
              >
                {fmtClock(elapsed * 1000)}
              </motion.span>
            )}
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                mode === "live" ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-dot", mode === "live" ? "bg-green-500" : "bg-amber-500")} />
              {mode === "live" ? "Live · CALL-E" : "Demo Mode"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 font-mono text-[11px] text-ink-400">
            {STATE_CHAIN.map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && <span className="text-ink-700">→</span>}
                <span className={cn(s === adapterState && "font-semibold text-teal-400")}>{s}</span>
              </span>
            ))}
          </div>
        </div>

        {/* right: controls */}
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setMuted((m) => !m);
                    toast(muted ? "Monitor audio unmuted" : "Monitor audio muted");
                  }}
                  className="rounded-xl border border-ink-700 p-2 text-ink-400 transition-colors hover:border-ink-400 hover:text-ink-100"
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>Mute call monitor</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            type="button"
            onClick={endCall}
            disabled={!connected}
            className="flex items-center gap-1.5 rounded-xl border border-coral-500/50 px-3 py-2 text-sm font-semibold text-coral-400 transition-colors hover:bg-coral-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PhoneOff className="h-4 w-4" />
            <span className="hidden sm:inline">End call</span>
          </button>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <motion.button
                    layoutId="escalate-morph"
                    type="button"
                    disabled={!escalateEnabled}
                    onClick={() => setEscalateOpen(true)}
                    animate={
                      escalatePulse
                        ? { boxShadow: ["0 0 0 0 rgb(244 63 94 / .6)", "0 0 0 14px rgb(244 63 94 / 0)", "0 0 0 0 rgb(244 63 94 / 0)"] }
                        : { boxShadow: "0 0 0 0 rgb(244 63 94 / 0)" }
                    }
                    transition={{ duration: 1.4 }}
                    className="flex items-center gap-1.5 rounded-xl bg-coral-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Siren className="h-4 w-4" />
                    <span className="hidden lg:inline">Escalate to nurse</span>
                  </motion.button>
                </span>
              </TooltipTrigger>
              {!escalateEnabled && <TooltipContent>Enabled when the agent detects a red flag</TooltipContent>}
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-xl border border-ink-700 p-2 text-ink-400 transition-colors hover:border-ink-400 hover:text-ink-100"
                aria-label="More call actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-ink-700 bg-ink-900 text-ink-100">
              <DropdownMenuItem onClick={() => toast("Transfer requested", { description: "Demo console — transfer is simulated." })}>
                Transfer call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast("Voice takeover", { description: "Demo console — voice takeover is simulated." })}>
                Take over voice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* --------------------------------------------------------- main grid */}
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12 lg:p-6">
        {/* 2a — transcript column */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          {/* waveform strip */}
          <div className="relative h-24 overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-dark-card">
            {adapterState === "dialing" ? (
              <div className="absolute inset-0 flex items-center justify-center">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute h-10 w-10 rounded-full border-2 border-teal-400/60"
                    animate={{ scale: [1, 3.2], opacity: [0.7, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                  />
                ))}
                <span className="relative font-mono text-xs text-teal-400">
                  DIALING {patient.phone}…
                </span>
              </div>
            ) : (
              <WaveformCanvas speaking={speaker} variant="bars" height={96} />
            )}
            <AnimatePresence mode="wait">
              <motion.span
                key={speaker}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em]",
                  speaker === "agent"
                    ? "bg-teal-500/15 text-teal-400"
                    : speaker === "patient"
                      ? "bg-violet-500/15 text-violet-400"
                      : "bg-ink-800 text-ink-400",
                )}
              >
                {speaker === "agent" ? "Agent speaking" : speaker === "patient" ? "Patient speaking" : "Listening"}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* summary banner after end */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: -24, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-teal-500/30 bg-ink-900 p-4 shadow-teal-glow">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-coral-500/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-coral-400">
                      Risk {result.riskAfter.toFixed(2)} ↑
                    </span>
                    <span className="rounded-full bg-ink-800 px-2.5 py-1 font-mono text-[11px] text-ink-100">
                      {result.flags.length} flags
                    </span>
                    {escalated && (
                      <span className="rounded-full bg-coral-500/15 px-2.5 py-1 font-mono text-[11px] text-coral-400">
                        Escalated → Nurse Ruiz
                      </span>
                    )}
                    <span className="tnum rounded-full bg-ink-800 px-2.5 py-1 font-mono text-[11px] text-ink-100">
                      Duration {Math.floor(result.durationSec / 60)}m {result.durationSec % 60}s
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/app/results?id=${result.callId}`)}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-500 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-teal-600"
                    >
                      View full result
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reset()}
                      className="flex items-center gap-1.5 rounded-xl border border-ink-700 px-3.5 py-2 text-[13px] font-semibold text-ink-100 transition-colors hover:border-teal-500/50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Start next call
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* transcript stream */}
          <div
            ref={scrollRef}
            className="scroll-thin flex min-h-[320px] flex-col gap-3 overflow-y-auto rounded-2xl border border-ink-700 bg-ink-900/60 p-4 shadow-dark-card lg:h-[calc(100dvh-420px)]"
          >
            {transcript.length === 0 && (
              <div className="flex flex-1 items-center justify-center py-10 text-center font-mono text-xs text-ink-400">
                {mode === "live"
                  ? "Waiting for CALL-E events…"
                  : adapterState === "dialing"
                    ? "Waiting for the patient to pick up…"
                    : "Connecting audio stream…"}
              </div>
            )}
            {transcript.map((item) => (
              <div key={item.id} ref={(el) => { if (el) bubbleRefs.current.set(item.id, el); }}>
                <StreamingBubble
                  item={item}
                  baseMs={connectAtRef.current}
                  flash={flashBubble === item.id}
                  onFlagClick={item.flagQuote ? () => jumpToFlag(flags.find((f) => item.text.includes(f.quote))?.label ?? "") : undefined}
                />
              </div>
            ))}
            {connected && transcript.length > 0 && transcript[transcript.length - 1].speaker === "agent" && (
              <div className="flex w-full justify-end">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tr-sm bg-ink-700/60 px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-ink-400"
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2b — detection column */}
        <div className="scroll-thin flex flex-col gap-4 lg:col-span-3 lg:h-[calc(100dvh-176px)] lg:overflow-y-auto">
          {/* red flags */}
          <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4 shadow-dark-card">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-ink-100">Red flags</h4>
              <span className="tnum font-mono text-[11px] text-ink-400">{flags.length} detected</span>
            </div>
            <div ref={flagsCardRef} className="scroll-thin flex max-h-64 flex-col gap-2.5 overflow-y-auto">
              {flags.length === 0 && (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-ink-700 px-4 py-8 text-center">
                  <Radar className="h-5 w-5 animate-pulse-dot text-teal-400" />
                  <p className="mt-2 text-[12px] text-ink-400">Listening for red flags…</p>
                </div>
              )}
              <AnimatePresence>
                {flags.map((f) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      boxShadow:
                        flashFlag === f.label
                          ? ["0 0 0 0 rgb(244 63 94 / .7)", "0 0 0 10px rgb(244 63 94 / 0)"]
                          : "0 0 0 0 rgb(244 63 94 / 0)",
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                    className={cn(
                      "rounded-xl border p-3",
                      f.tier === "coral" ? "border-coral-500/30 bg-coral-500/10" : "border-amber-500/30 bg-amber-500/10",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("text-[13px] font-semibold capitalize", f.tier === "coral" ? "text-coral-400" : "text-amber-400")}>
                        {f.label}
                      </span>
                      <span className="tnum font-mono text-[11px] text-ink-400">{fmtClock(f.ts)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${f.confidence * 100}%` }}
                        transition={{ duration: 0.6, ease: EASE }}
                        className={cn("h-full rounded-full", f.tier === "coral" ? "bg-coral-500" : "bg-amber-500")}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="tnum font-mono text-[10px] text-ink-400">confidence {f.confidence.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => jumpToQuote(f.quote)}
                        className="font-mono text-[10px] text-teal-400 hover:underline"
                      >
                        locate quote
                      </button>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[11px] italic leading-relaxed text-ink-400">“{f.quote}”</p>
                    <button
                      type="button"
                      onClick={() => setEscalateOpen(true)}
                      className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-coral-400 hover:underline"
                    >
                      <Siren className="h-3 w-3" />
                      Escalate with this flag
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* adaptation events */}
          <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4 shadow-dark-card">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <h4 className="text-sm font-semibold text-ink-100">Agent adaptations</h4>
            </div>
            <div className="flex flex-col gap-2">
              {adaptations.length === 0 && (
                <p className="rounded-xl border border-dashed border-ink-700 px-3 py-4 text-center text-[12px] text-ink-400">
                  The agent adapts its script as signals arrive.
                </p>
              )}
              <AnimatePresence>
                {adaptations.map((a) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="flex items-start gap-2.5 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2.5"
                  >
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                    <div className="min-w-0">
                      <p className="text-[12px] leading-snug text-ink-100">{a.note}</p>
                      <p className="tnum mt-0.5 font-mono text-[10px] text-ink-400">{fmtWall(connectAtRef.current + a.ts)}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* sentiment gauge */}
          <div className="flex flex-col items-center rounded-2xl border border-ink-700 bg-ink-900 p-4 shadow-dark-card">
            <h4 className="mb-2 self-start text-sm font-semibold text-ink-100">Sentiment</h4>
            <SentimentGauge score={sentiment.score} label={sentiment.label} />
          </div>
        </div>

        {/* 2c — extraction column */}
        <div className="lg:col-span-4">
          <motion.div
            key={riskFlash}
            animate={riskFlash > 0 ? { borderColor: ["#8B5CF6", "#F43F5E", "#8B5CF6"] } : {}}
            transition={{ duration: 1.2 }}
            className={cn(
              "rounded-2xl border-2 bg-ink-900 p-4 shadow-dark-card transition-shadow duration-700",
              adapterState === "completed" ? "border-teal-500/60 shadow-teal-glow" : "border-violet-500/40",
            )}
            style={{
              backgroundImage: "linear-gradient(#0C1426, #0C1426), linear-gradient(135deg, rgb(45 212 191 / .25), rgb(139 92 246 / .25))",
              backgroundOrigin: "border-box",
              backgroundClip: "padding-box, border-box",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Braces className="h-4 w-4 text-violet-400" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-100">
                  Structured result
                </span>
                {adapterState !== "completed" && <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-violet-400" />}
              </div>
              <div className="flex items-center gap-2">
                {adapterState === "completed" && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-teal-400"
                  >
                    Complete ✓
                  </motion.span>
                )}
                <button
                  type="button"
                  onClick={copyJson}
                  className="flex items-center gap-1 rounded-lg border border-ink-700 px-2 py-1 font-mono text-[10px] text-ink-400 transition-colors hover:border-violet-500/50 hover:text-ink-100"
                >
                  <Copy className="h-3 w-3" />
                  Copy JSON
                </button>
              </div>
            </div>
            <p className="mb-3 font-mono text-[10px] text-ink-400">
              building live via <span className="text-violet-400">calle.streamCall()</span> events
            </p>

            <div className="flex flex-col gap-2.5">
              {extractionFields.map((field) => {
                const e = extraction[field];
                const isRisk = field === "risk_score";
                return (
                  <motion.div
                    key={field}
                    animate={isRisk && riskFlash > 0 ? { backgroundColor: ["rgb(244 63 94 / 0)", "rgb(244 63 94 / .12)", "rgb(244 63 94 / 0)"] } : {}}
                    transition={{ duration: 1.4 }}
                    className="rounded-xl"
                  >
                    <ExtractionField
                      label={field}
                      value={e?.value}
                      confidence={e?.confidence}
                      dark
                      onEdit={
                        e
                          ? () =>
                              toast("Nurse edit", {
                                description: `${field} marked verified — corrections persist to the audit trail.`,
                              })
                          : undefined
                      }
                    />
                  </motion.div>
                );
              })}
            </div>

            <details className="group mt-4 rounded-xl border border-ink-700 bg-ink-950/60">
              <summary className="cursor-pointer list-none px-3 py-2.5 font-mono text-[11px] text-ink-400 transition-colors hover:text-ink-100">
                <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
                raw JSON — this is exactly what CALL-E returns
              </summary>
              <pre className="scroll-thin max-h-56 overflow-auto border-t border-ink-700 p-3 font-mono text-[11px] leading-relaxed text-teal-300">
                {JSON.stringify(result ?? { callId: callIdRef.current ?? plan?.id ?? "…", extraction }, null, 2)}
              </pre>
            </details>
          </motion.div>
        </div>
      </div>

      {/* escalate modal */}
      <EscalateModal
        open={escalateOpen}
        onClose={() => setEscalateOpen(false)}
        patient={patient}
        flags={flags}
        contextLine={contextLine}
        onEscalated={() => setEscalated(true)}
      />
    </motion.div>
  );
}
