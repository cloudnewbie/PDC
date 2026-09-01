# Research Brief — CALL-E Hackathon App: "Post-Discharge Check"

## Hackathon context
- Event: "CALL-E: Your Code Is Calling" (Devpost), deadline Sep 14, 2026, $10,000 prizes.
- CALL-E is a developer-first platform for AI agents that make REAL phone calls: plan a call, dial out,
  hold natural conversation, adapt in real time, return structured results — via SDK, API, MCP, CLI, SKILL.
- Judging criteria: Real World Impact, Quality of Idea (non-obvious use), Technical Implementation
  (CALL-E actually imported and called at runtime), Product Experience & Demo.

## App concept (decided): "Post-Discharge Check"
A care-coordination web app for hospitals/clinics: after a patient is discharged, an AI phone agent
proactively calls the patient at scheduled intervals (24h, 72h, 7-day), holds a natural check-in
conversation (pain level, medication adherence, wound symptoms, follow-up appointment), detects
red-flag symptoms in real time, escalates urgent cases to the on-call nurse, and returns structured
results to the care team dashboard. This targets the ~$15B problem of preventable hospital readmissions
(30-day readmission penalties under CMS). Strong on Real World Impact judging criteria.

## Product shape (web app, frontend-only with simulated call engine + pluggable CALL-E adapter)
Key experiences:
1. Landing page — hero with the product story, live call simulation teaser, stats, how-it-works, hackathon context.
2. Dashboard — KPI cards (patients monitored, calls completed, escalations, adherence rate), call activity feed, queue.
3. Patients — patient roster with risk stratification, discharge cohorts, enroll patient flow.
4. Call Campaigns — campaign builder: pick cohort, schedule cadence, define call goals/script in natural language.
5. Live Call Console — real-time transcript stream with speaker labels, red-flag detection highlights,
   agent adaptation events, escalate-to-nurse action, structured outcome extraction as the call runs.
6. Call Results — structured results per call: symptom checklist, medication adherence, appointment status,
   sentiment, risk score, recommended action; export/webhook simulation.
7. Escalations — triage inbox for flagged patients with priority, context summary, callback scheduling.
8. Settings / CALL-E Integration — API key config, connection status, voice/persona settings, adapter mode
   (demo simulation vs live CALL-E), code snippet showing SDK usage.

## Technical integration plan (judges: "CALL-E imported and actually called at runtime")
- `src/lib/calle.ts` — a typed CALL-E adapter (client interface: planCall, startCall, getTranscript,
  getStructuredResult, endCall). When `VITE_CALLE_API_KEY` is set it calls the live CALL-E REST API
  (https://api.call-e.ai/v1) via fetch; otherwise it runs in built-in simulation mode with the same
  interface. UI visibly shows which mode is active.
- The simulation engine streams transcripts, red-flag detection, and structured extraction with
  realistic timing so the demo works without consuming real calls.

## Domain realism for content
- Red-flag symptoms after discharge: fever >38°C, chest pain, shortness of breath, wound discharge,
  uncontrolled pain, confusion, missed anticoagulant doses.
- Common discharge cohorts: cardiac (post-MI, heart failure), orthopedic (hip/knee replacement),
  surgical (general post-op), COPD/pneumonia.
- Metrics that matter: 30-day readmission rate (~15% avg US), check-in completion, escalation rate,
  med adherence, patient-reported outcomes.
