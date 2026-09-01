import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bone, Check, ChevronLeft, HeartPulse, Scissors, Sparkles, Wind, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Cohort, RiskLevel } from "@/data/seed";
import { COHORT_LABELS, campaigns } from "@/data/seed";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const COHORT_ICONS: Record<Cohort, LucideIcon> = {
  cardiac: HeartPulse,
  ortho: Bone,
  surgical: Scissors,
  copd: Wind,
};

const RISK_SUGGEST: Record<Cohort, { score: number; level: RiskLevel }> = {
  cardiac: { score: 0.7, level: "high" },
  ortho: { score: 0.5, level: "moderate" },
  surgical: { score: 0.3, level: "low" },
  copd: { score: 0.4, level: "moderate" },
};

const COMORBIDITIES = ["diabetes", "CHF", "CKD", "anticoagulated", "lives alone"];

const STEP_LABELS = ["Patient", "Discharge", "Call plan"];

function formatPhone(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Typewriter used by the risk-suggest chip (types once when `active`). */
function useTypedText(text: string, active: boolean, ms = 26) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    setN(0);
    const t = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(t);
          return v;
        }
        return v + 1;
      });
    }, ms);
    return () => clearInterval(t);
  }, [text, active, ms]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

interface WizardData {
  name: string;
  mrn: string;
  phone: string;
  dob: string;
  language: "English" | "Español";
  cohort: Cohort | null;
  procedure: string;
  dischargeDate: string;
  riskScore: number | null;
  riskLevel: RiskLevel | null;
  comorbidities: string[];
  campaignId: string;
  firstCall: string;
  goals: string;
  consent: boolean;
}

const INITIAL: WizardData = {
  name: "",
  mrn: "",
  phone: "",
  dob: "",
  language: "English",
  cohort: null,
  procedure: "",
  dischargeDate: "2026-03-10",
  riskScore: null,
  riskLevel: null,
  comorbidities: [],
  campaignId: "",
  firstCall: "2026-03-11T09:00",
  goals: "",
  consent: false,
};

const inputCls =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";
const labelCls = "mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500";

