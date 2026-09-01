/**
 * Post-Discharge Check — seed data.
 * All app pages consume this module. Dates are anchored to "today" = Mar 10, 2026
 * (a Tuesday, matching the design copy).
 */

export type Cohort = "cardiac" | "ortho" | "surgical" | "copd";
export type RiskLevel = "low" | "moderate" | "high";
export type CallStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "escalated"
  | "missed"
  | "failed";
export type Cadence = "24h" | "48h" | "72h" | "day7" | "day14";
export type Priority = "P1" | "P2" | "P3";

export interface Medication {
  name: string;
  dose: string;
  schedule: string;
  adherence: number; // 0–100
  note?: string;
}

export interface Patient {
  id: string;
  name: string;
  firstName: string;
  age: number;
  sex: "F" | "M";
  mrn: string;
  phone: string;
  dob: string;
  avatar: string;
  cohort: Cohort;
  cohortLabel: string;
  procedure: string;
  discharged: string; // ISO date
  dayPost: number; // day N post discharge
  riskScore: number; // 0–1
  riskLevel: RiskLevel;
  riskTrend: "up" | "down" | "flat";
  riskSpark: number[]; // 7-day trend
  adherence: number; // 0–100 reported med adherence
  status: CallStatus;
  lastCall?: { when: string; outcome: string };
  nextCall?: { when: string; cadence: Cadence };
  medications: Medication[];
  campaignId: string;
  comorbidities: string[];
  language: "English" | "Español";
}

export interface CareTeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  onCall?: boolean;
  presence: "online" | "busy" | "away";
}

export interface Campaign {
  id: string;
  name: string;
  cohort: Cohort;
  status: "active" | "paused";
  cadence: Cadence[];
  patientsEnrolled: number;
  callsPerWeek: number;
  completionPct: number;
  flagsScreened: string[];
  goals: string;
  retryPolicy: string;
}

export interface RedFlag {
  label: string;
  confidence: number; // 0–1
  quote?: string;
  ts?: string;
  tier: "coral" | "amber";
}

export interface ExtractionResult {
  [field: string]: { value: string; confidence: number };
}

export interface CallRecord {
  id: string;
  patientId: string;
  cadence: Cadence;
  scheduledFor: string; // "HH:MM" today or label
  startedAt?: string;
  durationSec?: number;
  status: CallStatus;
  outcome?: string;
  flags: RedFlag[];
  riskBefore?: number;
  riskAfter?: number;
  campaignId: string;
  extraction?: ExtractionResult;
  sentiment?: string;
  escalatedTo?: string; // care team member id
}

export interface Escalation {
  id: string;
  priority: Priority;
  patientId: string;
  context: string;
  flags: RedFlag[];
  openedAgoMin: number; // minutes since opened (demo "now")
  slaTargetMin: number;
  assigneeId?: string;
  status: "open" | "resolved";
  timeline: { ts: string; label: string; pending?: boolean }[];
  resolution?: { by: string; note: string; timeToResolveMin: number; outcome: string };
}

export interface KpiDef {
  id: string;
  label: string;
  value: string;
  numeric: number;
  delta: string;
  deltaTone: "green" | "coral";
  spark: number[]; // 7 points
}

export interface ChartDay {
  date: string; // "Mar 4"
  calls: number;
  flags: number;
}

export interface ActivityEvent {
  id: string;
  ts: string;
  type: "call_started" | "call_completed" | "flag" | "escalation" | "result" | "nurse_action";
  text: string;
  link?: string;
}

export type KpiSeries = KpiDef;

export const COHORT_LABELS: Record<Cohort, string> = {
  cardiac: "Cardiac",
  ortho: "Orthopedic",
  surgical: "General surgery",
  copd: "COPD / Pneumonia",
};

/* ---------------------------------------------------------------- patients */

