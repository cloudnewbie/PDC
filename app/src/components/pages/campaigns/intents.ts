import type { Cadence } from "@/data/seed";

/**
 * Natural-language "call goals" → structured intent chips.
 * Each intent maps to one numbered line in the generated Agent brief, so
 * removing a chip can strike through its brief line.
 */

export interface Intent {
  /** stable id, e.g. "pain_score", "med:apixaban", "urgent" */
  id: string;
  /** chip label shown under the textarea */
  label: string;
  /** coral urgent variant */
  urgent?: boolean;
  /** the numbered brief line this intent produces */
  brief: string;
}

const KNOWN_MEDS = [
  "apixaban",
  "clopidogrel",
  "furosemide",
  "rivaroxaban",
  "metoprolol",
  "atorvastatin",
  "lisinopril",
  "carvedilol",
  "prednisone",
  "albuterol",
  "azithromycin",
  "acetaminophen",
  "oxycodone",
  "ondansetron",
  "diuretic",
  "anticoagulant",
];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Extract urgent trigger terms from sentences like "If they mention chest pain, fever over 38°, or confusion, treat it as urgent." */
function extractUrgentTerms(text: string): string[] {
  const terms: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (!/urgent|escalat/i.test(s)) continue;
    const m = s.match(/(?:mention|reports?|says|has)\s+(.+?)(?:,?\s*(?:treat it as urgent|escalate|as urgent)|$)/i);
    const clause = (m ? m[1] : s.replace(/^(escalate|if)\s*/i, "")).replace(/\.$/, "");
    for (const part of clause.split(/,|\bor\b|\band\b/i)) {
      const t = part.trim().replace(/^(any|a|an|the)\s+/i, "");
      if (t && t.length > 2 && t.length < 40) terms.push(t);
    }
  }
  return [...new Set(terms)].slice(0, 5);
}

export function parseIntents(text: string): Intent[] {
  const t = text.toLowerCase();
  const intents: Intent[] = [];
  const push = (intent: Intent) => {
    if (!intents.some((i) => i.id === intent.id)) intents.push(intent);
  };

  if (/\bpain\b/.test(t)) {
    push({ id: "pain_score", label: "pain_score", brief: "Pain: ask 0–10. If ≥7, probe location & meds." });
  }

  const meds = KNOWN_MEDS.filter((m) => new RegExp(`\\b${m}s?\\b`).test(t));
  if (meds.length > 0) {
    for (const m of meds.slice(0, 3)) {
      push({
        id: `med:${m}`,
        label: `med_adherence: ${m}`,
        brief: `${cap(m)} adherence — confirm doses since last call; if missed, find out why.`,
      });
    }
  } else if (/\b(doses?|medications?|meds)\b/.test(t)) {
    push({ id: "med:generic", label: "med_adherence", brief: "Medication adherence — confirm doses since last call." });
  }

  if (/\b(incision|wound)\b/.test(t)) {
    push({ id: "wound_check", label: "wound_check", brief: "Incision: ask patient to look & describe — redness, swelling, drainage." });
  }
  if (/\b(appointment|follow[- ]?up)\b/.test(t)) {
    push({ id: "appointment_confirm", label: "appointment_confirm", brief: "Confirm follow-up appt (Mar 14, Dr. Chen)." });
  }
  if (/\bweight\b/.test(t)) {
    push({ id: "daily_weight", label: "daily_weight", brief: "Daily weight — flag gain over 1.5 kg (fluid protocol)." });
  }
  if (/\b(bowel|gi\b|appetite|vomiting|intake|mobility)\b/.test(t)) {
    push({ id: "gi_function", label: "gi_function", brief: "Bowel function, appetite & oral intake; mobility goals." });
  }
  if (/\b(breath|dyspnea|o₂|oxygen|\bsat\b|chest discomfort)\b/.test(t)) {
    push({ id: "breathing", label: "breathing_o2", brief: "Breathing & O₂ sat — ask about exertion and chest discomfort." });
  }

  const urgentTerms = extractUrgentTerms(text);
  if (urgentTerms.length > 0) {
    push({
      id: "urgent",
      label: `urgent: ${urgentTerms.join(" / ")}`,
      urgent: true,
      brief: "", // rendered as the ESCALATE block, not a numbered line
    });
  }

  return intents;
}

/* ------------------------------------------------------------ brief build */

export interface BriefLine {
  id: string;
  text: string;
  /** struck-through because its intent chip was removed */
  struck?: boolean;
  /** mono header styling */
  header?: boolean;
}

export interface BriefInput {
  campaignName: string;
  cadence: Cadence[];
  intents: Intent[];
  removed: Set<string>;
  urgentTermsOverride?: string[];
}

export const CADENCE_LABELS: Record<Cadence, string> = {
  "24h": "24h",
  "48h": "48h",
  "72h": "72h",
  day7: "Day 7",
  day14: "Day 14",
};

export function buildBriefLines({ campaignName, cadence, intents, removed }: BriefInput): BriefLine[] {
  const firstCadence = cadence[0] ? CADENCE_LABELS[cadence[0]] : "first";
  const lines: BriefLine[] = [
    { id: "h1", text: `CALL GOAL — ${firstCadence} post-discharge check (${campaignName || "Untitled campaign"})`, header: true },
    { id: "h2", text: "Patient: {name}, day {day} post {procedure}", header: true },
  ];

  const numbered = intents.filter((i) => !i.urgent);
  let n = 1;
  lines.push({ id: "greet", text: `${n++}. Greet warmly. Verify identity (DOB).` });
  for (const intent of numbered) {
    lines.push({ id: intent.id, text: `${n++}. ${intent.brief}`, struck: removed.has(intent.id) });
  }

  const urgent = intents.find((i) => i.urgent);
  if (urgent && !removed.has("urgent")) {
    const terms = urgent.label.replace(/^urgent:\s*/, "").split(" / ").join(", ");
    lines.push({ id: "escalate", text: `ESCALATE immediately if: ${terms} → confidence ≥0.8.` });
  } else if (removed.has("urgent") && urgent) {
    const terms = urgent.label.replace(/^urgent:\s*/, "").split(" / ").join(", ");
    lines.push({ id: "escalate", text: `ESCALATE immediately if: ${terms} → confidence ≥0.8.`, struck: true });
  } else {
    lines.push({ id: "escalate", text: "ESCALATE: no urgent triggers defined — log anomalies only." });
  }

  lines.push({
    id: "tone",
    text: "Tone: unhurried, warm. Patient may be hard of hearing — speak slowly, confirm understanding.",
  });
  return lines;
}
