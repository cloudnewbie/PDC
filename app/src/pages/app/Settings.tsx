import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bell,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FlaskConical,
  Globe,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Mic2,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Unplug,
  Webhook,
  Zap,
} from "lucide-react";
import { getCallEClient, useCallEMode } from "@/lib/calle";
import { callRecords, careTeam, escalations, patients } from "@/data/seed";
import { CodeBlock } from "@/components/shared/CodeBlock";
import { TypedLog } from "@/components/pages/settings/TypedLog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const SDK_SNIPPET = `import { CalleClient } from "@call-e/calle";

const live = !!import.meta.env.VITE_CALLE_API_KEY;

export const calle = new CalleClient({
  apiKey: import.meta.env.VITE_CALLE_API_KEY,  // calle_live_…
});                                            // demo engine when unset

// used by: console, campaigns, escalations
const call = await calle.calls.createAndWait({
  task: "Post-discharge check-in: pain, meds, wound, follow-up…",
  resultSchema: pdcResultSchema,
});
call.status;               // "completed"
call.taskCompleted;        // true
call.completionConfidence; // { score: 0.92, label: "high" }
call.structuredResult;     // extracted clinical fields → escalation rules
call.evidence;             // supporting quotes from the transcript`;

type Section = "integration" | "voice" | "notifications" | "privacy";

const SECTIONS: { key: Section; label: string; icon: typeof Zap }[] = [
  { key: "integration", label: "Integration", icon: Zap },
  { key: "voice", label: "Voice & persona", icon: Mic2 },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "privacy", label: "Data & privacy", icon: ShieldCheck },
];

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white p-5 shadow-card", className)}>{children}</div>
  );
}

/* =========================================================== INTEGRATION */