export const patients: Patient[] = [
  {
    id: "margaret-ellis",
    name: "Margaret Ellis",
    firstName: "Margaret",
    age: 72,
    sex: "F",
    mrn: "MRN-0482113",
    phone: "(617) 555-0143",
    dob: "1953-06-02",
    avatar: "/avatar-margaret.png",
    cohort: "ortho",
    cohortLabel: "Ortho · L hip replacement",
    procedure: "Left total hip arthroplasty",
    discharged: "2026-03-07",
    dayPost: 3,
    riskScore: 0.46,
    riskLevel: "moderate",
    riskTrend: "up",
    riskSpark: [0.32, 0.33, 0.36, 0.38, 0.41, 0.44, 0.46],
    adherence: 92,
    status: "in_progress",
    lastCall: { when: "Yesterday 09:20", outcome: "Pain 3/10 · Meds ✓ · No flags" },
    nextCall: { when: "Today 09:15", cadence: "72h" },
    medications: [
      { name: "Apixaban", dose: "5 mg", schedule: "08:00 / 20:00", adherence: 92, note: "1 missed dose reported (Sun PM)" },
      { name: "Oxycodone", dose: "5 mg PRN", schedule: "q6h as needed", adherence: 71 },
      { name: "Acetaminophen", dose: "650 mg", schedule: "08:00 / 14:00 / 20:00", adherence: 98 },
    ],
    campaignId: "camp-ortho",
    comorbidities: ["hypertension", "anticoagulated", "lives alone"],
    language: "English",
  },
  {
    id: "robert-okafor",
    name: "Robert Okafor",
    firstName: "Robert",
    age: 68,
    sex: "M",
    mrn: "MRN-0477802",
    phone: "(617) 555-0188",
    dob: "1957-11-19",
    avatar: "/avatar-robert.png",
    cohort: "cardiac",
    cohortLabel: "Cardiac · post-MI",
    procedure: "NSTEMI · PCI with stent",
    discharged: "2026-03-09",
    dayPost: 1,
    riskScore: 0.71,
    riskLevel: "high",
    riskTrend: "flat",
    riskSpark: [0.71, 0.71, 0.71, 0.71, 0.71, 0.71, 0.71],
    adherence: 78,
    status: "scheduled",
    nextCall: { when: "Today 09:45", cadence: "24h" },
    medications: [
      { name: "Clopidogrel", dose: "75 mg", schedule: "09:00", adherence: 78 },
      { name: "Atorvastatin", dose: "80 mg", schedule: "21:00", adherence: 86 },
      { name: "Metoprolol", dose: "50 mg", schedule: "09:00 / 21:00", adherence: 74 },
    ],
    campaignId: "camp-cardiac",
    comorbidities: ["diabetes", "hypertension"],
    language: "English",
  },
  {
    id: "linda-vargas",
    name: "Linda Vargas",
    firstName: "Linda",
    age: 61,
    sex: "F",
    mrn: "MRN-0465210",
    phone: "(617) 555-0121",
    dob: "1964-04-27",
    avatar: "/avatar-linda.png",
    cohort: "copd",
    cohortLabel: "COPD · pneumonia",
    procedure: "Community-acquired pneumonia, COPD exacerbation",
    discharged: "2026-03-03",
    dayPost: 7,
    riskScore: 0.22,
    riskLevel: "low",
    riskTrend: "down",
    riskSpark: [0.41, 0.38, 0.35, 0.31, 0.28, 0.25, 0.22],
    adherence: 95,
    status: "scheduled",
    lastCall: { when: "Mar 7 · 10:05", outcome: "Breathing better · O₂ 94% · No flags" },
    nextCall: { when: "Today 10:05", cadence: "day7" },
    medications: [
      { name: "Prednisone", dose: "40 mg", schedule: "08:00", adherence: 95 },
      { name: "Albuterol inhaler", dose: "90 mcg", schedule: "q4h PRN", adherence: 91 },
      { name: "Azithromycin", dose: "250 mg", schedule: "08:00", adherence: 100 },
    ],
    campaignId: "camp-surgical",
    comorbidities: ["COPD"],
    language: "Español",
  },
  {
    id: "james-whitfield",
    name: "James Whitfield",
    firstName: "James",
    age: 74,
    sex: "M",
    mrn: "MRN-0453977",
    phone: "(617) 555-0164",
    dob: "1951-09-08",
    avatar: "/avatar-james.png",
    cohort: "cardiac",
    cohortLabel: "Cardiac · CHF",
    procedure: "CHF exacerbation · diuresis",
    discharged: "2026-03-07",
    dayPost: 3,
    riskScore: 0.81,
    riskLevel: "high",
    riskTrend: "up",
    riskSpark: [0.58, 0.6, 0.63, 0.68, 0.72, 0.78, 0.81],
    adherence: 64,
    status: "escalated",
    lastCall: { when: "Today 08:30", outcome: "Weight +2.1 kg · dyspnea on exertion" },
    medications: [
      { name: "Furosemide", dose: "40 mg", schedule: "08:00 / 17:00", adherence: 64, note: "2 missed doses reported" },
      { name: "Lisinopril", dose: "20 mg", schedule: "08:00", adherence: 70 },
      { name: "Carvedilol", dose: "12.5 mg", schedule: "08:00 / 20:00", adherence: 59 },
    ],
    campaignId: "camp-cardiac",
    comorbidities: ["CHF", "CKD", "lives alone"],
    language: "English",
  },
  {
    id: "priya-raman",
    name: "Priya Raman",
    firstName: "Priya",
    age: 58,
    sex: "F",
    mrn: "MRN-0481145",
    phone: "(617) 555-0112",
    dob: "1967-12-30",
    avatar: "/avatar-priya.png",
    cohort: "surgical",
    cohortLabel: "Surgical · colectomy",
    procedure: "Laparoscopic sigmoid colectomy",
    discharged: "2026-03-09",
    dayPost: 1,
    riskScore: 0.18,
    riskLevel: "low",
    riskTrend: "flat",
    riskSpark: [0.18, 0.18, 0.18, 0.18, 0.18, 0.18, 0.18],
    adherence: 100,
    status: "completed",
    lastCall: { when: "Today 08:00", outcome: "Pain 2/10 · Meds ✓ · No flags" },
    nextCall: { when: "Tomorrow 08:00", cadence: "48h" },
    medications: [
      { name: "Acetaminophen", dose: "650 mg", schedule: "q8h", adherence: 100 },
      { name: "Ondansetron", dose: "4 mg PRN", schedule: "q8h PRN", adherence: 100 },
    ],
    campaignId: "camp-surgical",
    comorbidities: [],
    language: "English",
  },
  {
    id: "frank-doyle",
    name: "Frank Doyle",
    firstName: "Frank",
    age: 70,
    sex: "M",
    mrn: "MRN-0446318",
    phone: "(617) 555-0177",
    dob: "1955-02-14",
    avatar: "/avatar-frank.png",
    cohort: "ortho",
    cohortLabel: "Ortho · R knee",
    procedure: "Right total knee arthroplasty",
    discharged: "2026-03-03",
    dayPost: 7,
    riskScore: 0.39,
    riskLevel: "moderate",
    riskTrend: "flat",
    riskSpark: [0.44, 0.43, 0.42, 0.4, 0.4, 0.39, 0.39],
    adherence: 83,
    status: "missed",
    lastCall: { when: "Today 07:40", outcome: "No answer · voicemail left" },
    nextCall: { when: "Retry 11:00", cadence: "day7" },
    medications: [
      { name: "Rivaroxaban", dose: "10 mg", schedule: "09:00", adherence: 83 },
      { name: "Oxycodone", dose: "5 mg PRN", schedule: "q6h as needed", adherence: 80 },
    ],
    campaignId: "camp-ortho",
    comorbidities: ["anticoagulated"],
    language: "English",
  },
];

