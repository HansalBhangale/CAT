"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
} from "recharts";
import { jget, jpost } from "@/lib/api";
import { Panel, Progress, StatCard, Empty, TopicsCovered } from "@/components/Ui";
import { DailyLog, Mock, ErrLog, totalHours, totalLrSets, sumPractice, acc, topicsFromLogs } from "@/lib/compute";
import { PLAN_START, MONTHLY_PERCENTILE_TARGET } from "@/lib/planData";
import { todayStr, monthKeyOf, fmtDateShort } from "@/lib/utils";

const tooltipStyle = { background: "#121a2e", border: "1px solid #26304d", borderRadius: 10, fontSize: 12 };
const axis = { tick: { fill: "#8aa0c8", fontSize: 11 }, stroke: "#26304d" };
const MONTHS = MONTHLY_PERCENTILE_TARGET.map((m) => m.key);

export default function MonthlyPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [errors, setErrors] = useState<ErrLog[]>([]);
  const [month, setMonth] = useState(monthKeyOf(todayStr()));
  const [review, setReview] = useState<any>({});
  const [saved, setSaved] = useState("");

  useEffect(() => {
    (async () => {
      const [l, m, e] = await Promise.all([
        jget<DailyLog[]>(`/api/daily?from=${PLAN_START}`),
        jget<Mock[]>("/api/mocks"),
        jget<ErrLog[]>("/api/errors"),
      ]);
      setLogs(l); setMocks(m); setErrors(e);
    })();
  }, []);
  useEffect(() => {
    (async () => setReview((await jget(`/api/reviews?type=monthly&periodKey=${month}`)) || {}))();
  }, [month]);

  const moLogs = logs.filter((l) => monthKeyOf(l.date) === month);
  const moMocks = mocks.filter((m) => monthKeyOf(m.date) === month && m.type === "full");
  const p = sumPractice(moLogs);
  const target = MONTHLY_PERCENTILE_TARGET.find((m) => m.key === month);

  // headline: monthly mock %ile trend (avg per month) vs target
  const trend = useMemo(() => {
    return MONTHLY_PERCENTILE_TARGET.map((t) => {
      const ms = mocks.filter((m) => monthKeyOf(m.date) === t.key && m.type === "full");
      const avg = ms.length ? Math.round((ms.reduce((s, m) => s + m.overall.percentile, 0) / ms.length) * 10) / 10 : null;
      return { month: t.month, actual: avg, target: t.pct };
    });
  }, [mocks]);

  // error reduction: errors logged per month
  const errTrend = useMemo(() => {
    const map: Record<string, number> = {};
    errors.forEach((e) => {
      const k = monthKeyOf(e.date);
      map[k] = (map[k] || 0) + 1;
    });
    return MONTHLY_PERCENTILE_TARGET.map((t) => ({ month: t.month, errors: map[t.key] || 0 }));
  }, [errors]);

  const bestPct = moMocks.reduce((b, m) => Math.max(b, m.overall.percentile), 0);
  const avgEnergy = moLogs.length ? (moLogs.reduce((s, l) => s + (l.energy || 0), 0) / moLogs.length).toFixed(1) : "—";
  const avgSleep = moLogs.length ? (moLogs.reduce((s, l) => s + (l.sleepHours || 0), 0) / moLogs.length).toFixed(1) : "—";

  const saveReview = async () => {
    setSaved("saving");
    await jpost("/api/reviews", { ...review, type: "monthly", periodKey: month, syllabusCoverage: review.syllabusCoverage || { QA: 0, DILR: 0, VARC: 0 } });
    setSaved("ok");
    setTimeout(() => setSaved(""), 1500);
  };
  const cov = review.syllabusCoverage || { QA: 0, DILR: 0, VARC: 0 };
  const setCov = (k: string, v: number) => setReview({ ...review, syllabusCoverage: { ...cov, [k]: v } });

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <select className="select w-44" value={month} onChange={(e) => setMonth(e.target.value)}>
          {MONTHLY_PERCENTILE_TARGET.map((m) => <option key={m.key} value={m.key}>{m.month} 2026</option>)}
        </select>
        <div className="text-sm text-slate-400">
          Target: <span className="text-brand">{target?.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Study hours" value={totalHours(moLogs).toFixed(0)} accent="#5b8cff" />
        <StatCard label="Full mocks" value={moMocks.length} accent="#34d399" />
        <StatCard label="Best %ile" value={bestPct || "—"} accent="#fbbf24" />
        <StatCard label="Avg energy" value={avgEnergy} sub="/5" accent="#f472b6" />
        <StatCard label="Avg sleep" value={avgSleep} sub="hrs" accent="#22d3ee" />
      </div>

      <Panel title="Headline — monthly mock %ile trend vs target">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend} margin={{ left: -10, right: 10, top: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
            <XAxis dataKey="month" {...axis} /><YAxis domain={[80, 100]} {...axis} />
            <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="actual" name="Your avg %ile" stroke="#5b8cff" strokeWidth={3} dot={{ r: 5 }} connectNulls />
            <Line type="monotone" dataKey="target" name="Target" stroke="#34d399" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Accuracy by area this month">
          <div className="grid grid-cols-5 gap-2">
            {(["QA", "RC", "VA", "DI", "LR"] as const).map((t) => (
              <div key={t} className="rounded-xl border border-line bg-panel2 p-3 text-center">
                <div className="text-xs text-slate-400">{t}</div>
                <div className="text-lg font-semibold">{acc(p[t].correct, p[t].attempted)}%</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            LR sets this month: <span className="text-lr">{totalLrSets(moLogs)}</span> · Total questions:{" "}
            {Object.values(p).reduce((s, x) => s + x.attempted, 0)}
          </div>
        </Panel>

        <Panel title="Errors logged per month (repeat-mistake trend)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={errTrend} margin={{ left: -10, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" vertical={false} />
              <XAxis dataKey="month" {...axis} /><YAxis {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="errors" radius={[4, 4, 0, 0]}>
                {errTrend.map((d, i) => <Cell key={i} fill={d.month === target?.month ? "#fbbf24" : "#5b8cff"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <Panel title={`Topics covered this month (${topicsFromLogs(moLogs).length})`}>
        <TopicsCovered rows={topicsFromLogs(moLogs)} />
      </Panel>

      <Panel title="Syllabus coverage (self-assessed)">
        <div className="space-y-3">
          {(["QA", "DILR", "VARC"] as const).map((k) => (
            <div key={k}>
              <Progress label={k} value={cov[k] || 0} target={100} unit="%" color={k === "QA" ? "#34d399" : k === "DILR" ? "#f472b6" : "#fbbf24"} />
              <input type="range" min={0} max={100} value={cov[k] || 0} onChange={(e) => setCov(k, +e.target.value)} className="mt-1 w-full accent-brand" />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Monthly review" right={<button className="btn" onClick={saveReview}>{saved === "saving" ? "Saving…" : saved === "ok" ? "Saved ✓" : "Save review"}</button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Phase goals met? (Y/N + why)</label>
            <textarea className="textarea h-20" value={review.phaseGoalsMet || ""} onChange={(e) => setReview({ ...review, phaseGoalsMet: e.target.value })} /></div>
          <div><label className="label">Plan adjustments for next month</label>
            <textarea className="textarea h-20" value={review.adjustments || ""} onChange={(e) => setReview({ ...review, adjustments: e.target.value })} /></div>
        </div>
      </Panel>
    </div>
  );
}