export function EnrollWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [data, setData] = useState<WizardData>(INITIAL);
  const [phoneError, setPhoneError] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [done, setDone] = useState(false);
  const dirtyRef = useRef(false);

  const set = <K extends keyof WizardData>(k: K, v: WizardData[K]) => {
    dirtyRef.current = true;
    setData((d) => ({ ...d, [k]: v }));
  };

  const suggest = data.cohort ? RISK_SUGGEST[data.cohort] : null;
  const suggestText = suggest
    ? `Suggested ${suggest.score.toFixed(1)} — ${suggest.level[0].toUpperCase()}${suggest.level.slice(1)} · based on cohort + age`
    : "";
  const typed = useTypedText(suggestText, open && step === 1 && !!suggest);

  const reset = () => {
    setStep(0);
    setDir(1);
    setData(INITIAL);
    setPhoneError(false);
    setConsentError(false);
    setDone(false);
    dirtyRef.current = false;
  };

  const requestClose = () => {
    if (done || !dirtyRef.current || window.confirm("Discard unsaved enrollment?")) {
      reset();
      onClose();
    }
  };

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const next = () => {
    if (step === 0) {
      const digits = data.phone.replace(/\D/g, "");
      if (digits.length !== 10) {
        setPhoneError(true);
        return;
      }
    }
    if (step === 1 && !data.campaignId) {
      const match = campaigns.find((c) => c.cohort === data.cohort);
      if (match) {
        setData((d) => ({ ...d, campaignId: match.id, goals: match.goals }));
      }
    }
    if (step === 2) {
      if (!data.consent) {
        setConsentError(true);
        return;
      }
      setDone(true);
      const first = data.name.trim().split(" ")[0] || "Patient";
      toast.success(`${first} enrolled — first call ${fmtFirstCall(data.firstCall)}`);
      return;
    }
    goTo(step + 1);
  };

  // ⌘Enter submits, Esc closes (with unsaved-changes confirm when dirty)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const campaignOptions = useMemo(
    () => [
      ...campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        desc: c.cadence.map((x) => (x === "day7" ? "7d" : x === "day14" ? "14d" : x)).join("/"),
      })),
      { id: "custom", name: "Custom", desc: "define your own cadence" },
    ],
    [],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={requestClose}
            className="fixed inset-0 z-50 bg-ink-950/35 backdrop-blur-[2px]"
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="pointer-events-auto flex max-h-[90dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-modal"
              role="dialog"
              aria-label="Enroll patient"
            >
              {!done ? (
                <>
                  {/* header + stepper */}
                  <div className="border-b border-line px-6 pb-5 pt-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold tracking-[-0.01em] text-slate-900">Enroll patient</h3>
                      <button
                        type="button"
                        onClick={requestClose}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-paper hover:text-slate-600"
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-5 flex items-center">
                      {STEP_LABELS.map((label, i) => (
                        <div key={label} className={cn("flex items-center", i < STEP_LABELS.length - 1 && "flex-1")}>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "tnum flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-bold transition-colors",
                                i < step
                                  ? "bg-teal-500 text-white"
                                  : i === step
                                    ? "bg-teal-500 text-white ring-4 ring-teal-500/15"
                                    : "bg-slate-100 text-slate-400",
                              )}
                            >
                              {i < step ? <Check className="h-3 w-3" /> : i + 1}
                            </span>
                            <span className={cn("text-[12px] font-semibold", i <= step ? "text-slate-900" : "text-slate-400")}>
                              {label}
                            </span>
                          </div>
                          {i < STEP_LABELS.length - 1 && (
                            <div className="mx-3 h-px flex-1 bg-line">
                              <motion.div
                                className="h-px bg-teal-500"
                                initial={false}
                                animate={{ width: step > i ? "100%" : "0%" }}
                                transition={{ duration: 0.4, ease: EASE }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* step body */}
                  <div className="scroll-thin min-h-[340px] flex-1 overflow-y-auto px-6 py-5">
                    <AnimatePresence mode="wait" initial={false} custom={dir}>
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 40 * dir }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 * dir }}
                        transition={{ duration: 0.3, ease: EASE }}
                      >
                        {step === 0 && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className={labelCls}>Full name</label>
                              <input
                                className={inputCls}
                                placeholder="Margaret Ellis"
                                value={data.name}
                                onChange={(e) => set("name", e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div>
                              <label className={labelCls}>MRN</label>
                              <input
                                className={cn(inputCls, "font-mono")}
                                placeholder="MRN-0482113"
                                value={data.mrn}
                                onChange={(e) => set("mrn", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Phone *</label>
                              <motion.div animate={phoneError ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
                                <input
                                  className={cn(inputCls, "font-mono", phoneError && "border-coral-500 ring-2 ring-coral-500/20")}
                                  placeholder="(___) ___-____"
                                  value={data.phone}
                                  onChange={(e) => {
                                    setPhoneError(false);
                                    set("phone", formatPhone(e.target.value));
                                  }}
                                  inputMode="tel"
                                />
                              </motion.div>
                              {phoneError && <p className="mt-1.5 text-[12px] font-medium text-coral-600">A 10-digit phone number is required for calls.</p>}
                            </div>
                            <div>
                              <label className={labelCls}>Date of birth</label>
                              <input type="date" className={cn(inputCls, "font-mono")} value={data.dob} onChange={(e) => set("dob", e.target.value)} />
                            </div>
                            <div>
                              <label className={labelCls}>Preferred language</label>
                              <Select value={data.language} onValueChange={(v) => set("language", v as WizardData["language"])}>
                                <SelectTrigger className="rounded-xl border-line">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="English">English</SelectItem>
                                  <SelectItem value="Español">Español</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {step === 1 && (
                          <div className="space-y-4">
                            <div>
                              <label className={labelCls}>Discharge cohort</label>
                              <div className="grid grid-cols-4 gap-2.5">
                                {(Object.keys(COHORT_LABELS) as Cohort[]).map((c) => {
                                  const Icon = COHORT_ICONS[c];
                                  const active = data.cohort === c;
                                  return (
                                    <motion.button
                                      key={c}
                                      type="button"
                                      whileTap={{ scale: 0.98 }}
                                      animate={{ scale: active ? 1 : 0.98 }}
                                      onClick={() => set("cohort", c)}
                                      className={cn(
                                        "flex flex-col items-center gap-2 rounded-xl border px-2 py-4 text-center transition-colors",
                                        active ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/30" : "border-line bg-white hover:border-slate-300",
                                      )}
                                    >
                                      <Icon className={cn("h-5 w-5", active ? "text-teal-600" : "text-slate-400")} />
                                      <span className={cn("text-[11px] font-semibold leading-tight", active ? "text-teal-700" : "text-slate-600")}>
                                        {COHORT_LABELS[c]}
                                      </span>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className={labelCls}>Procedure</label>
                                <input
                                  className={inputCls}
                                  placeholder="Left total hip arthroplasty"
                                  value={data.procedure}
                                  onChange={(e) => set("procedure", e.target.value)}
                                />
                              </div>
                              <div>
                                <label className={labelCls}>Discharge date</label>
                                <input
                                  type="date"
                                  className={cn(inputCls, "font-mono")}
                                  value={data.dischargeDate}
                                  onChange={(e) => set("dischargeDate", e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <label className={labelCls}>Risk score</label>
                              <div className="flex items-center gap-3">
                                <input
                                  className={cn(inputCls, "w-28 font-mono")}
                                  placeholder="0.50"
                                  value={data.riskScore ?? ""}
                                  onChange={(e) => set("riskScore", e.target.value === "" ? null : Number(e.target.value))}
                                />
                                {suggest && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      set("riskScore", suggest.score);
                                      set("riskLevel", suggest.level);
                                      toast.success("Risk suggestion accepted");
                                    }}
                                    className="flex min-h-[34px] items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[12px] font-semibold text-violet-600 transition-colors hover:bg-violet-500/15"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                    <span className="font-mono">
                                      {typed.shown}
                                      {!typed.done && <span className="ml-0.5 inline-block h-3 w-[6px] animate-caret-blink bg-violet-500 align-[-1px]" />}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className={labelCls}>Comorbidities</label>
                              <div className="flex flex-wrap gap-2">
                                {COMORBIDITIES.map((c) => {
                                  const on = data.comorbidities.includes(c);
                                  return (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() =>
                                        set(
                                          "comorbidities",
                                          on ? data.comorbidities.filter((x) => x !== c) : [...data.comorbidities, c],
                                        )
                                      }
                                      className={cn(
                                        "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                                        on ? "border-teal-500 bg-teal-50 text-teal-700" : "border-line bg-white text-slate-500 hover:border-slate-300",
                                      )}
                                    >
                                      {c}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {step === 2 && (
                          <div className="space-y-4">
                            <div>
                              <label className={labelCls}>Campaign</label>
                              <div className="space-y-2">
                                {campaignOptions.map((c) => {
                                  const active = data.campaignId === c.id;
                                  return (
                                    <motion.button
                                      key={c.id}
                                      type="button"
                                      whileTap={{ scale: 0.98 }}
                                      animate={{ scale: active ? 1 : 0.99 }}
                                      onClick={() => {
                                        set("campaignId", c.id);
                                        const seed = campaigns.find((x) => x.id === c.id);
                                        if (seed) set("goals", seed.goals);
                                      }}
                                      className={cn(
                                        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                                        active ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/30" : "border-line bg-white hover:border-slate-300",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                                          active ? "border-teal-500" : "border-slate-300",
                                        )}
                                      >
                                        {active && <span className="h-2 w-2 rounded-full bg-teal-500" />}
                                      </span>
                                      <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                                      <span className="font-mono text-[11px] text-slate-400">{c.desc}</span>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                            <div>
                              <label className={labelCls}>First call</label>
                              <input
                                type="datetime-local"
                                className={cn(inputCls, "font-mono")}
                                value={data.firstCall}
                                onChange={(e) => set("firstCall", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Call goals (natural language)</label>
                              <textarea
                                rows={4}
                                className={cn(inputCls, "resize-none leading-relaxed")}
                                value={data.goals}
                                onChange={(e) => set("goals", e.target.value)}
                                placeholder="Ask about pain 0–10, confirm apixaban doses, inspect wound description, confirm follow-up appointment"
                              />
                            </div>
                            <motion.div
                              animate={consentError ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }}
                              transition={{ duration: 0.4 }}
                              className={cn(
                                "flex items-start gap-3 rounded-xl border p-3.5",
                                consentError ? "border-coral-500 bg-coral-500/5" : "border-line bg-paper",
                              )}
                            >
                              <Checkbox
                                id="consent"
                                checked={data.consent}
                                onCheckedChange={(v) => {
                                  setConsentError(false);
                                  set("consent", v === true);
                                }}
                                className="mt-0.5"
                              />
                              <label htmlFor="consent" className="cursor-pointer text-[13px] leading-relaxed text-slate-600">
                                Patient consented to AI follow-up calls — verbal consent recorded at discharge.{" "}
                                <span className="font-semibold text-slate-900">Required.</span>
                              </label>
                            </motion.div>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* footer */}
                  <div className="flex items-center justify-between border-t border-line px-6 py-4">
                    <button
                      type="button"
                      onClick={() => (step === 0 ? requestClose() : goTo(step - 1))}
                      className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-paper hover:text-slate-800"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {step === 0 ? "Cancel" : "Back"}
                    </button>
                    <button
                      type="button"
                      onClick={next}
                      className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
                    >
                      {step === 2 ? "Enroll & schedule first call" : "Continue"}
                    </button>
                  </div>
                </>
              ) : (
                /* ------------------------------------------------ success */
                <div className="flex flex-col items-center px-6 py-10 text-center">
                  <motion.svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                    <motion.circle
                      cx="36"
                      cy="36"
                      r="32"
                      stroke="#14B8A6"
                      strokeWidth="3"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.6, ease: EASE }}
                    />
                    <motion.path
                      d="M22 37.5 L32 47 L50 27"
                      stroke="#14B8A6"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.5 }}
                    />
                  </motion.svg>
                  <h3 className="mt-5 text-xl font-semibold tracking-[-0.01em] text-slate-900">
                    {data.name.trim() || "Patient"} enrolled
                  </h3>
                  <div className="mt-4 w-full max-w-sm rounded-2xl border border-line bg-paper p-4 text-left">
                    <dl className="space-y-2 text-[13px]">
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Campaign</dt>
                        <dd className="font-semibold text-slate-900">
                          {campaigns.find((c) => c.id === data.campaignId)?.name ?? "Custom"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Cohort</dt>
                        <dd className="font-semibold text-slate-900">{data.cohort ? COHORT_LABELS[data.cohort] : "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">First call</dt>
                        <dd className="tnum font-mono font-semibold text-slate-900">{fmtFirstCall(data.firstCall)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500">Risk score</dt>
                        <dd className="tnum font-mono font-semibold text-slate-900">
                          {data.riskScore !== null ? data.riskScore.toFixed(2) : "auto"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                    className="mt-6 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function fmtFirstCall(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date("2026-03-10T00:00:00");
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (d.toDateString() === today.toDateString()) return `today ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${time}`;
}