export const patientById = (id: string) => patients.find((p) => p.id === id);

/* -------------------------------------------------------------- care team */

export const careTeam: CareTeamMember[] = [
  { id: "nurse-ruiz", name: "Nurse Ruiz", role: "On-call RN · Care coordination", avatar: "/avatar-nurse-ruiz.png", onCall: true, presence: "online" },
  { id: "nurse-obrien", name: "Nurse O'Brien", role: "RN · Escalation pool", avatar: "/avatar-nurse-obrien.png", presence: "busy" },
  { id: "dr-chen", name: "Dr. Chen", role: "Hospitalist · Program lead", avatar: "/avatar-dr-chen.png", presence: "online" },
];

export const careTeamById = (id: string) => careTeam.find((m) => m.id === id);

/* --------------------------------------------------------------- campaigns */

export const campaigns: Campaign[] = [
  {
    id: "camp-cardiac",
    name: "Cardiac Intensive",
    cohort: "cardiac",
    status: "active",
    cadence: ["24h", "48h", "72h", "day7"],
    patientsEnrolled: 6,
    callsPerWeek: 24,
    completionPct: 91,
    flagsScreened: ["chest pain", "dyspnea", "missed anticoagulant"],
    goals:
      "Ask about chest discomfort and shortness of breath. Confirm every dose of clopidogrel and diuretics. Daily weights for CHF patients — flag gains over 1.5 kg. If they mention chest pain, severe dyspnea, or syncope, treat it as urgent.",
    retryPolicy: "retry ×2, 2h apart",
  },
  {
    id: "camp-ortho",
    name: "Ortho Standard",
    cohort: "ortho",
    status: "active",
    cadence: ["24h", "72h", "day7"],
    patientsEnrolled: 4,
    callsPerWeek: 12,
    completionPct: 96,
    flagsScreened: ["wound discharge", "uncontrolled pain", "fever"],
    goals:
      "Check pain on a 0–10 scale. Confirm every anticoagulant dose. Ask them to describe the incision: any redness, swelling, or drainage. Confirm their follow-up appointment. If they mention fever over 38° or wound drainage, treat it as urgent.",
    retryPolicy: "retry ×2, 2h apart",
  },
  {
    id: "camp-surgical",
    name: "Post-Surgical Watch",
    cohort: "surgical",
    status: "active",
    cadence: ["24h", "72h", "day7"],
    patientsEnrolled: 5,
    callsPerWeek: 15,
    completionPct: 94,
    flagsScreened: ["fever >38°", "incision issues", "GI symptoms"],
    goals:
      "Check pain, fever, and incision appearance. Ask about bowel function and appetite. Confirm oral intake and mobility goals. Escalate fever over 38°, persistent vomiting, or incision drainage.",
    retryPolicy: "skip after 2 misses",
  },
];

