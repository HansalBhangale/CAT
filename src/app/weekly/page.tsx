"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";
import { jget, jpost } from "@/lib/api";
import { Panel, Progress, StatCard, Empty, TopicsCovered } from "@/components/Ui";
import { DailyLog, Mock, ErrLog, inRange, totalHours, totalLrSets, sumPractice, totalRc, totalVa, acc, topicsFromLogs } from "@/lib/compute";
import { PLAN_START, VOLUME_TARGETS, WEEKLY_HOURS_TARGET, DAILY_HOURS_TARGET } from "@/lib/planData";
import { todayStr, weekStartOf, addDays, fmtDate, fmtDateShort, phaseForDate, weekNumberOf } from "@/lib/utils";

const tooltipStyle = { background: "#121a2e", border: "1px solid #26304d", borderRadius: 10, fontSize: 12 };
const axis = { tick: { fill: "#8aa0c8", fontSize: 11 }, stroke: "#26304d" };

export default function WeeklyPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [errors, setErrors] = useState<ErrLog[]>([]);
  const [weekStart, setWeekStart] = useState(weekStartOf(todayStr()));
  const [review, setReview] = useState<any>({ processFix: "", lrSetTypeAccuracy: "" });
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
    (async () => {
      const r = await jget(`/api/reviews?type=weekly&periodKey=${weekStart}`);
      setReview(r || { processFix: "", lrSetTypeAccuracy: "" });
    })();
  }, [weekStart]);

  const weekEnd = addDays(weekStart, 6);
  const phaseId = phaseForDate(weekStart);
  const vt = VOLUME_TARGETS[phaseId];
  const wkLogs = inRange(logs, weekStart, weekEnd);
  const p = sumPractice(wkLogs);
  const hours = totalHours(wkLogs);

  const dayBars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const log = logs.find((l) => l.date === d);
      arr.push({ label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], hours: log?.hoursActual || 0, date: d });
    }
    return arr;
  }, [logs, weekStart]);

  const wkMocks = mocks.filter((m) => m.date >= weekStart && m.date <= weekEnd);
  const newErrors = errors.filter((e) => e.date >= weekStart && e.date <= weekEnd).length;
  const resolvedThisWeek = errors.filter((e) => e.status === "resolved" && (e as any).updatedAt && (e as any).updatedAt.slice(0, 10) >= weekStart && (e as any).updatedAt.slice(0, 10) <= weekEnd).length;
  const errorsRevised = wkLogs.reduce((s, l) => s + (l.errorsRevised || 0), 0);

  const saveReview = async () => {
    setSaved("saving");
    await jpost("/api/reviews", { ...review, type: "weekly", periodKey: weekStart });
    setSaved("ok");
    setTimeout(() => setSaved(""), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Prev</button>
          <button className="btn-ghost" onClick={() => setWeekStart(weekStartOf(todayStr()))}>This week</button>
          <button className="btn-ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>Next →</button>
        </div>
        <div className="text-sm text-slate-400">
          Week {weekNumberOf(weekStart)} · {fmtDate(weekStart)} – {fmtDateShort(weekEnd)} · <span style={{ color: "#5b8cff" }}>{phaseId}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Study hours" value={hours.toFixed(1)} sub={`target ${WEEKLY_HOURS_TARGET}h`} accent="#5b8cff" />
        <StatCard label="Active days" value={wkLogs.filter((l) => l.hoursActual > 0).length} sub="of 7" accent="#34d399" />
        <StatCard label="New errors" value={newErrors} sub={`${errorsRevised} revised`} accent="#fbbf24" />
        <StatCard label="Resolved" value={resolvedThisWeek} sub="this week" accent="#22d3ee" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Daily hours this week">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dayBars} margin={{ left: -10, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" vertical={false} />
              <XAxis dataKey="label" {...axis} /><YAxis {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={DAILY_HOURS_TARGET} stroke="#34d399" strokeDasharray="4 4" />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {dayBars.map((d, i) => <Cell key={i} fill={d.hours >= DAILY_HOURS_TARGET ? "#34d399" : d.hours > 0 ? "#5b8cff" : "#26304d"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={`Volume vs ${phaseId} weekly target`}>
          <div className="space-y-3">
            <Progress label="LR sets" value={totalLrSets(wkLogs)} target={vt.lr} color="#a78bfa" />
            <Progress label="DI sets" value={p.DI.attempted} target={vt.di} color="#f472b6" />
            <Progress label="QA questions" value={p.QA.attempted} target={vt.qa} color="#34d399" />
            <Progress label="RC passages" value={totalRc(wkLogs)} target={vt.rc} color="#fbbf24" />
            <Progress label="VA drills" value={totalVa(wkLogs)} target={vt.va} color="#f59e0b" />
          </div>
        </Panel>
      </div>

      <Panel title="Accuracy by area this week">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["QA", "RC", "VA", "DI", "LR"] as const).map((t) => (
            <div key={t} className="rounded-xl border border-line bg-panel2 p-3 text-center">
              <div className="text-xs text-slate-400">{t}</div>
              <div className="text-xl font-semibold">{acc(p[t].correct, p[t].attempted)}%</div>
              <div className="text-xs text-slate-500">{p[t].correct}/{p[t].attempted}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={`Topics covered this week (${topicsFromLogs(wkLogs).length})`}>
        <TopicsCovered rows={topicsFromLogs(wkLogs)} />
      </Panel>

      {wkMocks.length > 0 && (
        <Panel title="Mocks this week">
          <div className="flex flex-wrap gap-2">
            {wkMocks.map((m) => (
              <span key={m._id} className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-sm">
                {m.name}: <span className="font-semibold text-brand">{m.overall.percentile}%ile</span>
              </span>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Weekly self-review" right={<button className="btn" onClick={saveReview}>{saved === "saving" ? "Saving…" : saved === "ok" ? "Saved ✓" : "Save review"}</button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">LR set-type accuracy — which types still leak?</label>
            <textarea className="textarea h-24" value={review.lrSetTypeAccuracy || ""} onChange={(e) => setReview({ ...review, lrSetTypeAccuracy: e.target.value })} /></div>
          <div><label className="label">One process fix for next week</label>
            <textarea className="textarea h-24" value={review.processFix || ""} onChange={(e) => setReview({ ...review, processFix: e.target.value })} /></div>
        </div>
      </Panel>
    </div>
  );
}
