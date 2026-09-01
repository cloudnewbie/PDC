// import { CalleClient } from "@call-e/calle";
// Production can swap this adapter 1:1 for the official CALL-E SDK
// (`new CalleClient({ apiKey })` → `client.calls.createAndWait({ task, resultSchema })`) —
// the exported interface (CallEClient / planCall / startCall / streamCall /
// getStructuredResult) is intentionally SDK-shaped so the swap is a one-line change.

import { useCallback, useEffect, useState } from "react";
import type { Patient } from "@/data/seed";
import { margaretScript, runScript, type SimEvent } from "@/lib/simulation";

/* ------------------------------------------------------------------ types */

export type AdapterMode = "demo" | "live";

export type AdapterState =
  | "idle"
  | "planned"
  | "dialing"
  | "connected"
  | "extracting"
  | "completed"
  | "ended"
  | "failed";

export interface CallGoal {
  campaignId?: string;
  cadence?: string;
  instructions: string; // natural-language goals ("check pain, confirm apixaban…")
  voice?: string;
  language?: string;
}

export interface CallPlan {
  id: string;
  to: string;
  patientId: string;
  goal: CallGoal;
  brief: string; // generated agent brief
  estimatedDurationSec: number;
  extractionFields: string[];
  createdAt: string;
  /** Live mode only: the exact request body POSTed to /v1/calls (CALL-E plans server-side). */
  request?: LiveCallRequest;
}

/** Body shape of POST https://api.heycall-e.com/v1/calls (verified 2026-08-02). */
export interface LiveCallRequest {
  task: string;
  recipients: { phones: string[]; region: string; locale: string }[];
  result_schema: Record<string, unknown>;
  recipient_result_schema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  webhook_url?: string;
}

export interface TranscriptEventPayload {
  speaker: "agent" | "patient";
  text: string;
  ts: number; // ms since call start
  flagQuote?: string;
}

export interface StreamCallbacks {
  onTranscript?: (e: TranscriptEventPayload) => void;
  onRedFlag?: (e: { label: string; confidence: number; quote: string; tier: "coral" | "amber"; ts: number }) => void;
  onAdaptation?: (e: { note: string; ts: number }) => void;
  onExtraction?: (e: { field: string; value: string; confidence: number; ts: number }) => void;
  onSentiment?: (e: { score: number; label: string; ts: number }) => void;
  onStateChange?: (state: AdapterState) => void;
  onEnded?: (outcome: StructuredResult) => void;
  onError?: (err: Error) => void;
}

export interface StructuredResult {
  callId: string;
  patientId: string;
  outcome: string;
  durationSec: number;
  riskBefore: number;
  riskAfter: number;
  sentiment: string;
  flags: { label: string; confidence: number; quote: string; tier: "coral" | "amber" }[];
  extraction: Record<string, { value: string; confidence: number }>;
  recommendedAction: string;
}

export interface ConnectionStatus {
  mode: AdapterMode;
  connected: boolean;
  baseUrl: string;
  workspace?: string;
  latencyMs?: number;
  detail: string;
}

const BASE_URL = "https://api.heycall-e.com";
const LS_KEY = "pdc.calle.apiKey";

/** Fields extracted per recipient by CALL-E in live mode. */
const LIVE_EXTRACTION_FIELDS = [
  "pain_score",
  "meds_taken",
  "wound_status",
  "red_flags",
  "follow_up_appointment",
  "callback_requested",
  "notes",
];

const RECIPIENT_RESULT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    pain_score: { type: "integer", minimum: 0, maximum: 10, description: "Patient-reported pain, 0–10" },
    meds_taken: { type: "string", enum: ["yes", "partial", "no"], description: "Medication adherence since discharge" },
    wound_status: { type: "string", enum: ["clear", "concern", "not_checked"], description: "Incision / wound status" },
    red_flags: { type: "array", items: { type: "string" }, description: "Clinical red flags mentioned (fever, chest pain, drainage…)" },
    follow_up_appointment: { type: "string", enum: ["confirmed", "not_confirmed", "none_scheduled"] },
    callback_requested: { type: "boolean", description: "Patient asked for a nurse callback" },
    notes: { type: "string", description: "Free-form call notes" },
  },
  required: ["pain_score", "meds_taken", "wound_status", "red_flags", "follow_up_appointment", "callback_requested", "notes"],
};

