import React from "react";
import { TopicRow, groupTopics } from "@/lib/compute";

export function StatCard({
  label,
  value,
  sub,
  accent = "#5b8cff",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="card relative overflow-hidden">
      <span className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <div className="label">{label}</div>
      <div className="stat" style={{ color: accent }}>
        {value}
      </div>
      {sub != null && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function Progress({
  value,
  target,
  label,
  unit = "",
  color = "#5b8cff",
}: {
  value: number;
  target: number;
  label: string;
  unit?: string;
  color?: string;
}) {
  const p = target ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">
          {value}
          {unit} / {target}
          {unit} <span className="text-slate-500">({p}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-panel2">
        <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  );
}

export function Panel({ title, right, children }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card">
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold text-slate-200">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="grid place-items-center rounded-xl border border-dashed border-line py-10 text-sm text-slate-500">{children}</div>;
}

const SECTION_COLORS: Record<string, string> = {
  QA: "#34d399",
  RC: "#fbbf24",
  VA: "#f59e0b",
  "VARC-RC": "#fbbf24",
  "VARC-VA": "#f59e0b",
  VARC: "#fbbf24",
  DI: "#f472b6",
  LR: "#a78bfa",
  DILR: "#f472b6",
};

export function Tag({ children }: { children: string }) {
  const c = SECTION_COLORS[children] || "#5b8cff";
  return (
    <span className="pill" style={{ background: `${c}22`, color: c }}>
      {children}
    </span>
  );
}

export function TopicsCovered({ rows }: { rows: TopicRow[] }) {
  if (rows.length === 0) return <Empty>No topics tagged in this period — tag them on the Daily page.</Empty>;
  const groups = groupTopics(rows);
  return (
    <div className="space-y-3">
      {groups.map(([sec, items]) => (
        <div key={sec}>
          <div className="mb-1 text-xs uppercase tracking-wide text-slate-400">
            {sec} <span className="text-slate-500">· {items.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.map((t) => (
              <span
                key={t.name}
                className={`pill ${t.count > 1 ? "bg-amber-400/15 text-amber-300" : "bg-panel2 text-slate-300"}`}
                title={t.count > 1 ? `Studied ${t.count}× this period` : "Once"}
              >
                {t.count > 1 ? "↻ " : ""}{t.name}{t.count > 1 ? ` ×${t.count}` : ""}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export { SECTION_COLORS };
