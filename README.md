# Post-Discharge Check (PDC)

**An AI phone agent that calls every discharged patient — so no one falls through the cracks.**

Built for **CALL-E: Your Code Is Calling** (2026). PDC uses CALL-E to turn post-discharge
follow-up — today a manual, phone-tag-driven process that misses most patients — into a
proactive, structured, always-on voice workflow.

## The problem

- ~15% of US patients are readmitted within 30 days; a large share are preventable.
- CMS penalizes hospitals for excess readmissions (≈$15B/yr problem).
- Nurses cannot physically call every discharged patient at 24h / 72h / 7-day marks.

## What PDC does

1. **Enroll** a discharged patient into a check-in campaign (cohort, cadence, goals).
2. **CALL-E plans and places the call** — natural conversation covering pain, meds,
   wound symptoms, and follow-up appointments.
3. **Detects red flags in real time** (fever, chest pain, dyspnea, wound discharge,
   missed anticoagulants) with confidence scores.
4. **Escalates to the on-call nurse** with full context when risk spikes.
5. **Returns structured results** — symptom checklist, adherence, sentiment, risk
   score, recommended action — ready for EHR/webhook export.

## How CALL-E is used (technical)

`src/lib/calle.ts` is a typed adapter around the CALL-E platform:

```ts
import { getCallEClient } from "@/lib/calle";

const calle = getCallEClient();            // Live mode when VITE_CALLE_API_KEY / key set
const plan = await calle.planCall(goal, patient);
const callId = await calle.startCall(plan, { phone: patient.phoneE164 });
await calle.streamCall(callId, {
  onTranscript: (t) => {/* live transcript */},
  onRedFlag:    (f) => {/* real-time risk detection */},
  onExtraction: (e) => {/* structured fields fill live */},
  onEnded:      (o) => {/* final outcome */},
});
const result = await calle.getStructuredResult(callId);
```

- **Live mode**: calls the real CALL-E Developer API (`https://api.heycall-e.com`) with
  Bearer auth — `POST /v1/calls` (task + recipients + `recipient_result_schema` +
  `Idempotency-Key`), then polls `GET /v1/calls/{id}` and `GET /v1/calls/{id}/events`
  for transcript turns, structured results, `completion_confidence`, and evidence.
  The adapter mirrors the official SDK 1:1 (`@call-e/calle` → `CalleClient.calls.createAndWait`).
- **Demo mode**: same interface, built-in simulation engine (`src/lib/simulation.ts`)
  so the full experience is reviewable without consuming call credits.
- The active mode is always visible in the UI (topbar pill → Settings → Integration).

## App tour

| Route | What it shows |
|---|---|
| `/` | Cinematic landing: problem story, how it works, playable call teaser, integration code |
| `/app` | Care-team dashboard: KPIs, program pulse, live queue, escalations |
| `/app/patients` | Risk-stratified roster, detail drawer, 3-step enroll wizard |
| `/app/campaigns` | Campaign builder: cadence timeline, NL goals → agent brief |
| `/app/live` | **Live Call Console**: streaming transcript, red flags, adaptation log, live extraction, escalate-to-nurse |
| `/app/results` | Structured results, transcript replay, JSON export + webhook log |
| `/app/escalations` | P1/P2/P3 triage inbox with SLA countdowns |
| `/app/settings` | CALL-E integration: API key, mode toggle, connection test |

## Run it

```bash
npm install
npm run dev                 # demo mode, no key needed
VITE_CALLE_API_KEY=calle_live_... npm run dev   # live CALL-E mode (real PSTN calls)
```

## Stack

React 19 · TypeScript · Vite 7 · Tailwind 3.4 · shadcn/ui · Framer Motion · GSAP ·
Three.js (landing hero) · recharts. All patient data is simulated — not a medical device.
