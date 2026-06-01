// Structured encoding of the CAT 2026 6-Month Study Plan.
// Single source of truth for targets, phases, and reference tables used across the app.

export const PLAN_START = "2026-06-01"; // Mon 1 June 2026
export const EXAM_DATE = "2026-11-29"; // expected Sun 29 Nov 2026
export const DAILY_HOURS_TARGET = 4;
export const WEEKLY_HOURS_TARGET = 26; // ~24-28
export const SLEEP_TARGET = 7.5;

export type SectionKey = "QA" | "VARC" | "DILR";
export const SECTIONS: { key: SectionKey; label: string; q: number; marks: number; time: number; color: string }[] = [
  { key: "VARC", label: "VARC", q: 24, marks: 72, time: 40, color: "#fbbf24" },
  { key: "DILR", label: "DILR", q: 22, marks: 66, time: 40, color: "#f472b6" },
  { key: "QA", label: "QA", q: 22, marks: 66, time: 40, color: "#34d399" },
];

export type PhaseId = "P1" | "P2" | "P3" | "P4";
export interface Phase {
  id: PhaseId;
  name: string;
  calendar: string;
  weeks: string;
  theme: string;
  mockCadence: string;
  // calendar bounds (inclusive) for auto-detecting current phase
  start: string;
  end: string;
  color: string;
}

export const PHASES: Phase[] = [
  { id: "P1", name: "Foundation + LR rebuild", calendar: "Jun–Jul", weeks: "Wk 1–9", theme: "Concepts, set-type playbooks, mostly untimed → lightly timed", mockCadence: "1 diagnostic (Wk 1), then sectional/topic tests only", start: "2026-06-01", end: "2026-08-02", color: "#5b8cff" },
  { id: "P2", name: "Application + timed", calendar: "Aug–Sep", weeks: "Wk 10–18", theme: "Timing, set-selection, mocks begin", mockCadence: "1/wk → ramping to 2/wk by late Sep", start: "2026-08-03", end: "2026-10-04", color: "#34d399" },
  { id: "P3", name: "Mock intensive", calendar: "October", weeks: "Wk 19–22", theme: "Test-taking under pressure, analysis-dominant", mockCadence: "2–3/wk", start: "2026-10-05", end: "2026-11-01", color: "#fbbf24" },
  { id: "P4", name: "Peak → taper", calendar: "November", weeks: "Wk 23–26", theme: "Plug final leaks, then deliberately wind down", mockCadence: "2–3/wk early, then taper to rest", start: "2026-11-02", end: "2026-11-29", color: "#f472b6" },
];

// Daily 4-hour block template per phase (minutes)
export const DAILY_TEMPLATES: Record<PhaseId, { name: string; min: number; what: string }[]> = {
  P1: [
    { name: "LR (fresh brain)", min: 70, what: "One set-type at a time. Untimed → lightly timed. Build the playbook." },
    { name: "QA", min: 60, what: "One micro-topic/day: learn → 15–20 problems." },
    { name: "VARC", min: 45, what: "1–2 RC passages daily; VA drills 2×/week." },
    { name: "DI", min: 35, what: "Set types; build the right representation every time." },
    { name: "Revision + error log", min: 30, what: "Today's mistakes logged + spaced review of old ones." },
  ],
  P2: [
    { name: "DILR combined", min: 60, what: "Timed sets, LR-weighted. Practice choosing which sets to do." },
    { name: "QA", min: 60, what: "Timed topic tests + mixed problem sets." },
    { name: "VARC", min: 50, what: "RC timed + VA." },
    { name: "Targeted weak drill", min: 40, what: "Whatever the error log flagged this week." },
    { name: "Error log + revision", min: 30, what: "Non-negotiable." },
  ],
  P3: [
    { name: "Mock analysis / error-set redo", min: 90, what: "Dominates the day. Re-solve every missed/guessed question." },
    { name: "LR + set-selection drills", min: 60, what: "Simulated DILR set-choice under the clock." },
    { name: "QA/VARC maintenance", min: 50, what: "Timed mixed sets to stay sharp." },
    { name: "Revision", min: 40, what: "Formula sheets + error log spaced repetition." },
  ],
  P4: [
    { name: "Mock analysis / error-set redo", min: 90, what: "Re-solve every missed/guessed question." },
    { name: "LR + set-selection drills", min: 60, what: "Set-choice under the clock; plug last leaks." },
    { name: "QA/VARC maintenance", min: 50, what: "Light timed sets. Revise own materials only." },
    { name: "Revision + logistics", min: 40, what: "Formula sheet/playbook/error log. Sleep + center recon. Taper final 7–10 days." },
  ],
};

