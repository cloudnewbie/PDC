/**
 * Demo simulation engine for the CALL-E adapter.
 * Streams the scripted 14-turn Margaret Ellis call (72h post-op, live-call.md)
 * with realistic timing, red-flag beats, adaptation events and structured
 * extraction — emitting exactly the same events the live CALL-E API would.
 */

export type Speaker = "agent" | "patient";

export type SimEvent =
  | { kind: "transcript"; speaker: Speaker; text: string; flagQuote?: string }
  | { kind: "redFlag"; label: string; confidence: number; quote: string; tier: "coral" | "amber" }
  | { kind: "adaptation"; note: string }
  | { kind: "extraction"; field: string; value: string; confidence: number }
  | { kind: "sentiment"; score: number; label: string }
  | { kind: "state"; state: string };

export interface SimScriptStep {
  /** ms to wait AFTER the previous step before emitting this one */
  delay: number;
  event: SimEvent;
}

export interface SimScript {
  patientId: string;
  callId: string;
  outcome: string;
  durationSec: number;
  steps: SimScriptStep[];
  result: {
    outcome: string;
    durationSec: number;
    riskBefore: number;
    riskAfter: number;
    sentiment: string;
    flags: { label: string; confidence: number; quote: string; tier: "coral" | "amber" }[];
    extraction: Record<string, { value: string; confidence: number }>;
    recommendedAction: string;
  };
}

/**
 * Margaret Ellis · 72 · L hip replacement · day 3 · 72h check-in.
 * ~14 turns. Key beats: greeting/verify → pain 4/10 (probe night pain) →
 * apixaban adherence (amber flag) → incision check (coral flag + wound protocol)
 * → fever ruled out → appointment confirmed → warm close.
 */
