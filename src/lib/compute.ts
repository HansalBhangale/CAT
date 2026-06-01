import { addDays, todayStr, weekStartOf, monthKeyOf } from "./utils";

export interface DailyLog {
  date: string;
  phase: string;
  hoursActual: number;
  practice: Record<string, { attempted: number; correct: number }>;
  rcPassages: number;
  vaDrills: number;
  lr: { setsDone: number; avgTimePerSet: number; accuracy: number };
  errorsLogged: number;
  errorsRevised: number;
  energy: number;
  sleepHours: number;
  blocksDone: string[];
  extraWork: { description: string; minutes: number; category: string; topic?: string; attempted?: number; correct?: number }[];
  topics?: { block: string; section: string; name: string }[];
  notes: string;
}

export interface Mock {
  _id: string;
  date: string;
  name: string;
  type: string;
  series: string;
  overall: { score: number; maxScore: number; percentile: number; attempted: number; correct: number };
  sections: { section: string; score: number; maxScore: number; percentile: number; attempted: number; correct: number; timeSpent: number }[];
  takeaways: string;
  selectionNotes: string;
}

export interface ErrLog {
  _id: string;
  date: string;
  source: string;
  section: string;
  topic: string;
  cause: string;
  description: string;
  status: string;
  reviewsDone: number;
  nextReview: string;
  lrSetType: string;
}

const TAGS = ["QA", "RC", "VA", "DI", "LR"] as const;

export function emptyTotals() {
  const t: Record<string, { attempted: number; correct: number }> = {};
  for (const k of TAGS) t[k] = { attempted: 0, correct: 0 };
  return t;
}

export function sumPractice(logs: DailyLog[]) {
  const t = emptyTotals();
  for (const l of logs) {
    for (const k of TAGS) {
      const p = l.practice?.[k];
      if (p) {
        t[k].attempted += p.attempted || 0;
        t[k].correct += p.correct || 0;
      }
    }
    // extra work counts toward the same area totals
    for (const e of l.extraWork || []) {
      if ((TAGS as readonly string[]).includes(e.category)) {
        t[e.category].attempted += e.attempted || 0;
        t[e.category].correct += e.correct || 0;
      }
    }
  }
  return t;
}

export function totalHours(logs: DailyLog[]) {
  return logs.reduce((s, l) => s + (l.hoursActual || 0), 0);
}

export function totalLrSets(logs: DailyLog[]) {
  return logs.reduce(
    (s, l) =>
      s +
      (l.lr?.setsDone || 0) +
      (l.extraWork || []).filter((e) => e.category === "LR").reduce((a, e) => a + (e.attempted || 0), 0),
    0
  );
}

export function totalRc(logs: DailyLog[]) {
  return logs.reduce((s, l) => s + (l.rcPassages || 0), 0);
}
export function totalVa(logs: DailyLog[]) {
  return logs.reduce((s, l) => s + (l.vaDrills || 0), 0);
}
export function totalExtraMin(logs: DailyLog[]) {
  return logs.reduce((s, l) => s + (l.extraWork || []).reduce((a, e) => a + (e.minutes || 0), 0), 0);
}

// Study streak: consecutive days ending today (or yesterday) with any logged hours.
export function studyStreak(logs: DailyLog[]): number {
  const have = new Set(logs.filter((l) => (l.hoursActual || 0) > 0).map((l) => l.date));
  let streak = 0;
  let cursor = todayStr();
  if (!have.has(cursor)) cursor = addDays(cursor, -1); // allow today not-yet-logged
  while (have.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function inRange(logs: DailyLog[], from: string, to: string) {
  return logs.filter((l) => l.date >= from && l.date <= to);
}

export function thisWeek(logs: DailyLog[], ref = todayStr()) {
  const ws = weekStartOf(ref);
  const we = addDays(ws, 6);
  return inRange(logs, ws, we);
}

export function thisMonth(logs: DailyLog[], ref = todayStr()) {
  const mk = monthKeyOf(ref);
  return logs.filter((l) => monthKeyOf(l.date) === mk);
}

export function acc(correct: number, attempted: number) {
  return attempted ? Math.round((correct / attempted) * 100) : 0;
}

// Map mocks -> chart rows with section percentiles flattened
export function mockChartRows(mocks: Mock[]) {
  return mocks
    .filter((m) => m.type === "full")
    .map((m) => {
      const get = (s: string) => m.sections.find((x) => x.section === s)?.percentile ?? null;
      return {
        date: m.date,
        name: m.name,
        overall: m.overall?.percentile ?? null,
        score: m.overall?.score ?? null,
        QA: get("QA"),
        VARC: get("VARC"),
        DILR: get("DILR"),
      };
    });
}

export function errorsByCause(errors: ErrLog[]) {
  const map: Record<string, number> = {};
  for (const e of errors) map[e.cause] = (map[e.cause] || 0) + 1;
  return Object.entries(map).map(([cause, count]) => ({ cause, count }));
}

export function errorsBySection(errors: ErrLog[]) {
  const map: Record<string, number> = {};
  for (const e of errors) map[e.section] = (map[e.section] || 0) + 1;
  return Object.entries(map).map(([section, count]) => ({ section, count }));
}

export interface TopicRow {
  section: string;
  name: string;
  count: number;
  last: string;
}

// Distinct topics tagged across the given logs, with repeat counts.
export function topicsFromLogs(logs: DailyLog[]): TopicRow[] {
  const map = new Map<string, TopicRow>();
  const add = (section: string, rawName: string, date: string) => {
    const name = (rawName || "").trim();
    if (!name) return;
    const key = `${section}::${name.toLowerCase()}`;
    const cur = map.get(key);
    if (cur) {
      cur.count++;
      if (date > cur.last) cur.last = date;
    } else {
      map.set(key, { section, name, count: 1, last: date });
    }
  };
  for (const l of logs) {
    for (const t of l.topics || []) add(t.section, t.name, l.date);
    for (const e of l.extraWork || []) add(e.category, e.topic || "", l.date);
  }
  return Array.from(map.values());
}

// Group topic rows by area, each area's topics sorted by repeat count.
export function groupTopics(rows: TopicRow[]): [string, TopicRow[]][] {
  const g: Record<string, TopicRow[]> = {};
  for (const r of rows) (g[r.section] = g[r.section] || []).push(r);
  for (const k in g) g[k].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
}