function IntegrationSection() {
  const { mode, hasKey, status, setApiKey, clearApiKey } = useCallEMode();
  const client = getCallEClient();
  const [keyDraft, setKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [testActive, setTestActive] = useState(false);
  const [hookLog, setHookLog] = useState<string[]>([]);
  const [hookActive, setHookActive] = useState(false);
  const [endpoint, setEndpoint] = useState("https://ehr.example.org/hooks/pdc");
  const [events, setEvents] = useState<Record<string, boolean>>({
    "call.completed": true,
    "red_flag.detected": true,
    "escalation.created": true,
    "result.ready": true,
  });
  const [secret, setSecret] = useState("whsec_9f2c4e1ab7d3");
  const live = mode === "live";

  const runTest = async () => {
    setTesting(true);
    setTestActive(false);
    const res = await client.testConnection();
    setTestLog(res.log);
    setTestActive(true);
    setTesting(false);
    if (res.ok) toast.success(`Connection healthy · ${res.latencyMs}ms`, { description: live ? "Live CALL-E API reachable" : "Simulated handshake — demo mode" });
    else toast.error("Connection failed", { description: "Check the API key and network" });
  };

  const saveKey = () => {
    if (!keyDraft.trim()) return;
    setApiKey(keyDraft);
    setKeyDraft("");
    toast.success("Live mode enabled — calls will be placed via CALL-E", {
      description: "The adapter now targets api.heycall-e.com with your key.",
    });
  };

  const fireHook = () => {
    setHookActive(false);
    const enabled = Object.entries(events).filter(([, v]) => v).map(([k]) => k);
    setHookLog([
      `→ POST ${endpoint}`,
      `  event: result.ready · subscribed: [${enabled.join(", ")}]`,
      "  x-pdc-signature: sha256=9f2c…e41a",
      "← 200 OK · 184ms (simulated)",
      "✓ delivery recorded in integration audit log",
    ]);
    requestAnimationFrame(() => setHookActive(true));
    toast.success("Test event delivered", { description: "Simulated delivery — demo mode" });
  };

  return (
    <div className="space-y-5">
      {/* 1a — connection status */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                  live ? "border-green-500/30 bg-green-500/10 text-green-600" : "border-amber-500/30 bg-amber-500/10 text-amber-700",
                )}
              >
                <span className={cn("h-1.5 w-1.5 animate-pulse-dot rounded-full", live ? "bg-green-500" : "bg-amber-500")} />
                {live ? "Live · CALL-E" : "Demo Mode"}
              </span>
              <span className="tnum font-mono text-[11px] text-slate-400">p95 {status.latencyMs}ms</span>
            </div>
            <h4 className="mt-3 text-base font-semibold text-slate-900">
              {live ? "Connected to api.heycall-e.com" : "Running on the built-in simulation engine"}
            </h4>
            <p className="mt-1 max-w-lg text-[13px] leading-relaxed text-slate-500">
              {live
                ? `workspace: ${status.workspace} · 38/50 calls remaining today · real PSTN calls enabled`
                : "Every call, transcript, and extraction is generated locally through the same adapter interface — no real calls are placed."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runTest}
              disabled={testing}
              className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:border-teal-500/50 hover:text-teal-700 disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
              Test connection
            </button>
            <a
              href="https://docs.heycall-e.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[13px] font-semibold text-teal-600 hover:underline"
            >
              View API docs
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <TypedLog lines={testLog} active={testActive} className="mt-4 min-h-[96px]" />
      </Card>

      {/* 1b — adapter mode */}
      <Card className="relative overflow-hidden">
        <AnimatePresence>
          {live && (
            <motion.div
              key="sweep"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-transparent via-green-500/15 to-transparent"
            />
          )}
        </AnimatePresence>
        <h4 className="text-base font-semibold text-slate-900">Adapter mode</h4>
        <p className="mt-1 text-[13px] text-slate-500">One interface — swap the engine without touching page code.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <motion.button
            type="button"
            onClick={() => {
              if (live) toast("Remove the API key below to return to Demo mode");
            }}
            whileTap={{ scale: 0.98 }}
            animate={{ scale: !live ? 1 : 0.98 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "rounded-2xl border-2 p-4 text-left transition-colors",
              !live ? "border-amber-500/60 bg-amber-500/5" : "border-line bg-white hover:border-slate-300",
            )}
          >
            <div className="flex items-center justify-between">
              <FlaskConical className="h-5 w-5 text-amber-500" />
              {!live && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">ACTIVE</span>}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">Demo Simulation</div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">Scripted engine. Zero real calls. Perfect for demos.</p>
            <p className="mt-2 font-mono text-[10px] text-slate-400">Same interface: planCall · startCall · events · getStructuredResult</p>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => {
              if (!live) toast("Add an API key below to enable Live mode");
            }}
            whileTap={{ scale: 0.98 }}
            animate={{ scale: live ? 1 : 0.98 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "rounded-2xl border-2 p-4 text-left transition-colors",
              live ? "border-green-500/60 bg-green-500/5" : "border-line bg-white hover:border-slate-300",
            )}
          >
            <div className="flex items-center justify-between">
              <Radio className="h-5 w-5 text-green-500" />
              {live && <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold text-green-700">ACTIVE</span>}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">Live CALL-E</div>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">Real PSTN calls via the CALL-E platform.</p>
            <p className="mt-2 font-mono text-[10px] text-slate-400">{live ? `key: ${"•".repeat(8)} · workspace ${status.workspace}` : "requires an API key"}</p>
          </motion.button>
        </div>

        {/* api key */}
        <div className="mt-4">
          <label htmlFor="api-key" className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            CALL-E API key
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder={hasKey ? "••••••••••••••••  (key saved)" : "calle_live_…"}
                className="border-line font-mono text-[13px] pr-9"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={saveKey}
              disabled={!keyDraft.trim()}
              className="rounded-xl bg-teal-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-teal-600 disabled:opacity-40"
            >
              Save key
            </button>
          </div>
          {hasKey && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-coral-500 hover:underline">
                  <Unplug className="h-3.5 w-3.5" />
                  Remove key & return to demo mode
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Return to demo mode?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The saved API key will be removed from this browser. All calls will go back to the built-in simulation engine.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep live mode</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      clearApiKey();
                      toast.success("Demo mode restored", { description: "API key removed — simulation engine active" });
                    }}
                  >
                    Remove key
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </Card>

      {/* 1c — how it's wired */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
        <CodeBlock code={SDK_SNIPPET} filename="src/lib/calle.ts" title="src/lib/calle.ts — how CALL-E is wired" />
        <div className="mt-3 flex flex-wrap gap-2">
          {["imported at runtime ✓", "invoked on every call ✓", "mode visible in-app ✓"].map((chip, i) => (
            <motion.span
              key={chip}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 400, damping: 20 }}
              className="rounded-full border border-violet-500/40 px-3 py-1 font-mono text-[11px] font-semibold text-violet-600"
            >
              {chip}
            </motion.span>
          ))}
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(SDK_SNIPPET);
              } catch {
                /* ignore */
              }
              toast.success("Snippet copied");
            }}
            className="flex items-center gap-1 rounded-full border border-line px-3 py-1 font-mono text-[11px] text-slate-500 transition-colors hover:border-violet-500/50 hover:text-violet-600"
          >
            <Copy className="h-3 w-3" />
            copy
          </button>
        </div>
      </motion.div>

      {/* 1d — webhooks */}
      <Card>
        <div className="flex items-center gap-2">
          <Webhook className="h-4 w-4 text-violet-500" />
          <h4 className="text-base font-semibold text-slate-900">Webhooks</h4>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="hook-url" className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Endpoint
            </label>
            <Input
              id="hook-url"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="mt-1.5 border-line font-mono text-[13px]"
            />
          </div>
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Events</div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {Object.entries(events).map(([ev, on]) => (
                <label key={ev} className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                  <Checkbox checked={on} onCheckedChange={(v) => setEvents((prev) => ({ ...prev, [ev]: v === true }))} />
                  <span className="font-mono text-[12px]">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Signing secret</div>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="rounded-lg bg-paper px-3 py-1.5 font-mono text-[12px] text-slate-600">
                  {secret.slice(0, 6)}{"•".repeat(10)}
                </code>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button type="button" className="flex items-center gap-1 text-[12px] font-semibold text-slate-600 hover:text-coral-500">
                      <RefreshCw className="h-3 w-3" />
                      Regenerate
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Regenerate signing secret?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Existing endpoint integrations must be updated with the new secret or signature verification will fail.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setSecret(`whsec_${Math.random().toString(16).slice(2, 16)}`);
                          toast.success("Signing secret regenerated");
                        }}
                      >
                        Regenerate
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <button
              type="button"
              onClick={fireHook}
              className="rounded-xl border border-violet-500/40 px-3.5 py-2 text-[13px] font-semibold text-violet-600 transition-colors hover:bg-violet-500/10"
            >
              Send test event
            </button>
          </div>
          <TypedLog lines={hookLog} active={hookActive} className="min-h-[110px]" />
        </div>
      </Card>
    </div>
  );
}