export const margaretScript: SimScript = {
  patientId: "margaret-ellis",
  callId: "call-1042",
  outcome: "completed",
  durationSec: 252,
  steps: [
    { delay: 0, event: { kind: "state", state: "dialing" } },
    { delay: 2600, event: { kind: "state", state: "connected" } },
    {
      delay: 900,
      event: {
        kind: "transcript",
        speaker: "agent",
        text: "Hi, is this Margaret Ellis? This is Ellie, the care-coordination assistant calling on behalf of Riverside General — a quick check-in after your hip surgery. Before we start, can you confirm your date of birth?",
      },
    },
    {
      delay: 4200,
      event: { kind: "transcript", speaker: "patient", text: "June second, nineteen fifty-three. Yes, that's me. I'm doing alright, just sore." },
    },
    { delay: 1800, event: { kind: "sentiment", score: 0.25, label: "calm" } },
    {
      delay: 1600,
      event: {
        kind: "transcript",
        speaker: "agent",
        text: "Thank you, Margaret — that's confirmed. Soreness is expected at this stage. On a scale of zero to ten, how would you rate your pain right now?",
      },
    },
    { delay: 4600, event: { kind: "transcript", speaker: "patient", text: "Maybe a four. Worse at night, though — it wakes me up sometimes." } },
    { delay: 1400, event: { kind: "extraction", field: "pain_score", value: "4/10 (worse at night)", confidence: 0.93 } },
    { delay: 900, event: { kind: "adaptation", note: "Probing night pain (pain score ≥ 4)" } },
    {
      delay: 1500,
      event: {
        kind: "transcript",
        speaker: "agent",
        text: "A four, and worse at night — I've noted that. Are you able to get back to sleep after it wakes you, and are you taking anything for it?",
      },
    },
    {
      delay: 4800,
      event: { kind: "transcript", speaker: "patient", text: "I take the Tylenol like they said. I don't want the strong pills, they make me fuzzy." },
    },
    { delay: 1700, event: { kind: "sentiment", score: 0.32, label: "calm, mildly anxious" } },
    {
      delay: 1700,
      event: {
        kind: "transcript",
        speaker: "agent",
        text: "That's completely fine — acetaminophen on schedule is a good plan. Now, an important one: your blood thinner, apixaban. Have you been able to take every dose, morning and evening?",
      },
    },
    {
      delay: 5000,
      event: {
        kind: "transcript",
        speaker: "patient",
        text: "I take it every morning with breakfast… I did forget Sunday night. I only remembered at bedtime the next day.",
        flagQuote: "I did forget Sunday night.",
      },
    },
    {
      delay: 1300,
      event: { kind: "redFlag", label: "missed anticoagulant", confidence: 0.74, quote: "I did forget Sunday night.", tier: "amber" },
    },
    { delay: 800, event: { kind: "extraction", field: "med_adherence.apixaban", value: "1 missed dose (Sun PM)", confidence: 0.88 } },
    {
      delay: 1800,
      event: {
        kind: "transcript",
        speaker: "agent",
        text: "Thank you for telling me — one missed evening dose is worth noting, and I've flagged it for the team. If it happens again, don't double up; just take the next scheduled dose. Now I'd like you to look at your incision for me. Can you see the area around the staples?",
      },
    },
    {
      delay: 5600,
      event: {
        kind: "transcript",
        speaker: "patient",
        text: "Hold on… okay, I'm looking. It's a bit red around the staples… and warm, I think. Warmer than the other side.",
        flagQuote: "It's a bit red around the staples… and warm, I think.",
      },
    },
    {
      delay: 1200,
      event: { kind: "redFlag", label: "possible wound infection", confidence: 0.87, quote: "It's a bit red around the staples… and warm, I think.", tier: "coral" },
    },
    { delay: 700, event: { kind: "adaptation", note: "Wound-infection protocol engaged (flag 0.87)" } },
    { delay: 900, event: { kind: "extraction", field: "wound.status", value: "redness + warmth reported", confidence: 0.87 } },
    { delay: 600, event: { kind: "adaptation", note: "Speaking rate −20% (patient hard of hearing)" } },
    { delay: 500, event: { kind: "sentiment", score: 0.48, label: "anxious" } },
    {
      delay: 2200,
      event: {
        kind: "transcript",
        speaker: "agent",
        text: "Okay, Margaret — take your time. I'm going to ask a few quick questions about that. Have you had a fever or chills in the last day? And is there any drainage or fluid coming from the incision?",
      },
    },
    {
      delay: 5200,
      event: { kind: "transcript", speaker: "patient", text: "No fever — I took my temperature this morning, it was normal. And nothing leaking, it's dry." },
    },
    { delay: 1400, event: { kind: "extraction", field: "wound.fever", value: "denied", confidence: 0.95 } },
    { delay: 600, event: { kind: "sentiment", score: 0.36, label: "calm, mildly anxious" } },
    {
      delay: 1800,
      event: {
        kind: "transcript",
        speaker: "agent",
        text: "Good — no fever and no drainage is reassuring. Because of the redness and warmth, I'd like a nurse to give you a call about the incision, likely within the next two hours. Is that alright?",
      },
    },
    {
      delay: 4600,
      event: { kind: "transcript", speaker: "patient", text: "Yes, of course. Should I… should I be worried? Is it infected?" },
    },
    {
      delay: 2400,
      event: {
        kind: "transcript",
        speaker: "agent",
        text: "It's a good question, and you're doing exactly the right thing. Some redness can be normal after surgery, but warmth is worth a nurse's eyes — that's why we're being careful. Last thing: you have a follow-up with Dr. Chen on March fourteenth. Are you still able to make that appointment?",
      },
    },
    {
      delay: 5200,
      event: { kind: "transcript", speaker: "patient", text: "Yes — March fourteenth, ten thirty. My daughter is driving me." },
    },
    { delay: 1300, event: { kind: "extraction", field: "appointment.follow_up", value: "confirmed — Mar 14, Dr. Chen", confidence: 0.98 } },
    { delay: 700, event: { kind: "extraction", field: "sentiment", value: "calm, mildly anxious", confidence: 0.81 } },
    { delay: 500, event: { kind: "extraction", field: "risk_score", value: "0.46 → 0.68 ↑", confidence: 0.9 } },
    { delay: 500, event: { kind: "extraction", field: "recommended_action", value: "nurse callback within 2h — wound check", confidence: 0.92 } },
    {
      delay: 1800,
      event: {
        kind: "transcript",
        speaker: "agent",
        text: "Wonderful. You're all set then, Margaret — a nurse will call you shortly about the incision, and we'll check in again after your appointment. Rest up, and keep that Tylenol on schedule. Take care now.",
      },
    },
    { delay: 4200, event: { kind: "transcript", speaker: "patient", text: "Thank you, dear. Goodbye." } },
    { delay: 1200, event: { kind: "state", state: "extracting" } },
    { delay: 1600, event: { kind: "state", state: "completed" } },
  ],
  result: {
    outcome: "completed",
    durationSec: 252,
    riskBefore: 0.46,
    riskAfter: 0.68,
    sentiment: "calm, mildly anxious",
    flags: [
      { label: "possible wound infection", confidence: 0.87, quote: "It's a bit red around the staples… and warm, I think.", tier: "coral" },
      { label: "missed anticoagulant", confidence: 0.74, quote: "I did forget Sunday night.", tier: "amber" },
    ],
    extraction: {
      pain_score: { value: "4/10 (worse at night)", confidence: 0.93 },
      "med_adherence.apixaban": { value: "1 missed dose (Sun PM)", confidence: 0.88 },
      "wound.status": { value: "redness + warmth reported", confidence: 0.87 },
      "wound.fever": { value: "denied", confidence: 0.95 },
      "appointment.follow_up": { value: "confirmed — Mar 14, Dr. Chen", confidence: 0.98 },
      sentiment: { value: "calm, mildly anxious", confidence: 0.81 },
      risk_score: { value: "0.68 ↑", confidence: 0.9 },
      recommended_action: { value: "nurse callback within 2h — wound check", confidence: 0.92 },
    },
    recommendedAction: "nurse callback within 2h — wound check",
  },
};

/** Short 6-message teaser script for the landing §5 mini console. */
export const teaserScript: { speaker: Speaker; text: string; flagQuote?: string }[] = [
  { speaker: "agent", text: "Hi Margaret — Ellie from Riverside General. Quick check-in after your hip surgery. How's the pain today, zero to ten?" },
  { speaker: "patient", text: "Maybe a four. Worse at night, though." },
  { speaker: "agent", text: "Noted — a four. Now, can you look at the incision for me? Any redness or swelling around the staples?" },
  { speaker: "patient", text: "It's a bit red around the staples… and warm, I think.", flagQuote: "some redness around the incision" },
  { speaker: "agent", text: "Okay — take your time. Any fever or drainage? …Good. I'd like a nurse to call you about the incision today." },
  { speaker: "patient", text: "Alright. Thank you, dear." },
];

/**
 * Runs a script against a callback, respecting per-step delays.
 * Returns a cancel function.
 */
export function runScript(script: SimScript, emit: (e: SimEvent, atMs: number) => void): () => void {
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  let t = 0;
  for (const step of script.steps) {
    t += step.delay;
    const at = t;
    timers.push(
      setTimeout(() => {
        if (!cancelled) emit(step.event, at);
      }, t),
    );
  }
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}

/** Total wall-clock duration of a script (ms). */
export function scriptDuration(script: SimScript): number {
  return script.steps.reduce((acc, s) => acc + s.delay, 0);
}
