import { PHASES, PLAN_START, EXAM_DATE, PhaseId } from "./planData";

// All dates handled as YYYY-MM-DD strings in local terms to avoid TZ drift.

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86400000);
}

// Monday as start of week
export function weekStartOf(s: string): string {
  const d = parseDate(s);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return todayStr(d);
}

export function monthKeyOf(s: string): string {
  return s.slice(0, 7);
}

// Week number relative to plan start (Wk 1 = first week)
export function weekNumberOf(s: string): number {
  const ws = weekStartOf(s);
  const planWs = weekStartOf(PLAN_START);
  return Math.floor(diffDays(ws, planWs) / 7) + 1;
}

export function phaseForDate(s: string): PhaseId {
  for (const p of PHASES) {
    if (s >= p.start && s <= p.end) return p.id;
  }
  return s < PLAN_START ? "P1" : "P4";
}

export function daysToExam(from = todayStr()): number {
  return diffDays(EXAM_DATE, from);
}

export function weeksToExam(from = todayStr()): number {
  return Math.max(0, Math.ceil(daysToExam(from) / 7));
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function accuracy(correct: number, attempted: number): number {
  if (!attempted) return 0;
  return Math.round((correct / attempted) * 100);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Deterministic, locale-independent formatting so server and client render identically (no hydration mismatch).
export function fmtDate(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDateShort(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
