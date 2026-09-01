import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Braces,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileBarChart,
  FileJson,
  FileSpreadsheet,
  Flag,
  Loader2,
  Pencil,
  Search,
} from "lucide-react";
import { getCallEClient } from "@/lib/calle";
import { margaretScript } from "@/lib/simulation";
import { callRecords, careTeam, patientById, type CallRecord } from "@/data/seed";
import { TranscriptBubble } from "@/components/shared/TranscriptBubble";
import { RedFlagChip } from "@/components/shared/RedFlagChip";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { WaveformPlayer } from "@/components/pages/results/WaveformPlayer";
import { WebhookSimulator } from "@/components/pages/results/WebhookSimulator";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
const WEBHOOK_ENDPOINT = "https://ehr.example.org/hooks/pdc";

/* ------------------------------------------------------------- transcript */

interface Turn {
  speaker: "agent" | "patient";
  text: string;
  flagQuote?: string;
}

/** call-1042 replays the real scripted call; other calls get a faithful summary script. */
function transcriptFor(call: CallRecord): Turn[] {
  if (call.id === "call-1042") {
    return margaretScript.steps
      .filter((s) => s.event.kind === "transcript")
      .map((s) => {
        const ev = s.event as Extract<typeof s.event, { kind: "transcript" }>;
        return { speaker: ev.speaker, text: ev.text, flagQuote: ev.flagQuote };
      });
  }
  const p = patientById(call.patientId);
  const name = p?.firstName ?? "there";
  if (call.status === "missed") {
    return [
      { speaker: "agent", text: `Hi, is this ${p?.name ?? "the patient"}? This is Ellie, the care-coordination assistant from Riverside General.` },
      { speaker: "agent", text: "No answer — left a voicemail with the callback number. A retry has been queued automatically." },
    ];
  }
  const flagTurns: Turn[] = call.flags.map((f) => ({
    speaker: "patient" as const,
    text: f.quote ?? `Reported: ${f.label}.`,
    flagQuote: f.quote,
  }));
  return [
    { speaker: "agent", text: `Hi ${name} — Ellie from Riverside General, your ${call.cadence} check-in. How are you feeling today?` },
    { speaker: "patient", text: call.sentiment === "upbeat" || call.sentiment === "cheerful" ? "Honestly, pretty good. Better than I expected." : "I'm okay. A bit tired, but managing." },
    { speaker: "agent", text: "Good to hear. On a scale of zero to ten, how's your pain? And have you taken every dose of your medications?" },
    ...flagTurns,
    ...(flagTurns.length === 0 ? [{ speaker: "patient" as const, text: call.outcome ?? "Doing fine — no issues to report." }] : []),
    { speaker: "agent", text: "Thank you — I've noted all of that for the care team. Your follow-up is confirmed, and we'll check in again soon. Take care." },
    { speaker: "patient", text: "Thank you. Goodbye." },
  ];
}

/* --------------------------------------------------------- outcome field */

function OutcomeField({
  label,
  value,
  confidence,
  edited,
  onSave,
}: {
  label: string;
  value: string;
  confidence: number;
  edited?: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const dot = edited
    ? "bg-amber-500"
    : confidence >= 0.9
      ? "bg-green-500"
      : confidence >= 0.7
        ? "bg-amber-500"
        : "bg-coral-500";
  const dotTitle = edited ? "edited — verified by nurse" : `extraction confidence ${confidence.toFixed(2)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="group rounded-xl border border-line bg-white px-3 py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">{label}</span>
        <span className="flex items-center gap-1.5">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 15 }}
            className={cn("h-1.5 w-1.5 rounded-full", dot)}
            title={dotTitle}
          />
          <span className="tnum font-mono text-[10px] text-slate-400">{edited ? "edited" : confidence.toFixed(2)}</span>
          {!editing && (
            <button
              type="button"
              onClick={() => {
                setDraft(value);
                setEditing(true);
              }}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Edit ${label}`}
            >
              <Pencil className="h-3 w-3 text-slate-400" />
            </button>
          )}
        </span>
      </div>
      {editing ? (
        <form
          className="mt-1 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            onSave(draft);
            setEditing(false);
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-md border border-teal-500/50 bg-teal-50 px-2 py-1 font-mono text-[13px] text-slate-900 focus:outline-none"
          />
          <button type="submit" className="rounded-md bg-teal-500 p-1 text-white" aria-label="Save">
            <Check className="h-3.5 w-3.5" />
          </button>
        </form>
      ) : (
        <div className="mt-1 min-h-[20px] font-mono text-[13px] leading-snug text-slate-900">{value}</div>
      )}
    </motion.div>
  );
}

