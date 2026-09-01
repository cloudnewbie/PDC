import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bone,
  ChevronDown,
  Flag,
  HeartPulse,
  Plus,
  Scissors,
  Siren,
  Wind,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Cadence, Campaign, Cohort } from "@/data/seed";
import { calleStatus } from "@/data/seed";
import { StatusPill } from "@/components/shared/StatusPill";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CADENCE_LABELS, buildBriefLines, parseIntents } from "./intents";
import type { Intent } from "./intents";
import { CadenceTimeline } from "./CadenceTimeline";
import { AgentBrief } from "./AgentBrief";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const COHORT_ICONS: Record<Cohort, LucideIcon> = {
  cardiac: HeartPulse,
  ortho: Bone,
  surgical: Scissors,
  copd: Wind,
};

const COHORT_VOLUME: Record<Cohort, number> = { cardiac: 6, ortho: 8, surgical: 7, copd: 5 };

const ALL_CADENCE: Cadence[] = ["24h", "48h", "72h", "day7", "day14"];
const RETRY_OPTIONS = ["retry ×2, 2h apart", "skip", "escalate"];
const CONDITIONS = [
  "red flag confidence ≥ 0.8",
  "pain ≥ 7 for 2 consecutive calls",
  "2 missed attempts",
  "med adherence < 70%",
  "sentiment: acute distress",
];
const ACTIONS = ["page on-call nurse (P1)", "notify care team (P2)", "create task (P3)"];

const DEFAULT_GOALS =
  "Check pain on a 0–10 scale. Confirm every dose of apixaban was taken — if a dose was missed, find out why. Ask them to describe the incision: any redness, swelling, or drainage. Confirm their follow-up appointment on March 14. If they mention chest pain, fever over 38°, or confusion, treat it as urgent.";

interface Rule {
  id: string;
  condition: string;
  action: string;
}

const DEFAULT_RULES: Rule[] = [
  { id: "r1", condition: CONDITIONS[0], action: ACTIONS[0] },
  { id: "r2", condition: CONDITIONS[1], action: ACTIONS[1] },
  { id: "r3", condition: CONDITIONS[2], action: ACTIONS[2] },
];

