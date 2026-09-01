## Inspiration

Every year, roughly 15% of US patients are readmitted within 30 days of discharge, and preventable readmissions are a ~$15B/year problem for hospitals under CMS penalties. The cruel part is how small the beginnings are: a fever that shows up on day 2, a missed anticoagulant dose, an incision the patient wasn't sure was normal. The follow-up call that would catch it is the first thing that falls through the cracks when one nurse is responsible for thirty discharged patients.

We asked a simple question: what if *every* discharged patient got a real phone call at 24 hours, 72 hours, and day 7 — not a robocall, not an SMS survey, but a natural conversation that listens, notices red flags, and loops in a nurse before things get worse? CALL-E made that question answerable in a hackathon.

## What it does

Post-Discharge Check (PDC) is a care-coordination web app for hospital care teams:

1. **Enroll** — a coordinator picks a discharged patient (post-MI, hip/knee replacement, post-op, COPD) and enrolls them in a check-in campaign with a cadence (24h / 72h / 7-day) and goals written in plain English ("check pain, confirm apixaban adherence, ask about the incision").
2. **CALL-E calls** — the platform plans the call, dials the patient, and holds a warm, unhurried conversation covering pain, medications, wound symptoms, and the follow-up appointment.
3. **Red flags surface in real time** — while the transcript streams in, PDC highlights fever, chest pain, shortness of breath, wound drainage, or missed blood thinners, each with a confidence score and the exact quote that triggered it.
4. **Escalation with context** — a flagged patient lands in the nurse triage inbox with priority, a summary, and the transcript — not just "call this person back."
5. **Structured results** — every call ends with a typed outcome: pain score, medication adherence, wound status, appointment confirmation, sentiment, risk score before/after, and a recommended action, ready for EHR export or a webhook.

## How we built it

The app is React 19 + TypeScript + Vite, with Tailwind and shadcn/ui, Framer Motion and GSAP on the landing page, Three.js in the hero, and recharts on the dashboard.

The core is `src/lib/calle.ts` — a typed adapter around the CALL-E API with five methods: `planCall`, `startCall`, `streamCall`, `getStructuredResult`, `endCall`. The interface deliberately mirrors the official `@call-e/calle` SDK, so swapping the adapter for `new CalleClient(...)` is a one-line change.

In live mode (when `VITE_CALLE_API_KEY` is set), the adapter does real work at runtime:

- `POST /v1/calls` with the agent task, the recipient phone, an `Idempotency-Key`, and a `recipient_result_schema` — a JSON Schema telling CALL-E exactly what to extract from the conversation: `pain_score` (0–10 integer), `meds_taken`, `wound_status`, `red_flags`, `follow_up_appointment`, `callback_requested`, and free-form `notes`.
- Polls `GET /v1/calls/{id}` every 5 seconds and diffs `attempts[].transcript_turns` and `structured_result` so the Live Call Console fills in as the call runs; `GET /v1/calls/{id}/events` supplies the developer-facing adaptation log.
- Maps the terminal response onto our `StructuredResult`, folding in `completion_confidence` and the platform's `evidence` array so nurses see *why* the agent concluded what it did.

Because we can't spend call credits on every demo run, the same adapter has a demo mode: a scripted simulation engine (`src/lib/simulation.ts`) replays a realistic call — transcript timing, red-flag events, agent adaptations, live field extraction — through the identical interface. The active mode is always visible in the UI, and Settings runs a real connection test that logs the actual HTTP exchange line by line.

## Challenges we ran into

- **Streaming without a stream.** CALL-E aggregates the conversation server-side, so there's no websocket to subscribe to. We built a polling + diffing layer that tracks seen transcript turns, extracted fields, and flags separately so the console updates incrementally instead of flickering.
- **Health-checking an API with no ping route.** A GET on a nonexistent call id returns 404 when the key is valid and 401 when it isn't — our connection test interprets that (and says so in the log) instead of treating 404 as failure.
- **Schema design is the product.** Our first extraction schema was too free-form; nurses don't act on paragraphs. Iterating to a strict schema (enums for adherence and wound status, a bounded pain score, a red-flag array) is what turned transcripts into something a care team can triage.
- **No cancel endpoint.** Stopping a live call means stop polling and fetch final state, with a best-effort PATCH in case a cancel route lands.

## Accomplishments that we're proud of

- The full lifecycle — enroll → plan → dial → live transcript → red flag → escalate → structured outcome — is visible end to end in the app, and the CALL-E integration is real code running at runtime, not screenshots of code.
- The adapter is honest: the same interface in both modes, the UI always shows which mode is active, and the connection test logs real requests and responses.
- Clinical realism: red-flag rules (fever ≥ 38°C, chest pain, wound drainage, missed anticoagulants), P1/P2/P3 escalation priorities with SLA countdowns, and a triage inbox designed around how a nurse actually works a queue.

## What we learned

- **The schema is the unlock.** Voice AI demos are easy; the hard, valuable part is defining the `result_schema` that turns a conversation into a record a hospital system will accept. CALL-E's server-side structured extraction is exactly the right primitive for this.
- **Confidence and evidence matter more in healthcare than anywhere else.** Every flag carries a confidence score and a quote, because a nurse will only act on an escalation they can verify in one click.
- **Design the boring path.** The escalate-to-nurse flow, the SLA timer, and the routine "no action needed" outcome matter as much as the flashy live console — most calls should end boring, and the product has to make those calls cheap.

## What's next for Post-Discharge Check (PDC)

- **FHIR/EHR write-back** so structured results land in the patient chart, not just a dashboard.
- **Multilingual calls and SMS fallback** for patients who don't answer or prefer another language.
- **Closed-loop callbacks** — the nurse's callback outcome feeds the next call's brief, so the agent gets smarter per patient.
- **A real pilot** on one cohort. Heart failure is the natural first target: high readmission rate, and a 30-day outcome everyone already measures.