/* --------------------------------------------------------------- count-up */

function CountUp({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 900);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{shown.toFixed(2)}</span>;
}

/* ----------------------------------------------------------------- helpers */

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const fmtDur = (sec?: number) => (sec ? `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s` : "—");

type Filter = "all" | "flags" | "escalated" | "clean";

/* ------------------------------------------------------------------- page */

export default function CallResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [range, setRange] = useState("all");
  const [records, setRecords] = useState<CallRecord[]>(() => callRecords.filter((c) => c.status !== "scheduled"));
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("id"));
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [activeTurn, setActiveTurn] = useState(-1);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [edits, setEdits] = useState<Record<string, { value: string; confidence: number; edited: boolean }>>({});
  const [audit, setAudit] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const arrivedRef = useRef(false);

  const selected = records.find((r) => r.id === selectedId) ?? null;

  // simulate an incoming result ~45s in
  useEffect(() => {
    const t = setTimeout(() => {
      if (arrivedRef.current) return;
      arrivedRef.current = true;
      const fresh: CallRecord = {
        id: "call-1045",
        patientId: "frank-doyle",
        cadence: "day7",
        scheduledFor: "11:00",
        startedAt: "11:00",
        durationSec: 238,
        status: "completed",
        outcome: "Pain 4/10 · Meds ✓ · No flags",
        flags: [],
        riskBefore: 0.39,
        riskAfter: 0.37,
        campaignId: "camp-ortho",
        sentiment: "upbeat",
      };
      setRecords((prev) => [fresh, ...prev]);
      toast.success("Result ready — F. Doyle", { description: "Structured extraction complete via CALL-E" });
    }, 45000);
    return () => clearTimeout(t);
  }, []);

  // reset per-selection view state
  useEffect(() => {
    setPlaying(false);
    setActiveTurn(-1);
    setTranscriptOpen(false);
    setEdits({});
    setAudit([]);
    setReviewed(false);
  }, [selectedId]);

  const filtered = useMemo(() => {
    return records.filter((c) => {
      const p = patientById(c.patientId);
      if (query && p && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      if (range === "today" && (c.startedAt ?? c.scheduledFor).includes("Mar")) return false;
      if (range === "earlier" && !(c.startedAt ?? c.scheduledFor).includes("Mar")) return false;
      if (filter === "flags" && c.flags.length === 0) return false;
      if (filter === "escalated" && c.status !== "escalated") return false;
      if (filter === "clean" && (c.flags.length > 0 || c.status !== "completed")) return false;
      return true;
    });
  }, [records, query, filter, range]);

  const counts = useMemo(
    () => ({
      all: records.length,
      flags: records.filter((c) => c.flags.length > 0).length,
      escalated: records.filter((c) => c.status === "escalated").length,
      clean: records.filter((c) => c.flags.length === 0 && c.status === "completed").length,
    }),
    [records],
  );

  const select = (id: string) => {
    setSelectedId(id);
    setSearchParams({ id }, { replace: true });
  };

  /* ------------------------------------------------------------ exports */

  const exportRows = (kind: "csv" | "json") => {
    setExporting(kind);
    setTimeout(() => {
      if (kind === "csv") {
        const header = "call_id,patient,date,cadence,duration_sec,status,flags,risk_before,risk_after,outcome";
        const rows = filtered.map((c) =>
          [
            c.id,
            patientById(c.patientId)?.name ?? c.patientId,
            c.startedAt ?? c.scheduledFor,
            c.cadence,
            c.durationSec ?? "",
            c.status,
            c.flags.map((f) => f.label).join("; "),
            c.riskBefore ?? "",
            c.riskAfter ?? "",
            `"${(c.outcome ?? "").replaceAll('"', '""')}"`,
          ].join(","),
        );
        downloadFile("pdc-call-results.csv", [header, ...rows].join("\n"), "text/csv");
      } else {
        downloadFile("pdc-call-results.json", JSON.stringify(filtered, null, 2), "application/json");
      }
      setExporting(null);
      toast.success(`Exported ${filtered.length} results`, { description: kind === "csv" ? "CSV downloaded" : "JSON downloaded" });
    }, 700);
  };

  const resultPayload = useCallback(async (): Promise<unknown> => {
    if (!selected) return {};
    if (selected.id === "call-1042") {
      // exactly what CALL-E returns for this call
      return getCallEClient().getStructuredResult("call-1042");
    }
    return {
      callId: selected.id,
      patientId: selected.patientId,
      outcome: selected.outcome,
      durationSec: selected.durationSec,
      riskBefore: selected.riskBefore,
      riskAfter: selected.riskAfter,
      sentiment: selected.sentiment,
      flags: selected.flags,
      extraction: selected.extraction ?? {},
    };
  }, [selected]);

  const [webhookPayload, setWebhookPayload] = useState<unknown>({});
  useEffect(() => {
    void resultPayload().then(setWebhookPayload);
  }, [resultPayload]);

  const downloadJson = async () => {
    const payload = await resultPayload();
    downloadFile(`pdc-result-${selected?.id ?? "call"}.json`, JSON.stringify(payload, null, 2), "application/json");
    toast.success("Structured result downloaded", { description: "via calle.getStructuredResult()" });
  };
  const copyJson = async () => {
    const payload = await resultPayload();
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {
      /* ignore */
    }
    toast.success("JSON copied to clipboard");
  };

  /* ------------------------------------------------------------- derived */

  const patient = selected ? patientById(selected.patientId) : null;
  const campaign = selected ? selected.campaignId : "";
  const turns = useMemo(() => (selected ? transcriptFor(selected) : []), [selected]);
  const extraction = useMemo((): Record<string, { value: string; confidence: number; edited?: boolean }> => {
    if (!selected) return {};
    const base =
      selected.extraction ?? {
        pain_score: { value: selected.outcome?.match(/Pain \d+\/10/)?.[0] ?? "not assessed", confidence: 0.9 },
        "med_adherence.reported": { value: selected.outcome?.includes("Meds ✓") ? "all doses taken" : "see flags", confidence: 0.86 },
        sentiment: { value: selected.sentiment ?? "—", confidence: 0.8 },
        risk_score: { value: `${(selected.riskAfter ?? 0).toFixed(2)}`, confidence: 0.9 },
        recommended_action: {
          value: selected.flags.length > 0 ? "nurse callback — review flags" : "routine next check-in",
          confidence: 0.88,
        },
      };
    return { ...base, ...edits };
  }, [selected, edits]);

  const reviewer = careTeam.find((m) => m.id === "dr-chen");

  const onProgress = useCallback(
    (fraction: number) => {
      setActiveTurn(fraction >= 1 ? turns.length - 1 : Math.floor(fraction * turns.length));
    },
    [turns.length],
  );

  const filterChips: { key: Filter; label: string; count: number; cls: string }[] = [
    { key: "all", label: "All", count: counts.all, cls: "border-line text-slate-600" },
    { key: "flags", label: "With flags", count: counts.flags, cls: "border-coral-500/40 text-coral-600" },
    { key: "escalated", label: "Escalated", count: counts.escalated, cls: "border-coral-500/40 text-coral-600" },
    { key: "clean", label: "Clean", count: counts.clean, cls: "border-green-500/40 text-green-600" },
  ];

  /* ------------------------------------------------------------------ UI */

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto w-full max-w-[1400px] p-6 lg:p-8"
    >
      {/* header & filters */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold tracking-[-0.01em] text-slate-900">Call results</h3>
          <p className="mt-1 text-[13px] text-slate-500">41 calls this week · 7 with flags</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient…"
              className="w-48 border-line bg-white pl-8 text-[13px]"
            />
          </div>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40 border-line bg-white text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="earlier">Earlier this week</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-700"
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportRows("csv")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportRows("json")}>
                <FileJson className="mr-2 h-4 w-4" /> Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filterChips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              c.cls,
              filter === c.key ? "bg-slate-900 text-white" : "bg-white hover:bg-paper",
            )}
          >
            {c.label} <span className="tnum font-mono">{c.count}</span>
          </button>
        ))}
      </div>

      {/* master–detail */}
      <div className="mt-5 flex flex-col gap-5 lg:flex-row">
        {/* list rail */}
        <div className="scroll-thin w-full shrink-0 space-y-2 lg:max-h-[calc(100dvh-280px)] lg:w-[380px] lg:overflow-y-auto lg:pr-1">
          <AnimatePresence initial={false}>
            {filtered.map((c, i) => {
              const p = patientById(c.patientId);
              const isSel = c.id === selectedId;
              const up = (c.riskAfter ?? 0) > (c.riskBefore ?? 0);
              return (
                <motion.button
                  key={c.id}
                  layout
                  type="button"
                  onClick={() => select(c.id)}
                  initial={{ opacity: 0, y: i === 0 && arrivedRef.current ? -24 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4), ease: EASE }}
                  className={cn(
                    "group relative w-full rounded-2xl border p-3.5 text-left transition-colors",
                    isSel ? "border-teal-500/40 bg-teal-50" : "border-line bg-white hover:border-slate-300",
                  )}
                >
                  {isSel && (
                    <motion.span
                      layoutId="result-selected"
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-teal-500"
                    />
                  )}
                  <div className="flex items-center gap-2.5">
                    <img src={p?.avatar} alt={p?.name} className="h-9 w-9 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">{p?.name ?? c.patientId}</span>
                        <span className="tnum shrink-0 font-mono text-[11px] text-slate-400">
                          {c.startedAt ?? c.scheduledFor}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-500/10 px-1.5 py-0.5 font-mono">{c.cadence}</span>
                        <span className="tnum font-mono">{fmtDur(c.durationSec)}</span>
                        {c.riskBefore !== undefined && c.riskAfter !== undefined && (
                          <span className={cn("tnum font-mono", up ? "text-coral-500" : "text-green-600")}>
                            {c.riskBefore.toFixed(2)}→{c.riskAfter.toFixed(2)} {up ? "↑" : "↘"}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {c.flags.slice(0, 2).map((f) => (
                      <RedFlagChip key={f.label} label={f.label} confidence={f.confidence} tier={f.tier} />
                    ))}
                    {c.flags.length === 0 && (
                      <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-600">
                        {c.status === "missed" ? "No answer" : "No flags"}
                      </span>
                    )}
                    {c.status === "escalated" && <StatusPill status="escalated" />}
                    {c.outcome && c.flags.length === 0 && c.status !== "missed" && (
                      <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {c.outcome.split("·")[0].trim()}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <EmptyState
              icon={Search}
              headline="No results match"
              body="Try widening the filters or clearing the search."
              className="py-10"
            />
          )}
        </div>

        {/* detail pane */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            {!selected || !patient ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <EmptyState
                  icon={FileBarChart}
                  headline="Select a call to inspect its structured result"
                  body="Every completed call becomes an auditable record: extraction fields with confidence, full transcript, and exportable JSON — exactly as CALL-E returns it."
                />
              </motion.div>
            ) : (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* 3a — call header card */}
                <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
                  <div className="flex flex-wrap items-center gap-4">
                    <img src={patient.avatar} alt={patient.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-teal-500/20" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-slate-900">{patient.name}</h4>
                        <span className="text-[13px] text-slate-500">{patient.cohortLabel}</span>
                        <StatusPill status={selected.status} />
                      </div>
                      <p className="tnum mt-1 font-mono text-[11px] text-slate-500">
                        {selected.startedAt ?? selected.scheduledFor} · {selected.cadence} check-in · {fmtDur(selected.durationSec)} ·
                        campaign: {campaign === "camp-ortho" ? "Ortho Standard" : campaign === "camp-cardiac" ? "Cardiac Intensive" : "Post-Surgical Watch"}
                      </p>
                    </div>
                  </div>
                  {selected.status !== "missed" && (
                    <div className="mt-4">
                      <WaveformPlayer
                        seedKey={selected.id}
                        durationSec={selected.durationSec ?? 240}
                        playing={playing}
                        onPlayingChange={setPlaying}
                        onProgress={onProgress}
                      />
                    </div>
                  )}
                </div>

                {/* 3b — structured outcome card */}
                <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                  <div className="h-0.5 bg-violet-500" />
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Braces className="h-4 w-4 text-violet-500" />
                        <h4 className="text-base font-semibold text-slate-900">Structured outcome</h4>
                        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-violet-600">
                          machine-generated
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">calle.getStructuredResult()</span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {Object.entries(extraction).map(([field, e], i) =>
                        field === "risk_score" ? null : (
                          <motion.div key={field} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
                            <OutcomeField
                              label={field}
                              value={e.value}
                              confidence={e.confidence}
                              edited={e.edited}
                              onSave={(v) => {
                                setEdits((prev) => ({ ...prev, [field]: { value: v, confidence: e.confidence, edited: true } }));
                                setAudit((prev) => [...prev, `${new Date().toLocaleTimeString("en-US", { hour12: false })} — ${field} edited by you`]);
                                toast.success(`${field} updated`, { description: "Logged to the audit trail" });
                              }}
                            />
                          </motion.div>
                        ),
                      )}
                      {selected.flags.length > 0 && (
                        <div className="flex flex-wrap content-start items-center gap-1.5 rounded-xl border border-coral-500/20 bg-coral-100/40 px-3 py-2.5">
                          {selected.flags.map((f) => (
                            <RedFlagChip key={f.label} label={f.label} confidence={f.confidence} tier={f.tier} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* risk numeral + sentiment mini gauge */}
                    <div className="mt-4 flex flex-wrap items-center gap-6 rounded-xl border border-line bg-paper px-4 py-3">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">risk_score</div>
                        <div className="flex items-baseline gap-2">
                          <CountUp value={selected.riskAfter ?? 0} className="tnum font-mono text-3xl font-medium text-slate-900" />
                          {selected.riskBefore !== undefined && (
                            <span
                              className={cn(
                                "tnum rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
                                (selected.riskAfter ?? 0) > selected.riskBefore ? "bg-coral-500/10 text-coral-600" : "bg-green-500/10 text-green-600",
                              )}
                            >
                              {(selected.riskAfter ?? 0) > selected.riskBefore ? "↑" : "↘"} from {selected.riskBefore.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="min-w-44 flex-1">
                        <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">sentiment — {selected.sentiment ?? "—"}</div>
                        <div className="relative mt-2 h-1.5 rounded-full bg-gradient-to-r from-green-500 via-amber-500 to-coral-500">
                          <motion.span
                            initial={{ left: "10%" }}
                            animate={{ left: `${Math.min(90, Math.max(5, (selected.riskAfter ?? 0.3) * 100))}%` }}
                            transition={{ duration: 0.8, ease: EASE }}
                            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow"
                          />
                        </div>
                      </div>
                    </div>

                    {/* review footer */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                      {reviewed ? (
                        <span className="flex items-center gap-2 text-[13px] font-medium text-green-600">
                          <img src={reviewer?.avatar} alt={reviewer?.name} className="h-6 w-6 rounded-full object-cover" />
                          Reviewed by {reviewer?.name} ✓
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-[13px] font-medium text-amber-600">
                          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-amber-500" />
                          Awaiting review
                        </span>
                      )}
                      {!reviewed && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewed(true);
                            setAudit((prev) => [...prev, `${new Date().toLocaleTimeString("en-US", { hour12: false })} — marked reviewed by ${reviewer?.name}`]);
                            toast.success(`Marked reviewed — ${reviewer?.name}`);
                          }}
                          className="rounded-xl border border-line px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-teal-500/50 hover:text-teal-700"
                        >
                          Mark reviewed
                        </button>
                      )}
                    </div>

                    {/* audit trail */}
                    {audit.length > 0 && (
                      <div className="mt-3 rounded-xl bg-paper p-3">
                        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Audit trail</div>
                        {audit.map((a, i) => (
                          <div key={i} className="tnum mt-1 font-mono text-[11px] text-slate-600">
                            {a}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3c — transcript accordion */}
                <div className="rounded-2xl border border-line bg-white shadow-card">
                  <button
                    type="button"
                    onClick={() => setTranscriptOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      Full transcript · {turns.length} turns
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", transcriptOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {transcriptOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 border-t border-line px-5 py-4">
                          {turns.map((t, i) => (
                            <div
                              key={i}
                              className={cn(
                                "rounded-2xl transition-shadow",
                                i === activeTurn && "ring-2 ring-teal-500",
                                t.flagQuote && "cursor-pointer",
                              )}
                              onClick={
                                t.flagQuote
                                  ? () => toast("Flag source", { description: "This quote produced the red-flag extraction above." })
                                  : undefined
                              }
                            >
                              <TranscriptBubble
                                speaker={t.speaker}
                                text={t.text}
                                timestamp={`turn ${i + 1}`}
                                flagQuote={t.flagQuote}
                              />
                            </div>
                          ))}
                          <p className="flex items-center gap-1.5 pt-1 font-mono text-[10px] text-slate-400">
                            <Flag className="h-3 w-3 text-coral-500" />
                            highlighted phrases produced red-flag extractions · press play above to follow along
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3d — export & integrations */}
                <div className="grid grid-cols-1 gap-5 rounded-2xl border border-line bg-white p-5 shadow-card md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Export</h4>
                    <p className="mt-1 text-[12px] text-slate-500">
                      The exact structured object CALL-E returns for this call.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={downloadJson}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-slate-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download JSON
                      </button>
                      <button
                        type="button"
                        onClick={copyJson}
                        className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:border-violet-500/50 hover:text-violet-600"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy JSON
                      </button>
                    </div>
                  </div>
                  <WebhookSimulator endpoint={WEBHOOK_ENDPOINT} payload={webhookPayload} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