/* ------------------------------------------------------------ call records */

export const callRecords: CallRecord[] = [
  {
    id: "call-1042",
    patientId: "margaret-ellis",
    cadence: "72h",
    scheduledFor: "09:15",
    startedAt: "09:15",
    durationSec: 252,
    status: "escalated",
    outcome: "Wound redness + warmth · 1 missed apixaban dose",
    flags: [
      { label: "possible wound infection", confidence: 0.87, quote: "It's a bit red around the staples… and warm, I think.", tier: "coral" },
      { label: "missed anticoagulant", confidence: 0.74, quote: "I did forget Sunday night.", tier: "amber" },
    ],
    riskBefore: 0.46,
    riskAfter: 0.68,
    campaignId: "camp-ortho",
    sentiment: "calm, mildly anxious",
    escalatedTo: "nurse-ruiz",
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
  },
  {
    id: "call-1041",
    patientId: "james-whitfield",
    cadence: "72h",
    scheduledFor: "08:30",
    startedAt: "08:30",
    durationSec: 296,
    status: "escalated",
    outcome: "Weight +2.1 kg in 3 days · dyspnea on exertion",
    flags: [
      { label: "fluid retention (CHF protocol)", confidence: 0.84, quote: "I gained about four and a half pounds since the weekend.", tier: "coral" },
      { label: "dyspnea on exertion", confidence: 0.79, quote: "I get winded just walking to the kitchen.", tier: "coral" },
    ],
    riskBefore: 0.72,
    riskAfter: 0.81,
    campaignId: "camp-cardiac",
    sentiment: "fatigued, flat",
    escalatedTo: "nurse-ruiz",
  },
  {
    id: "call-1040",
    patientId: "priya-raman",
    cadence: "24h",
    scheduledFor: "08:00",
    startedAt: "08:00",
    durationSec: 228,
    status: "completed",
    outcome: "Pain 2/10 · Meds ✓ · No flags",
    flags: [],
    riskBefore: 0.2,
    riskAfter: 0.18,
    campaignId: "camp-surgical",
    sentiment: "upbeat",
  },
  {
    id: "call-1039",
    patientId: "frank-doyle",
    cadence: "day7",
    scheduledFor: "07:40",
    status: "missed",
    outcome: "No answer · voicemail left · retry 11:00",
    flags: [],
    campaignId: "camp-ortho",
  },
  {
    id: "call-1043",
    patientId: "robert-okafor",
    cadence: "24h",
    scheduledFor: "09:45",
    status: "scheduled",
    flags: [],
    campaignId: "camp-cardiac",
  },
  {
    id: "call-1044",
    patientId: "linda-vargas",
    cadence: "day7",
    scheduledFor: "10:05",
    status: "scheduled",
    flags: [],
    campaignId: "camp-surgical",
  },
  {
    id: "call-1038",
    patientId: "margaret-ellis",
    cadence: "24h",
    scheduledFor: "Mar 9 · 09:20",
    startedAt: "Mar 9 · 09:20",
    durationSec: 231,
    status: "completed",
    outcome: "Pain 3/10 · Meds ✓ · No flags",
    flags: [],
    riskBefore: 0.44,
    riskAfter: 0.46,
    campaignId: "camp-ortho",
    sentiment: "calm",
  },
  {
    id: "call-1036",
    patientId: "james-whitfield",
    cadence: "48h",
    scheduledFor: "Mar 9 · 08:35",
    startedAt: "Mar 9 · 08:35",
    durationSec: 274,
    status: "completed",
    outcome: "Weight stable · 1 missed furosemide dose",
    flags: [{ label: "missed diuretic dose", confidence: 0.71, tier: "amber" }],
    riskBefore: 0.68,
    riskAfter: 0.72,
    campaignId: "camp-cardiac",
    sentiment: "tired",
  },
  {
    id: "call-1034",
    patientId: "linda-vargas",
    cadence: "72h",
    scheduledFor: "Mar 7 · 10:05",
    startedAt: "Mar 7 · 10:05",
    durationSec: 214,
    status: "completed",
    outcome: "Breathing better · O₂ 94% · No flags",
    flags: [],
    riskBefore: 0.28,
    riskAfter: 0.25,
    campaignId: "camp-surgical",
    sentiment: "hopeful",
  },
  {
    id: "call-1031",
    patientId: "frank-doyle",
    cadence: "72h",
    scheduledFor: "Mar 6 · 11:00",
    startedAt: "Mar 6 · 11:00",
    durationSec: 246,
    status: "completed",
    outcome: "Pain 5/10 at PT · Meds ✓ · No flags",
    flags: [],
    riskBefore: 0.4,
    riskAfter: 0.39,
    campaignId: "camp-ortho",
    sentiment: "cheerful",
  },
  {
    id: "call-1029",
    patientId: "robert-okafor",
    cadence: "24h",
    scheduledFor: "Mar 9 · 16:00",
    status: "scheduled",
    flags: [],
    campaignId: "camp-cardiac",
  },
];