/* ================================================================= VOICE */

const VOICES = [
  { id: "alloy", name: "Alloy", desc: "warm, unhurried", greeting: "Hi Margaret — this is Ellie calling on behalf of Riverside General. How are you feeling today?" },
  { id: "sage", name: "Sage", desc: "bright, clear", greeting: "Hi Margaret! Ellie here, from Riverside General — just checking in after your surgery." },
  { id: "onyx", name: "Onyx", desc: "calm, deep", greeting: "Hello Margaret. This is Ellie, calling for Riverside General. A quick check-in, if you have a moment." },
];

function VoicePreview({ playing, text }: { playing: boolean; text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!playing) {
      setShown(0);
      return;
    }
    const iv = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(iv);
          return n;
        }
        return n + 1;
      });
    }, 24);
    const stop = setTimeout(() => setShown(text.length), text.length * 24 + 100);
    return () => {
      clearInterval(iv);
      clearTimeout(stop);
    };
  }, [playing, text]);

  if (!playing) return null;
  return (
    <div className="mt-3 rounded-xl border border-teal-500/25 bg-teal-50 p-3">
      <div className="flex h-6 items-center gap-[3px]">
        {Array.from({ length: 24 }, (_, i) => (
          <motion.span
            key={i}
            className="w-full rounded-full bg-teal-500/70"
            animate={{ height: ["20%", `${25 + ((i * 37) % 70)}%`, "20%"] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.045, ease: "easeInOut" }}
          />
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-teal-800">
        “{text.slice(0, shown)}
        {shown < text.length && <span className="ml-0.5 inline-block h-3 w-[6px] animate-caret-blink bg-violet-500 align-[-1px]" />}”
      </p>
      <p className="mt-1 font-mono text-[9px] text-teal-600/70">simulated preview — no audio in demo mode</p>
    </div>
  );
}

function VoiceSection() {
  const [voice, setVoice] = useState("alloy");
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [language, setLanguage] = useState("en-US");
  const [autoDetect, setAutoDetect] = useState(true);
  const [rate, setRate] = useState(0.95);
  const [persona, setPersona] = useState(
    "You are 'Ellie', a warm care-coordination assistant calling on behalf of Riverside General. Never diagnose. Always confirm identity. If the patient sounds confused or distressed, slow down and escalate.",
  );
  const [saved, setSaved] = useState(false);
  const [quietFrom, setQuietFrom] = useState("20:00");
  const [quietTo, setQuietTo] = useState("08:00");

  const preview = (id: string) => {
    setPreviewing(id);
    setTimeout(() => setPreviewing((p) => (p === id ? null : p)), 4200);
  };

  return (
    <div className="space-y-5">
      <Card>
        <h4 className="text-base font-semibold text-slate-900">Voice</h4>
        <p className="mt-1 text-[13px] text-slate-500">The voice patients hear on every call.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {VOICES.map((v) => (
            <div
              key={v.id}
              className={cn(
                "relative rounded-2xl border-2 p-4 transition-all",
                voice === v.id ? "border-teal-500 shadow-[0_0_0_3px_rgb(20_184_166/.15)]" : "border-line hover:border-slate-300",
              )}
            >
              <button type="button" onClick={() => setVoice(v.id)} className="block w-full text-left">
                <div className="text-sm font-semibold text-slate-900">{v.name}</div>
                <div className="text-[12px] text-slate-500">{v.desc}</div>
              </button>
              <button
                type="button"
                onClick={() => preview(v.id)}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-teal-500/50 hover:text-teal-700"
              >
                <Play className="h-3 w-3" />
                Preview
              </button>
              <VoicePreview playing={previewing === v.id} text={v.greeting} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <Globe className="h-3 w-3" />
              Language
            </div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1.5 border-line text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="es-US">Español (US)</SelectItem>
              </SelectContent>
            </Select>
            <label className="mt-3 flex items-center gap-2.5 text-[13px] text-slate-700">
              <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
              Auto-detect patient language
            </label>
          </div>
          <div>
            <div className="flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <span>Speaking rate</span>
              <span className="tnum text-[12px] font-semibold text-teal-600">{rate.toFixed(2)}×</span>
            </div>
            <Slider
              value={[rate]}
              onValueChange={([v]) => setRate(v)}
              min={0.75}
              max={1.25}
              step={0.01}
              className="mt-4"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-400">
              <span>0.75×</span>
              <span>1.25×</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Older patients; err slower.</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-slate-900">Persona</h4>
          <AnimatePresence>
            {saved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-semibold text-green-600"
              >
                <Check className="h-3 w-3" />
                Saved ✓
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <p className="mt-1 text-[13px] text-slate-500">Standing instructions injected into every call plan.</p>
        <textarea
          value={persona}
          onChange={(e) => {
            setPersona(e.target.value);
            setSaved(false);
          }}
          onBlur={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
          rows={4}
          className="mt-3 w-full resize-none rounded-xl border border-line bg-paper p-3 text-[13px] leading-relaxed text-slate-900 focus:border-teal-500/50 focus:outline-none"
        />
        <div className="mt-1 text-right font-mono text-[10px] text-slate-400">{persona.length} chars</div>
      </Card>

      <Card>
        <h4 className="text-base font-semibold text-slate-900">Quiet hours</h4>
        <div className="mt-3 flex items-center gap-3">
          <Input type="time" value={quietFrom} onChange={(e) => setQuietFrom(e.target.value)} className="w-32 border-line font-mono text-[13px]" />
          <span className="text-slate-400">→</span>
          <Input type="time" value={quietTo} onChange={(e) => setQuietTo(e.target.value)} className="w-32 border-line font-mono text-[13px]" />
        </div>
        <p className="mt-2 text-[12px] text-slate-500">
          Calls never place outside quiet hours; scheduled items roll to the next window.
        </p>
      </Card>
    </div>
  );
}

/* ======================================================== NOTIFICATIONS */

function ToggleRow({
  icon: Icon,
  label,
  desc,
  checked,
  onChange,
  locked,
  children,
}: {
  icon: typeof Bell;
  label: string;
  desc: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl px-3 py-3 transition-colors hover:bg-paper">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
              {label}
              {locked && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="h-3 w-3 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>Required by escalation policy</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-[12px] text-slate-500">{desc}</p>
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onChange} disabled={locked} />
      </div>
      <AnimatePresence>
        {checked && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="ml-7 mt-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationsSection() {
  const [pageP1, setPageP1] = useState(true);
  const [digest, setDigest] = useState(true);
  const [digestEmail, setDigestEmail] = useState("care-team@riverside.example.org");
  const [slack, setSlack] = useState(false);
  const [slackUrl, setSlackUrl] = useState("");
  const [sms, setSms] = useState(true);
  const [smsPhone, setSmsPhone] = useState("(617) 555-0100");

  return (
    <div className="space-y-5">
      <Card className="divide-y divide-line !p-2">
        <ToggleRow
          icon={Bell}
          label="Page on-call nurse on P1"
          desc="Immediate push + SMS to whoever holds the pager."
          checked={pageP1}
          onChange={setPageP1}
          locked
        />
        <ToggleRow icon={Mail} label="Email digest — daily 07:00" desc="Overnight results, flags, and SLA breaches." checked={digest} onChange={setDigest}>
          <Input value={digestEmail} onChange={(e) => setDigestEmail(e.target.value)} className="max-w-xs border-line font-mono text-[12px]" />
        </ToggleRow>
        <ToggleRow icon={MessageSquare} label="Slack webhook — #care-escalations" desc="Post escalations and resolutions to Slack." checked={slack} onChange={setSlack}>
          <Input
            value={slackUrl}
            onChange={(e) => setSlackUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/…"
            className="max-w-sm border-line font-mono text-[12px]"
          />
        </ToggleRow>
        <ToggleRow icon={Smartphone} label="SMS for breached SLAs" desc="Text the on-call nurse when a P1 exceeds its SLA." checked={sms} onChange={setSms}>
          <Input value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} className="max-w-xs border-line font-mono text-[12px]" />
        </ToggleRow>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-slate-900">On-call rotation</h4>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="rounded-xl border border-line px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:border-teal-500/50 hover:text-teal-700">
                Edit rotation
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit rotation</DialogTitle>
              </DialogHeader>
              <p className="text-[13px] text-slate-500">Pick the days each nurse holds the pager.</p>
              {careTeam.slice(0, 2).map((m) => (
                <div key={m.id} className="mt-2 flex items-center gap-3">
                  <img src={m.avatar} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                  <span className="w-28 text-sm font-medium text-slate-900">{m.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
                      const on = m.id === "nurse-ruiz" ? i <= 2 : i >= 3;
                      return (
                        <span
                          key={d}
                          className={cn(
                            "rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold",
                            on ? "bg-teal-500 text-white" : "bg-paper text-slate-400",
                          )}
                        >
                          {d}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => toast.success("Rotation saved")}
                className="mt-4 rounded-xl bg-teal-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-teal-600"
              >
                Save rotation
              </button>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4 space-y-2">
          {[
            { id: "nurse-ruiz", days: "Mon – Wed" },
            { id: "nurse-obrien", days: "Thu – Sun" },
          ].map((row) => {
            const m = careTeam.find((c) => c.id === row.id)!;
            return (
              <div key={row.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <div className="relative">
                  <img src={m.avatar} alt={m.name} className="h-8 w-8 rounded-full object-cover" />
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white",
                      m.presence === "online" ? "bg-green-500" : m.presence === "busy" ? "bg-amber-500" : "bg-slate-300",
                    )}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{m.name}</div>
                  <div className="text-[11px] text-slate-500">{m.role}</div>
                </div>
                <span className="tnum font-mono text-[11px] text-slate-500">{row.days}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================= PRIVACY */

function PrivacySection() {
  const [consent, setConsent] = useState(true);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex items-start gap-3 rounded-2xl border border-teal-500/25 bg-teal-50 p-4"
      >
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
        <p className="text-[13px] leading-relaxed text-teal-900">
          All patient data in this demo is synthetic. Production deployment: BAA-covered infrastructure, PHI
          encrypted at rest, call recordings retained 30 days.
        </p>
      </motion.div>

      <Card>
        <h4 className="text-base font-semibold text-slate-900">Retention</h4>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Call recordings", def: "30 days", opts: ["7 days", "30 days", "90 days"] },
            { label: "Transcripts", def: "90 days", opts: ["30 days", "90 days", "1 year"] },
            { label: "Structured results", def: "7 years", opts: ["1 year", "7 years", "Indefinite"] },
          ].map((r) => (
            <div key={r.label}>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{r.label}</div>
              <Select defaultValue={r.def}>
                <SelectTrigger className="mt-1.5 border-line text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {r.opts.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Require recorded verbal consent before first call</h4>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              The agent reads: “This call may be recorded to help your care team follow up. Is that okay with you?”
              before any clinical questions.
            </p>
          </div>
          <Switch checked={consent} onCheckedChange={setConsent} />
        </div>
      </Card>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.06, ease: EASE }}
        className="rounded-2xl border-2 border-coral-500/30 bg-white p-5"
      >
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-coral-500" />
          <h4 className="text-base font-semibold text-coral-600">Danger zone</h4>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" className="rounded-xl border border-coral-500/50 px-4 py-2 text-[13px] font-semibold text-coral-600 transition-colors hover:bg-coral-500/10">
                Reset demo data
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
                <AlertDialogDescription>
                  Restores the seed patients, calls, and escalations. Any nurse edits made during this session will be
                  discarded.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => toast.success("Demo data reset", { description: "Seed patients, calls, and escalations restored" })}>
                  Reset data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify({ patients, callRecords, escalations }, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "pdc-demo-export.json";
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Exported all demo data (JSON)");
            }}
            className="rounded-xl border border-line px-4 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300"
          >
            Export all data (JSON)
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ================================================================= PAGE */

export default function Settings() {
  const [section, setSection] = useState<Section>("integration");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-[1400px] p-6 lg:p-8"
    >
      <h3 className="text-2xl font-semibold tracking-[-0.01em] text-slate-900">Settings</h3>
      <p className="mt-1 text-[13px] text-slate-500">
        CALL-E integration, agent voice, notifications, and data policy.
      </p>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* nav rail */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-[200px] lg:flex-col">
          {SECTIONS.map((s) => {
            const active = section === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={cn(
                  "relative flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                  active ? "text-teal-700" : "text-slate-500 hover:bg-white hover:text-slate-900",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="settings-nav"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-teal-50 ring-1 ring-teal-500/20"
                  />
                )}
                <s.icon className={cn("relative z-10 h-4 w-4", active ? "text-teal-600" : "text-slate-400")} />
                <span className="relative z-10">{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* content */}
        <div className="w-full max-w-3xl min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {section === "integration" && <IntegrationSection />}
              {section === "voice" && <VoiceSection />}
              {section === "notifications" && <NotificationsSection />}
              {section === "privacy" && <PrivacySection />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
