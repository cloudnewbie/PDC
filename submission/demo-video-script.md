# Demo Video Script — Post-Discharge Check (≈3 minutes)

Target: 2:45–3:10. One continuous screen recording + voiceover. Show the real app, not slides.

## 0:00–0:25 — Hook (landing page)
**Visual:** Dark landing hero, waveform morphing into an ECG line.
**VO:** "Every year, one in seven discharged patients in the US ends up back in the hospital
within 30 days. Most of those readmissions are preventable — but nurses can't physically
call every patient. Post-Discharge Check fixes that with CALL-E: an AI agent that actually
picks up the phone."

## 0:25–0:55 — Problem & setup (landing scroll)
**Visual:** Scroll through problem story beats (discharge → silence → readmission), stats strip.
**VO:** "Here's the gap: a patient goes home Friday, the clinic calls Monday, and by then a
small symptom has become an ER visit. We built a care-coordination app where CALL-E agents
call every discharged patient — at 24 hours, 72 hours, and 7 days."

## 0:55–1:25 — Enroll & campaign (app)
**Visual:** `/app/patients` — open Margaret Ellis (72, post-surgical), show risk badge.
Then `/app/campaigns` — show cadence timeline + natural-language goals.
**VO:** "A nurse enrolls a patient in seconds. Campaigns define when to call and what the
agent should accomplish — written in plain language: 'check pain level, confirm medications,
listen for red flags.' CALL-E turns that into a call plan."

## 1:25–2:25 — THE LIVE CALL (centerpiece)
**Visual:** `/app/live` — press "Start call". Let the transcript stream. Pause on:
1. Red-flag chip popping up ("fever 38.4°C — 92% confidence")
2. Adaptation event ("agent slowed down, re-asked med question")
3. Extraction panel filling itself (pain 6/10, meds taken, wound: discharge)
4. Risk gauge climbing → click **Escalate to nurse** → modal → "Nurse Ruiz paged"
**VO:** "This is a real CALL-E call, streamed live. Watch: the agent detects a fever mention
and flags it with confidence. It adapts mid-conversation. Every answer is extracted into
structured data as it's spoken — and when the risk crosses threshold, a human is paged
with full context. The machine listens; the nurse decides."

## 2:25–2:45 — Results & escalation (app)
**Visual:** `/app/results` — structured outcome card, JSON export. `/app/escalations` —
P1 inbox with SLA timer.
**VO:** "After the call, everything lands here: symptom checklist, adherence, sentiment,
risk score, recommended action — exportable to any system. Escalations triage themselves
by priority with SLAs."

## 2:45–3:05 — Technical implementation (settings)
**Visual:** `/app/settings` — mode toggle Demo ↔ Live, connection test turns green,
code block showing the adapter.
**VO:** "Under the hood it's one typed adapter — planCall, startCall, streamCall,
getStructuredResult. Point it at your CALL-E key and the same UI runs real calls.
The code is clean enough to lift into your own project."

## 3:05–3:15 — Close
**Visual:** Landing final CTA, "Built at CALL-E: Your Code Is Calling".
**VO:** "Post-Discharge Check: no patient falls through the cracks. Built on CALL-E."

### Recording tips
- Record at 1440p+, hide bookmarks bar, use demo mode (faster, deterministic).
- Pre-open tabs: `/`, `/app`, `/app/live`, `/app/results`, `/app/settings`.
- Do the live call segment in one take; it's the segment judges rewatch.