export const callById = (id: string) => callRecords.find((c) => c.id === id);

/* ------------------------------------------------------------- escalations */

export const escalations: Escalation[] = [
  {
    id: "ESC-1042",
    priority: "P1",
    patientId: "margaret-ellis",
    context:
      "72h post L hip replacement — incision redness + warmth, afebrile. 1 missed apixaban dose Sun PM. Pain 4/10. Agent confidence 0.87.",
    flags: [
      { label: "possible wound infection", confidence: 0.87, tier: "coral" },
      { label: "missed anticoagulant", confidence: 0.74, tier: "amber" },
    ],
    openedAgoMin: 24,
    slaTargetMin: 30,
    assigneeId: "nurse-ruiz",
    status: "open",
    timeline: [
      { ts: "09:22", label: "Red flag detected · wound infection (0.87)" },
      { ts: "09:22", label: "Escalation created by agent" },
      { ts: "09:24", label: "Nurse Ruiz paged" },
      { ts: "now", label: "Awaiting acknowledgment…", pending: true },
    ],
  },
  {
    id: "ESC-1041",
    priority: "P2",
    patientId: "james-whitfield",
    context:
      "Day 3 post CHF discharge — weight +2.1 kg in 3 days (fluid protocol), dyspnea on exertion. 2 missed furosemide doses this week. Agent confidence 0.84.",
    flags: [
      { label: "fluid retention (CHF protocol)", confidence: 0.84, tier: "coral" },
      { label: "dyspnea on exertion", confidence: 0.79, tier: "coral" },
    ],
    openedAgoMin: 180,
    slaTargetMin: 240,
    assigneeId: "nurse-obrien",
    status: "open",
    timeline: [
      { ts: "08:47", label: "Red flag detected · fluid retention (0.84)" },
      { ts: "08:47", label: "Escalation created by agent" },
      { ts: "08:52", label: "Assigned to Nurse O'Brien" },
      { ts: "now", label: "Callback scheduled for 12:00", pending: true },
    ],
  },
  {
    id: "ESC-1039",
    priority: "P3",
    patientId: "frank-doyle",
    context: "2 missed call attempts (day-7 check). Voicemail left both times. Last contact Mar 6 — pain 5/10, meds ✓, no flags.",
    flags: [{ label: "2 missed attempts", confidence: 1, tier: "amber" }],
    openedAgoMin: 1440,
    slaTargetMin: 2880,
    status: "open",
    timeline: [
      { ts: "Mar 9 · 07:45", label: "Missed attempt #1 · voicemail" },
      { ts: "Today · 07:40", label: "Missed attempt #2 · task created" },
      { ts: "now", label: "Retry queued for 11:00", pending: true },
    ],
  },
  {
    id: "ESC-1036",
    priority: "P2",
    patientId: "linda-vargas",
    context: "O₂ sat 89% reported on day-3 call. Nurse callback — resolved with inhaler coaching.",
    flags: [{ label: "low O₂ saturation", confidence: 0.81, tier: "coral" }],
    openedAgoMin: 4320,
    slaTargetMin: 240,
    assigneeId: "nurse-ruiz",
    status: "resolved",
    timeline: [],
    resolution: { by: "Nurse Ruiz", note: "Callback done — inhaler technique corrected, sat back to 94%.", timeToResolveMin: 38, outcome: "Callback done" },
  },
  {
    id: "ESC-1034",
    priority: "P1",
    patientId: "james-whitfield",
    context: "Reported chest pressure on day-1 call. Referred to ED — ruled out ACS, med adjustment.",
    flags: [{ label: "chest pressure", confidence: 0.9, tier: "coral" }],
    openedAgoMin: 5760,
    slaTargetMin: 30,
    assigneeId: "dr-chen",
    status: "resolved",
    timeline: [],
    resolution: { by: "Dr. Chen", note: "ED referral. Troponin negative ×2. Furosemide dose adjusted.", timeToResolveMin: 26, outcome: "ED referred" },
  },
];