// Map a daily-template block name to a stable area tag used for cross-day topic tracking.
export function blockTag(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("dilr")) return "DILR";
  if (n.includes("lr")) return "LR";
  if (n.includes("qa/varc") || n.includes("qa / varc")) return "QA·VARC";
  if (n.includes("qa")) return "QA";
  if (n.includes("varc")) return "VARC";
  if (n.includes("mock")) return "Mock";
  if (n.includes("di")) return "DI";
  if (n.includes("weak") || n.includes("targeted")) return "Weak drill";
  if (n.includes("revision") || n.includes("error log") || n.includes("logistics")) return "Revision";
  return "Other";
}

export const TOPIC_SECTIONS = ["QA", "VARC", "DI", "LR", "DILR", "Mock", "Weak drill", "Revision", "Other"];

export const LR_SET_TYPES = [
  "Linear & circular arrangements",
  "Distribution / grouping / selection",
  "Ordering / sequencing / ranking",
  "Games & tournaments",
  "Conditional / Venn-based puzzles",
  "Networks, routes, scheduling",
  "Quant-based reasoning (number puzzles)",
  "Binary logic / truth-teller–liar",
  "Data-arrangement grids (multi-constraint)",
];

export const DI_SET_TYPES = [
  "Tables",
  "Bar / Line / Pie",
  "Caselets (text-heavy DI)",
  "Mixed / combination charts",
  "DI–reasoning hybrids",
];

export const ERROR_CAUSES = [
  "concept gap",
  "silly slip",
  "time pressure",
  "bad selection",
  "misread condition",
  "wrong representation",
  "calc slip",
  "ran out of time",
] as const;
export type ErrorCause = (typeof ERROR_CAUSES)[number];

export const SECTION_TAGS = ["QA", "VARC-RC", "VARC-VA", "DI", "LR"] as const;
export type SectionTag = (typeof SECTION_TAGS)[number];

// Spaced-repetition schedule for error reviews (days after logging)
export const SPACED_DAYS = [1, 3, 7, 21];

// Directional monthly mock %ile targets (motivational, not a contract)
export const MONTHLY_PERCENTILE_TARGET: { month: string; key: string; pct: number | null; label: string }[] = [
  { month: "June", key: "2026-06", pct: null, label: "Baseline — don't judge it" },
  { month: "July", key: "2026-07", pct: 92, label: "~90–95" },
  { month: "August", key: "2026-08", pct: 96, label: "~95–98" },
  { month: "September", key: "2026-09", pct: 98.5, label: "~98–99" },
  { month: "October", key: "2026-10", pct: 99.25, label: "~99–99.5" },
  { month: "November", key: "2026-11", pct: 99.6, label: "~99.5+ and peaking" },
];

// Weekly practice-volume targets per phase (quality-gated)
export const VOLUME_TARGETS: Record<string, { lr: number; di: number; qa: number; rc: number; va: number }> = {
  P1: { lr: 18, di: 13, qa: 135, rc: 8, va: 2 },
  P2: { lr: 22, di: 17, qa: 135, rc: 12, va: 3 },
  P3: { lr: 15, di: 10, qa: 80, rc: 7, va: 2 },
  P4: { lr: 12, di: 8, qa: 60, rc: 5, va: 2 },
};

// Month-by-month milestones (quick reference)
export const CALENDAR = [
  { month: "June", weeks: "1–4", focus: "Wk1 diagnostic mock. LR Stage A (learn the menu, untimed). QA concept sweep starts. Daily RC begins.", milestone: "All LR types seen; QA arithmetic + a second cluster done; routine locked." },
  { month: "July", weeks: "5–9", focus: "LR Stage B (single-set timing). Finish QA concept gaps. VARC stamina up. Sectionals begin.", milestone: "Zero QA concept gaps. LR single sets ~10–12 min @ ~75%." },
  { month: "August", weeks: "10–13", focus: "Mocks begin (1/wk). LR Stage C (set selection). Everything timed.", milestone: "First mocks analyzed properly; DILR strategy emerging." },
  { month: "September", weeks: "14–18", focus: "Mocks ramp to 1–2/wk. Selection drills. Plug error-log leaks.", milestone: "DILR: 2–3 clean LR sets/section. Mock %ile trending ~98–99." },
  { month: "October", weeks: "19–22", focus: "Mock-intensive (2–3/wk). Analysis-dominant. Integration. Stop new topics ~mid-month.", milestone: "3 clean LR sets; consistent strong mocks." },
  { month: "November", weeks: "23–26", focus: "Early: peak (2–3 mocks/wk, plug last leaks). Final 7–10 days: taper. Revise own materials only.", milestone: "Calm, rested, peaking. Admit card + center recon done. Exam ~29 Nov." },
];

export const LR_MILESTONES = [
  { by: "July", state: "All set-types known; timed single sets at ~10–12 min, ~75% accuracy" },
  { by: "September", state: "In a 40-min DILR section, cleanly solve 2–3 LR sets; set-selection instinct forming" },
  { by: "October", state: "3 sets at reasonable speed, ~80%+ accuracy; DILR mock %ile climbing past 90 → 95" },
  { by: "November", state: "LR is not your limiter; DILR is a strength on the merits" },
];
