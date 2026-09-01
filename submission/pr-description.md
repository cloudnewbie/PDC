# PR: Post-Discharge Check — AI phone agent for post-discharge patient follow-up

**Contribution area:** Example Apps (or "Agent Skills" if maintainers prefer the adapter extracted as a reusable skill)

## Summary
Post-Discharge Check (PDC) is a care-coordination app that uses CALL-E to proactively call
discharged patients (24h / 72h / 7-day cadence), hold a natural check-in conversation,
detect red-flag symptoms in real time, escalate urgent cases to nurses, and return
structured results a care team can act on. It targets preventable 30-day hospital
readmissions — a ~$15B/yr problem with CMS penalties.

## Why this use case
- **Real-world impact:** nurse follow-up calls don't scale; most discharged patients get
  zero proactive contact. Every missed red flag is a potential readmission or worse.
- **Non-obvious fit for voice:** post-discharge check-ins are a structured-yet-conversational
  workflow — exactly where a phone agent that adapts in real time beats IVR trees and SMS surveys.
- **Reusable:** `src/lib/calle.ts` is a clean typed adapter (planCall / startCall / streamCall /
  getStructuredResult / endCall) that other contributors can copy into their own projects.

## CALL-E usage (runtime, not reference-only)
- Live mode calls the real CALL-E Developer API end-to-end at `https://api.heycall-e.com`:
  `POST /v1/calls` (task + recipients + recipient_result_schema, idempotent) → poll
  `GET /v1/calls/{id}` + `GET /v1/calls/{id}/events` for live transcript turns, structured
  results, completion confidence, and evidence. See `src/lib/calle.ts`.
- Demo/simulation mode implements the identical client interface so judges can experience
  the full flow without spending call credits; the UI always shows which mode is active.

## Demo
- Video (≈3 min): <YOUTUBE_URL>
- Live app: <DEMO_URL>
- CALL-E account email: gary.bhandarkar@gmail.com

## Checklist
- [x] Functional application using CALL-E (adapter imported and invoked at runtime)
- [x] Demo video publicly visible
- [x] README with setup + integration details
- [x] Simulated patient data only; explicit "not a medical device" disclaimer