export const openEscalations = escalations.filter((e) => e.status === "open");
export const openEscalationCount = openEscalations.length;

/* -------------------------------------------------------------------- KPIs */

export const kpis: KpiDef[] = [
  { id: "monitored", label: "Patients monitored", value: "18", numeric: 18, delta: "+3 this week", deltaTone: "green", spark: [12, 13, 14, 15, 15, 17, 18] },
  { id: "calls", label: "Calls completed", value: "41", numeric: 41, delta: "+18%", deltaTone: "green", spark: [22, 25, 28, 30, 33, 37, 41] },
  { id: "completion", label: "Check-in completion", value: "93%", numeric: 93, delta: "+4 pts", deltaTone: "green", spark: [84, 86, 88, 87, 90, 91, 93] },
  { id: "escalations", label: "Open escalations", value: "3", numeric: 3, delta: "1 new P1", deltaTone: "coral", spark: [1, 2, 1, 2, 2, 3, 3] },
  { id: "adherence", label: "Med adherence (reported)", value: "87%", numeric: 87, delta: "−2 pts", deltaTone: "coral", spark: [92, 91, 90, 89, 89, 88, 87] },
];

/* --------------------------------------------------------- 14-day charting */

export const programPulse: ChartDay[] = [
  { date: "Feb 25", calls: 4, flags: 1 },
  { date: "Feb 26", calls: 5, flags: 0 },
  { date: "Feb 27", calls: 3, flags: 1 },
  { date: "Feb 28", calls: 6, flags: 2 },
  { date: "Mar 1", calls: 5, flags: 1 },
  { date: "Mar 2", calls: 7, flags: 2 },
  { date: "Mar 3", calls: 6, flags: 1 },
  { date: "Mar 4", calls: 8, flags: 3 },
  { date: "Mar 5", calls: 7, flags: 2 },
  { date: "Mar 6", calls: 9, flags: 2 },
  { date: "Mar 7", calls: 8, flags: 4 },
  { date: "Mar 8", calls: 6, flags: 2 },
  { date: "Mar 9", calls: 10, flags: 3 },
  { date: "Mar 10", calls: 7, flags: 3 },
];