function Section({
  n,
  title,
  hint,
  index,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  index: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay: 0.05 + index * 0.07 }}
      className="rounded-2xl border border-line bg-white shadow-card"
    >
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 font-mono text-[11px] font-bold text-teal-700">
          {n}
        </span>
        <span className="flex-1">
          <span className="block text-base font-semibold text-slate-900">{title}</span>
          {hint && <span className="block text-[12px] text-slate-400">{hint}</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", !open && "-rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-5 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

export function CampaignBuilder({
  campaign,
  onExit,
}: {
  /** undefined → new campaign */
  campaign?: Campaign;
  onExit: () => void;
}) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [cohort, setCohort] = useState<Cohort>(campaign?.cohort ?? "ortho");
  const [autoEnroll, setAutoEnroll] = useState(true);
  const [cadence, setCadence] = useState<Cadence[]>(campaign?.cadence ?? ["24h", "72h", "day7"]);
  const [retry, setRetry] = useState<Record<string, string>>(
    () => Object.fromEntries(ALL_CADENCE.map((c) => [c, campaign?.retryPolicy ?? RETRY_OPTIONS[0]])),
  );
  const [goals, setGoals] = useState(campaign?.goals ?? DEFAULT_GOALS);
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [activated, setActivated] = useState(false);

  /* live intent parsing, debounced 400ms */
  const [intents, setIntents] = useState<Intent[]>(() => parseIntents(goals));
  useEffect(() => {
    const t = setTimeout(() => setIntents(parseIntents(goals)), 400);
    return () => clearTimeout(t);
  }, [goals]);

  const briefLines = useMemo(
    () => buildBriefLines({ campaignName: name, cadence, intents, removed }),
    [name, cadence, intents, removed],
  );
  const fieldsExtracted = intents.filter((i) => !i.urgent && !removed.has(i.id)).length + 1;

  const toggleCadence = (c: Cadence) =>
    setCadence((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      return ALL_CADENCE.filter((x) => next.includes(x));
    });

  const removeIntent = (id: string) => {
    setRemoved((prev) => new Set(prev).add(id));
    toast.info("Intent removed — brief line struck through");
  };
  const restoreIntent = (id: string) =>
    setRemoved((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const activate = () => {
    setActivated(true);
    toast.success(`Campaign live — ${campaign?.patientsEnrolled ?? 6} patients enrolled`);
    setTimeout(onExit, 1400);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] p-6 pb-24 lg:p-8 lg:pb-24">
      {/* header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }}>
        <button
          type="button"
          onClick={onExit}
          className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Campaigns
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled campaign"
            className="min-w-[220px] flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1 text-2xl font-semibold tracking-[-0.01em] text-slate-900 placeholder:text-slate-300 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 sm:max-w-md"
          />
          <StatusPill status={activated ? "active" : campaign ? campaign.status : "paused"} />
        </div>
        <p className="mt-1 text-[13px] font-medium text-slate-500">
          Define who gets called, when, and what the agent must accomplish — in plain language.
        </p>
      </motion.div>

      {/* 2-column layout */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* ------------------------------------------------ form column */}
        <div className="space-y-5 xl:col-span-7">
          {/* 1 · cohort */}
          <Section n={1} title="Cohort & enrollment" index={0}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(Object.keys(COHORT_ICONS) as Cohort[]).map((c) => {
                const Icon = COHORT_ICONS[c];
                const active = cohort === c;
                return (
                  <motion.button
                    key={c}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    animate={{ scale: active ? 1 : 0.98 }}
                    onClick={() => setCohort(c)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border px-2 py-4 transition-colors",
                      active ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/30" : "border-line bg-white hover:border-slate-300",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? "text-teal-600" : "text-slate-400")} />
                    <span className={cn("text-[11px] font-semibold capitalize", active ? "text-teal-700" : "text-slate-600")}>{c}</span>
                  </motion.button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-paper px-4 py-3">
              <div>
                <div className="text-[13px] font-semibold text-slate-900">Automatically enroll new discharges from this cohort</div>
                <div className="tnum mt-0.5 font-mono text-[11px] text-slate-400">
                  ≈ {COHORT_VOLUME[cohort]} discharges/week in this cohort
                </div>
              </div>
              <Switch checked={autoEnroll} onCheckedChange={setAutoEnroll} />
            </div>
          </Section>

          {/* 2 · cadence */}
          <Section n={2} title="Cadence" hint="When the agent calls, relative to discharge" index={1}>
            <div className="flex flex-wrap gap-2">
              {ALL_CADENCE.map((c) => {
                const on = cadence.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCadence(c)}
                    className={cn(
                      "tnum rounded-full border px-3.5 py-1.5 font-mono text-[12px] font-bold transition-colors",
                      on ? "border-teal-500 bg-teal-500 text-white" : "border-line bg-white text-slate-500 hover:border-slate-300",
                    )}
                  >
                    {CADENCE_LABELS[c]}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl border border-line bg-paper p-4">
              {cadence.length === 0 ? (
                <p className="py-3 text-center text-[13px] text-slate-400">Select at least one touchpoint above.</p>
              ) : (
                <>
                  <CadenceTimeline cadence={cadence} key={cadence.join("-")} className="px-2" nodeTone="teal" />
                  <div className="mt-5 space-y-2">
                    <AnimatePresence initial={false}>
                      {cadence.map((c) => (
                        <motion.div
                          key={c}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 400, damping: 26 }}
                          className="flex items-center gap-3"
                        >
                          <span className="tnum w-14 shrink-0 font-mono text-[11px] font-bold text-slate-600">{CADENCE_LABELS[c]}</span>
                          <span className="text-[12px] text-slate-400">If missed:</span>
                          <Select value={retry[c]} onValueChange={(v) => setRetry((r) => ({ ...r, [c]: v }))}>
                            <SelectTrigger className="h-8 w-[190px] rounded-lg border-line bg-white text-[12px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {RETRY_OPTIONS.map((o) => (
                                <SelectItem key={o} value={o}>
                                  {o}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
            <p className="mt-3 text-[12px] text-slate-400">
              Calls are placed in the patient's local time, 08:00–20:00 quiet hours respected.
            </p>
          </Section>

          {/* 3 · call goals */}
          <Section n={3} title="Call goals" hint="Tell the agent what this call must accomplish — plain language" index={2}>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              className="min-h-[140px] w-full resize-y rounded-xl border border-line bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              placeholder={DEFAULT_GOALS}
            />
            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
              Detected intents
              <span className="font-mono normal-case tracking-normal text-violet-500">parsed live</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <AnimatePresence initial={false}>
                {intents.map((intent) => {
                  const isRemoved = removed.has(intent.id);
                  if (isRemoved) return null;
                  return (
                    <motion.span
                      key={intent.id}
                      layout
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 500, damping: 26 }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold",
                        intent.urgent
                          ? "border-coral-500/40 bg-coral-100 text-coral-600"
                          : "border-violet-500/30 bg-violet-500/10 text-violet-600",
                      )}
                    >
                      {intent.urgent && <Flag className="h-3 w-3" />}
                      {intent.label}
                      <button
                        type="button"
                        onClick={() => removeIntent(intent.id)}
                        aria-label={`Remove ${intent.label}`}
                        className="rounded-full p-0.5 transition-colors hover:bg-black/10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.span>
                  );
                })}
              </AnimatePresence>
              {intents.length === 0 && (
                <span className="text-[12px] text-slate-400">Start typing goals — intents appear here as the agent understands them.</span>
              )}
            </div>
            {/* removed intents can be restored */}
            {removed.size > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400">Removed:</span>
                {[...removed].map((id) => {
                  const intent = intents.find((i) => i.id === id);
                  if (!intent) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => restoreIntent(id)}
                      className="rounded-full border border-dashed border-line px-2.5 py-1 font-mono text-[11px] text-slate-400 line-through transition-colors hover:border-teal-500 hover:text-teal-600 hover:no-underline"
                      title="Restore intent"
                    >
                      {intent.label}
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* 4 · escalation rules */}
          <Section n={4} title="Escalation rules" hint="When the agent hands off to a human" index={3}>
            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {rules.map((rule) => (
                  <motion.div
                    key={rule.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 420, damping: 26 }}
                    className="flex flex-wrap items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 py-3"
                  >
                    <Siren className="h-4 w-4 shrink-0 text-coral-500" />
                    <span className="font-mono text-[11px] font-bold text-slate-400">IF</span>
                    <Select
                      value={rule.condition}
                      onValueChange={(v) => setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, condition: v } : r)))}
                    >
                      <SelectTrigger className="h-8 min-w-[220px] flex-1 rounded-lg border-line bg-white text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="font-mono text-[11px] font-bold text-slate-400">→</span>
                    <Select
                      value={rule.action}
                      onValueChange={(v) => setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, action: v } : r)))}
                    >
                      <SelectTrigger className="h-8 min-w-[200px] flex-1 rounded-lg border-line bg-white text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIONS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setRules((rs) => rs.filter((r) => r.id !== rule.id))}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-coral-500/10 hover:text-coral-500"
                      aria-label="Remove rule"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={() =>
                setRules((rs) => [
                  ...rs,
                  { id: `r-${Date.now()}`, condition: CONDITIONS[rs.length % CONDITIONS.length], action: ACTIONS[Math.min(rs.length, 2)] },
                ])
              }
              className="mt-3 flex items-center gap-1.5 rounded-xl border border-dashed border-line px-4 py-2.5 text-[13px] font-semibold text-slate-500 transition-colors hover:border-teal-500 hover:text-teal-600"
            >
              <Plus className="h-4 w-4" />
              Add rule
            </button>
          </Section>
        </div>

        {/* ------------------------------------------- preview column (sticky) */}
        <div className="xl:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.25 }}
            className="space-y-4 xl:sticky xl:top-24"
          >
            <AgentBrief lines={briefLines} fieldsExtracted={fieldsExtracted} voice={calleStatus.voice} glow={activated} />
            <p className="text-[12px] leading-relaxed text-slate-400">
              The brief is compiled to the CALL-E agent runtime on activation. Removing an intent chip strikes its line
              here — what you see is exactly what the agent will do.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ------------------------------------------------ sticky footer bar */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE, delay: 0.35 }}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/85 backdrop-blur-lg"
      >
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-end gap-2.5 px-6 py-3.5 lg:px-8">
          <button
            type="button"
            onClick={onExit}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => toast.success("Draft saved")}
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-card transition-colors hover:bg-paper"
          >
            Save as draft
          </button>
          <button
            type="button"
            onClick={activate}
            disabled={activated}
            className="rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-teal-600 disabled:opacity-60"
          >
            {activated ? "Campaign live ✓" : "Activate campaign"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