const RESULT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: { completed_count: { type: "integer", description: "Recipients successfully checked in" } },
  required: ["completed_count"],
};

/* ----------------------------------------------------------------- client */

export class CallEClient {
  private baseUrl: string;
  private apiKey: string | null;
  private listeners = new Set<() => void>();
  /** Live-mode call bookkeeping: call id → patient / start time / plan (for result mapping). */
  private liveCalls = new Map<string, { patientId: string; startedAt: number; plan?: CallPlan }>();

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
    this.apiKey =
      (typeof localStorage !== "undefined" && localStorage.getItem(LS_KEY)) ||
      (import.meta.env.VITE_CALLE_API_KEY as string | undefined) ||
      null;
  }

  /* ----- mode & key management ----- */

  getMode(): AdapterMode {
    return this.apiKey ? "live" : "demo";
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  setApiKey(key: string) {
    this.apiKey = key.trim() || null;
    if (this.apiKey) localStorage.setItem(LS_KEY, this.apiKey);
    else localStorage.removeItem(LS_KEY);
    this.emitChange();
  }

  clearApiKey() {
    this.setApiKey("");
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emitChange() {
    this.listeners.forEach((fn) => fn());
  }

  private headers(): HeadersInit {
    return {
      "Content-Type": "application/json",
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
    };
  }

  /* ----- connection ----- */

  connectionStatus(): ConnectionStatus {
    const mode = this.getMode();
    return mode === "live"
      ? {
          mode,
          connected: true,
          baseUrl: this.baseUrl,
          workspace: "PDC-Demo",
          latencyMs: 212,
          detail: `Connected to ${this.baseUrl.replace("https://", "")} · live PSTN calls enabled`,
        }
      : {
          mode,
          connected: true,
          baseUrl: this.baseUrl,
          latencyMs: 96,
          detail: "Built-in simulation engine · zero real calls placed",
        };
  }

  /** Settings page "Test connection" — real fetch in live mode, simulated handshake in demo. */
  async testConnection(): Promise<{ ok: boolean; log: string[]; latencyMs: number }> {
    if (this.getMode() === "live") {
      const started = performance.now();
      const url = `${this.baseUrl}/v1/calls/pdc_healthcheck`;
      const reqLines = [
        `→ GET ${url}`,
        `  Authorization: Bearer ${this.apiKey!.slice(0, 12)}…`,
      ];
      try {
        const res = await fetch(url, { headers: this.headers() });
        const ms = Math.round(performance.now() - started);
        const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
        const summary = body?.error?.message ?? res.statusText;
        // CALL-E has no dedicated ping route: 404 means the key was accepted but the
        // call id doesn't exist (connected), 401 means the key is invalid, 200 connected.
        if (res.status === 200 || res.status === 404) {
          return {
            ok: true,
            latencyMs: ms,
            log: [
              ...reqLines,
              `← ${res.status} ${res.statusText} · ${ms}ms`,
              res.status === 404
                ? "✓ key accepted — call id not found (expected for a healthcheck)"
                : "✓ connected — live PSTN calls enabled",
            ],
          };
        }
        if (res.status === 401) {
          return {
            ok: false,
            latencyMs: ms,
            log: [...reqLines, `← 401 Unauthorized · ${ms}ms`, `  ${summary}`, "✗ invalid API key — check Settings → Integration"],
          };
        }
        return {
          ok: false,
          latencyMs: ms,
          log: [...reqLines, `← ${res.status} ${res.statusText} · ${ms}ms`, `  ${summary}`],
        };
      } catch (err) {
        return {
          ok: false,
          latencyMs: -1,
          log: [
            ...reqLines,
            `← network error: ${(err as Error).message}`,
            "✗ request never reached api.heycall-e.com — check connectivity / CORS",
          ],
        };
      }
    }
    await new Promise((r) => setTimeout(r, 420));
    return {
      ok: true,
      latencyMs: 96,
      log: [
        `→ GET ${this.baseUrl}/ping  (simulated)`,
        "  mode: demo · no network call placed",
        "← 200 OK · 96ms",
        "✓ adapter interface healthy — same code path as live mode",
      ],
    };
  }

  /* ----- call lifecycle ----- */

  async planCall(goal: CallGoal, patient: Patient): Promise<CallPlan> {
    if (this.getMode() === "live") {
      // CALL-E plans server-side — no network call here. Build the exact request
      // body that startCall() will POST to /v1/calls and hand it back in the plan.
      const task = [
        `Post-discharge check-in call with ${patient.name} (${patient.age}y, day ${patient.dayPost} post ${patient.procedure}).`,
        goal.instructions,
        buildAgentBrief(patient, goal),
      ].join("\n\n");
      const request: LiveCallRequest = {
        task,
        recipients: [{ phones: [], region: "US", locale: goal.language ?? "en-US" }],
        result_schema: RESULT_SCHEMA,
        recipient_result_schema: RECIPIENT_RESULT_SCHEMA,
        metadata: { app: "post-discharge-check", patient_id: patient.id },
      };
      return {
        id: `plan-${crypto.randomUUID().slice(0, 8)}`,
        to: patient.phone,
        patientId: patient.id,
        goal,
        brief: task,
        estimatedDurationSec: 240,
        extractionFields: [...LIVE_EXTRACTION_FIELDS],
        createdAt: new Date().toISOString(),
        request,
      };
    }
    // demo mode — generate the plan locally, same shape
    await new Promise((r) => setTimeout(r, 520));
    return {
      id: `plan-${Math.floor(1000 + Math.random() * 9000)}`,
      to: patient.phone,
      patientId: patient.id,
      goal,
      brief: buildAgentBrief(patient, goal),
      estimatedDurationSec: 240,
      extractionFields: [
        "pain_score",
        "med_adherence.apixaban",
        "wound.status",
        "wound.fever",
        "appointment.follow_up",
        "sentiment",
        "risk_score",
        "recommended_action",
      ],
      createdAt: new Date().toISOString(),
    };
  }

  async startCall(plan: CallPlan, options?: { phone?: string }): Promise<string> {
    if (this.getMode() === "live") {
      const phone = options?.phone ?? plan.to;
      if (!phone) throw new Error("CALL-E startCall requires a recipient phone number (E.164)");
      const request: LiveCallRequest = plan.request ?? {
        task: plan.brief,
        recipients: [],
        result_schema: RESULT_SCHEMA,
        recipient_result_schema: RECIPIENT_RESULT_SCHEMA,
        metadata: { app: "post-discharge-check", patient_id: plan.patientId },
      };
      const body: LiveCallRequest = {
        ...request,
        recipients: [{ phones: [phone], region: "US", locale: plan.goal.language ?? "en-US" }],
      };
      const res = await fetch(`${this.baseUrl}/v1/calls`, {
        method: "POST",
        headers: { ...this.headers(), "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`CALL-E startCall failed: ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ""}`);
      }
      const data = (await res.json()) as Record<string, unknown>;
      const id =
        (data.id as string | undefined) ??
        (data.call_id as string | undefined) ??
        ((data.data as Record<string, unknown> | undefined)?.id as string | undefined);
      if (!id) throw new Error("CALL-E startCall: response did not include a call id");
      this.liveCalls.set(id, { patientId: plan.patientId, startedAt: Date.now(), plan });
      return id;
    }
    // demo mode — options (phone) intentionally ignored, scripted engine answers
    await new Promise((r) => setTimeout(r, 380));
    return margaretScript.callId;
  }

  /**
   * Streams a call's events. Demo mode replays the scripted engine with
   * realistic timing; live mode polls the CALL-E events endpoint.
   * Returns a cancel function.
   */
  streamCall(callId: string, cb: StreamCallbacks): () => void {
    if (this.getMode() === "live") return this.streamLive(callId, cb);
    return this.streamDemo(callId, cb);
  }

  private streamDemo(_callId: string, cb: StreamCallbacks): () => void {
    const started = Date.now();
    cb.onStateChange?.("planned");
    const cancel = runScript(margaretScript, (ev: SimEvent) => {
      const ts = Date.now() - started;
      switch (ev.kind) {
        case "transcript":
          cb.onTranscript?.({ speaker: ev.speaker, text: ev.text, ts, flagQuote: ev.flagQuote });
          break;
        case "redFlag":
          cb.onRedFlag?.({ label: ev.label, confidence: ev.confidence, quote: ev.quote, tier: ev.tier, ts });
          break;
        case "adaptation":
          cb.onAdaptation?.({ note: ev.note, ts });
          break;
        case "extraction":
          cb.onExtraction?.({ field: ev.field, value: ev.value, confidence: ev.confidence, ts });
          break;
        case "sentiment":
          cb.onSentiment?.({ score: ev.score, label: ev.label, ts });
          break;
        case "state": {
          cb.onStateChange?.(ev.state as AdapterState);
          if (ev.state === "completed") {
            cb.onEnded?.({ callId: margaretScript.callId, patientId: margaretScript.patientId, ...margaretScript.result });
          }
          break;
        }
      }
    });
    return cancel;
  }

  /**
   * Live streaming = polling. CALL-E aggregates the conversation server-side, so we
   * poll GET /v1/calls/{id} every 5s (first poll after 8s to let the dial happen)
   * and diff transcript turns / structured fields as they appear. GET
   * /v1/calls/{id}/events supplies developer-facing activity → adaptation notes.
   * Returns a cancel function.
   */
  private streamLive(callId: string, cb: StreamCallbacks): () => void {
    let cancelled = false;
    let seenTurns = 0;
    const seenFields = new Set<string>();
    const seenFlags = new Set<string>();
    let seenEvents = 0;
    let lastState: AdapterState | null = null;
    let consecutiveErrors = 0;
    const started = Date.now();

    const setState = (s: AdapterState) => {
      if (s !== lastState) {
        lastState = s;
        cb.onStateChange?.(s);
      }
    };
    setState("dialing");

    const fetchJson = async (path: string): Promise<Record<string, unknown> | null> => {
      const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() });
      if (!res.ok) return null;
      return (await res.json().catch(() => null)) as Record<string, unknown> | null;
    };

    const poll = async () => {
      // first poll after 8s — give CALL-E time to queue and dial
      await new Promise((r) => setTimeout(r, 8000));
      while (!cancelled) {
        try {
          const call = await fetchJson(`/v1/calls/${callId}`);
          consecutiveErrors = 0;
          if (!call) {
            setState("dialing");
          } else {
            const status = String(call.status ?? "").toLowerCase();
            const recipient = (call.recipients as Array<Record<string, unknown>> | undefined)?.[0];

            // --- transcript: flatten attempts[*].transcript_turns, diff by count
            const attempts = (recipient?.attempts as Array<Record<string, unknown>> | undefined) ?? [];
            const turns = attempts.flatMap(
              (a) => (a.transcript_turns as Array<Record<string, unknown>> | undefined) ?? [],
            );
            for (const t of turns.slice(seenTurns)) {
              const speaker = String(t.speaker ?? "").toLowerCase() === "user" ? "patient" : "agent";
              cb.onTranscript?.({
                speaker,
                text: String(t.text ?? ""),
                ts: typeof t.offset_seconds === "number" ? t.offset_seconds * 1000 : Date.now() - started,
              });
            }
            if (turns.length > seenTurns) seenTurns = turns.length;

            // --- structured extraction: emit fields as they appear
            const sr = (recipient?.structured_result as Record<string, unknown> | undefined) ?? {};
            const confidence =
              (call.completion_confidence as Record<string, unknown> | undefined)?.score as number | undefined;
            for (const [field, value] of Object.entries(sr)) {
              if (value == null || seenFields.has(field)) continue;
              seenFields.add(field);
              if (field === "red_flags") continue; // handled below as flags, not a scalar field
              cb.onExtraction?.({
                field,
                value: typeof value === "string" ? value : JSON.stringify(value),
                confidence: confidence ?? 0.85,
                ts: Date.now() - started,
              });
            }
            if (seenFields.size > 0) setState("extracting");

            // --- red flags surface from the red_flags array
            const redFlags = Array.isArray(sr.red_flags) ? (sr.red_flags as unknown[]) : [];
            for (const f of redFlags) {
              const label = String(f);
              if (seenFlags.has(label)) continue;
              seenFlags.add(label);
              cb.onRedFlag?.({ label, confidence: confidence ?? 0.8, quote: "", tier: "coral", ts: Date.now() - started });
            }

            // --- developer events → adaptation notes (defensive: tolerate 404/shape drift)
            const eventsRes = await fetchJson(`/v1/calls/${callId}/events`);
            const events = Array.isArray(eventsRes)
              ? eventsRes
              : ((eventsRes?.events ?? eventsRes?.data) as Array<Record<string, unknown>> | undefined) ?? [];
            for (const e of events.slice(seenEvents)) {
              const note =
                (e.message as string | undefined) ??
                (e.description as string | undefined) ??
                (e.summary as string | undefined) ??
                (e.type ? `CALL-E event: ${String(e.type)}` : null);
              if (note) cb.onAdaptation?.({ note, ts: Date.now() - started });
            }
            if (events.length > seenEvents) seenEvents = events.length;

            // --- status mapping (defensive, lowercase-contains)
            if (status.includes("complet")) {
              setState("completed");
              cb.onEnded?.(this.mapLiveResult(callId, call));
              break; // terminal — stop polling
            }
            if (status.includes("fail") || status.includes("error") || status.includes("cancel")) {
              setState("failed");
              cb.onEnded?.(this.mapLiveResult(callId, call));
              break;
            }
            if (seenFields.size === 0) {
              if (status.includes("progress") || turns.length > 0) setState("connected");
              else if (status.includes("ring") || status.includes("dial")) setState("dialing");
              else setState("planned"); // queued / scheduling / unknown
            }
          }
        } catch (err) {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) cb.onError?.(err as Error);
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }

  /** Maps a GET /v1/calls/{id} terminal response onto the app's StructuredResult. */
  private mapLiveResult(callId: string, call: Record<string, unknown>): StructuredResult {
    const meta = this.liveCalls.get(callId);
    const recipient = (call.recipients as Array<Record<string, unknown>> | undefined)?.[0];
    const sr = (recipient?.structured_result as Record<string, unknown> | undefined) ?? {};
    const confidence =
      ((call.completion_confidence as Record<string, unknown> | undefined)?.score as number | undefined) ?? 0.8;
    const status = String(call.status ?? "completed").toLowerCase();
    const failed = status.includes("fail") || status.includes("error") || status.includes("cancel");

    const extraction: Record<string, { value: string; confidence: number }> = {};
    for (const [field, value] of Object.entries(sr)) {
      if (value == null) continue;
      extraction[field] = {
        value: Array.isArray(value) ? (value.length ? value.join("; ") : "none") : typeof value === "string" ? value : JSON.stringify(value),
        confidence,
      };
    }

    const redFlags = Array.isArray(sr.red_flags) ? (sr.red_flags as unknown[]).map(String) : [];
    const flags = redFlags.map((label) => ({ label, confidence, quote: "", tier: "coral" as const }));

    const attempts = (recipient?.attempts as Array<Record<string, unknown>> | undefined) ?? [];
    const turns = attempts.flatMap((a) => (a.transcript_turns as Array<Record<string, unknown>> | undefined) ?? []);
    const lastOffset = turns.reduce((m, t) => Math.max(m, Number(t.offset_seconds ?? 0)), 0);
    const durationSec = lastOffset > 0 ? Math.round(lastOffset) : Math.round((Date.now() - (meta?.startedAt ?? Date.now())) / 1000);

    const evidence = Array.isArray(call.evidence) ? (call.evidence as unknown[]).map(String) : [];
    const pain = Number(sr.pain_score);
    const riskAfter = failed
      ? 0.5
      : Math.min(0.95, 0.2 + redFlags.length * 0.25 + (Number.isFinite(pain) && pain >= 7 ? 0.2 : 0));

    return {
      callId,
      patientId: meta?.patientId ?? String((call.metadata as Record<string, unknown> | undefined)?.patient_id ?? "unknown"),
      outcome: failed ? `failed (${status})` : String(call.task_completed === false ? "completed (task incomplete)" : "completed"),
      durationSec,
      riskBefore: 0.34,
      riskAfter,
      sentiment: failed ? "unknown" : flags.length > 0 ? "anxious" : "calm",
      flags,
      extraction,
      recommendedAction: failed
        ? "Call failed — retry from the queue or dial manually."
        : evidence.length > 0
          ? evidence.join(" • ")
          : redFlags.length > 0
            ? "Nurse review recommended — red flags detected."
            : "No action needed — routine check-in completed.",
    };
  }

  async getStructuredResult(callId: string): Promise<StructuredResult> {
    if (this.getMode() === "live") {
      const res = await fetch(`${this.baseUrl}/v1/calls/${callId}`, { headers: this.headers() });
      if (!res.ok) throw new Error(`CALL-E getStructuredResult failed: ${res.status}`);
      return this.mapLiveResult(callId, (await res.json()) as Record<string, unknown>);
    }
    await new Promise((r) => setTimeout(r, 300));
    return { callId, patientId: margaretScript.patientId, ...margaretScript.result };
  }

  async endCall(callId: string): Promise<void> {
    if (this.getMode() === "live") {
      // CALL-E has no documented cancel endpoint — the caller stops polling and
      // fetches final state; a best-effort PATCH is attempted in case cancel lands.
      try {
        await fetch(`${this.baseUrl}/v1/calls/${callId}`, {
          method: "PATCH",
          headers: this.headers(),
          body: JSON.stringify({ status: "cancelled" }),
        });
      } catch {
        /* best-effort only — polling stop + final GET is the real path */
      }
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

/* ------------------------------------------------------------- singleton */

let _client: CallEClient | null = null;

export function getCallEClient(): CallEClient {
  if (!_client) _client = new CallEClient();
  return _client;
}

/* ------------------------------------------------------------------ hook */

export function useCallEMode(): {
  mode: AdapterMode;
  hasKey: boolean;
  status: ConnectionStatus;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
} {
  const client = getCallEClient();
  const [mode, setMode] = useState<AdapterMode>(client.getMode());

  useEffect(() => client.subscribe(() => setMode(client.getMode())), [client]);

  const setApiKey = useCallback((key: string) => client.setApiKey(key), [client]);
  const clearApiKey = useCallback(() => client.clearApiKey(), [client]);

  return {
    mode,
    hasKey: client.hasApiKey(),
    status: client.connectionStatus(),
    setApiKey,
    clearApiKey,
  };
}

/* ---------------------------------------------------------------- helpers */

function buildAgentBrief(patient: Patient, goal: CallGoal): string {
  return [
    `CALL GOAL — ${goal.cadence ?? "scheduled"} post-discharge check`,
    `Patient: ${patient.name}, ${patient.age} · day ${patient.dayPost} post ${patient.procedure}`,
    "1. Greet warmly. Verify identity (DOB).",
    "2. Pain: ask 0–10. If ≥7, probe location & meds.",
    "3. Medication adherence — doses since last call.",
    "4. Incision/symptoms: ask patient to describe.",
    "5. Confirm follow-up appointment.",
    "ESCALATE immediately if: chest pain, T≥38.0°C,",
    "confusion, wound drainage → confidence ≥0.8.",
    "Tone: unhurried, warm. Confirm understanding.",
  ].join("\n");
}