export const cohortMix: { cohort: Cohort; label: string; count: number; highRisk: number }[] = [
  { cohort: "cardiac", label: "Cardiac", count: 6, highRisk: 2 },
  { cohort: "ortho", label: "Ortho", count: 4, highRisk: 0 },
  { cohort: "surgical", label: "Surgical", count: 5, highRisk: 0 },
  { cohort: "copd", label: "COPD", count: 3, highRisk: 1 },
];

/* --------------------------------------------------------- activity events */

export const activityFeed: ActivityEvent[] = [
  { id: "ev-1", ts: "09:22", type: "flag", text: 'Red flag: "wound redness" detected on M. Ellis call · confidence 0.87', link: "/app/live" },
  { id: "ev-2", ts: "09:18", type: "call_started", text: "Call started → Margaret Ellis · 72h check-in", link: "/app/live" },
  { id: "ev-3", ts: "08:47", type: "escalation", text: "Escalation #ESC-1042 created → paged Nurse Ruiz (P1)", link: "/app/escalations?id=ESC-1042" },
  { id: "ev-4", ts: "08:31", type: "result", text: "Result ready: J. Whitfield · risk 0.81 · action: same-day nurse call", link: "/app/results?id=call-1041" },
  { id: "ev-5", ts: "08:02", type: "call_completed", text: "Call completed → P. Raman · 3m 48s · no flags", link: "/app/results?id=call-1040" },
  { id: "ev-6", ts: "07:40", type: "call_started", text: "Missed call → F. Doyle · voicemail left · retry 11:00", link: "/app/results?id=call-1039" },
  { id: "ev-7", ts: "Mar 9", type: "nurse_action", text: "Nurse Ruiz resolved ESC-1036 · L. Vargas callback done", link: "/app/escalations" },
];

/* ------------------------------------------------------------- queue view  */

export interface QueueRow {
  callId: string;
  time: string;
  patientId: string;
  cadence: Cadence;
  status: CallStatus;
}

export const todayQueue: QueueRow[] = [
  { callId: "call-1042", time: "09:15", patientId: "margaret-ellis", cadence: "72h", status: "in_progress" },
  { callId: "call-1043", time: "09:45", patientId: "robert-okafor", cadence: "24h", status: "scheduled" },
  { callId: "call-1044", time: "10:05", patientId: "linda-vargas", cadence: "day7", status: "scheduled" },
  { callId: "call-1041", time: "08:30", patientId: "james-whitfield", cadence: "72h", status: "escalated" },
  { callId: "call-1040", time: "08:00", patientId: "priya-raman", cadence: "24h", status: "completed" },
  { callId: "call-1039", time: "07:40", patientId: "frank-doyle", cadence: "day7", status: "missed" },
];

/* --------------------------------------------------------- CALL-E status   */

export const calleStatus = {
  workspace: "PDC-Demo",
  callsUsedToday: 12,
  callsQuotaToday: 50,
  voice: "alloy",
  language: "en-US",
  p95LatencyMs: 212,
  latencySeries: [168, 184, 172, 205, 190, 226, 198, 240, 212, 188, 176, 209] as number[],
};
