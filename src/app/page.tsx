"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend, Area, AreaChart,
} from "recharts";
import { jget } from "@/lib/api";
import {
  DailyLog, Mock, ErrLog, studyStreak, totalHours, thisWeek, thisMonth, sumPractice,
  totalLrSets, totalDiSets, totalRc, totalVa, mockChartRows, errorsByCause, acc, inRange,
} from "@/lib/compute";
import { StatCard, Panel, Progress, Empty } from "@/components/Ui";
import {
  PLAN_START, PHASES, VOLUME_TARGETS, DAILY_HOURS_TARGET, WEEKLY_HOURS_TARGET,
  MONTHLY_PERCENTILE_TARGET, SECTIONS,
} from "@/lib/planData";
import { todayStr, addDays, phaseForDate, monthKeyOf, fmtDateShort, daysToExam, weekNumberOf } from "@/lib/utils";

const tooltipStyle = { background: "#121a2e", border: "1px solid #26304d", borderRadius: 10, fontSize: 12 };
const axis = { tick: { fill: "#8aa0c8", fontSize: 11 }, stroke: "#26304d" };

export default function Dashboard() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [errors, setErrors] = useState<ErrLog[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [l, m, e] = await Promise.all([
          jget<DailyLog[]>(`/api/daily?from=${PLAN_START}`),
          jget<Mock[]>("/api/mocks"),
          jget<ErrLog[]>("/api/errors"),
        ]);
        setLogs(l); setMocks(m); setErrors(e);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = todayStr();
  const phaseId = phaseForDate(today);
  const phase = PHASES.find((p) => p.id === phaseId)!;
  const wk = thisWeek(logs);
  const mo = thisMonth(logs);
  const streak = studyStreak(logs);
  const weekHours = totalHours(wk);

  const volTarget = VOLUME_TARGETS[phaseId];
  const wkPractice = sumPractice(wk);

  const mockRows = useMemo(() => {
    return mockChartRows(mocks).map((r) => {
      const t = MONTHLY_PERCENTILE_TARGET.find((x) => x.key === monthKeyOf(r.date));
      return { ...r, target: t?.pct ?? null, label: fmtDateShort(r.date) };
    });
  }, [mocks]);

  // study hours last 21 days
  const hoursSeries = useMemo(() => {
    const byDate: Record<string, DailyLog> = {};
    logs.forEach((l) => (byDate[l.date] = l));
    const arr = [];
    for (let i = 20; i >= 0; i--) {
      const d = addDays(today, -i);
      arr.push({ date: d, label: fmtDateShort(d), hours: byDate[d]?.hoursActual || 0 });
    }
    return arr;
  }, [logs, today]);

  // accuracy by section from last 30 days
  const accSeries = useMemo(() => {
    const recent = inRange(logs, addDays(today, -30), today);
    const p = sumPractice(recent);
    return [
      { name: "QA", acc: acc(p.QA.correct, p.QA.attempted), color: "#34d399" },
      { name: "RC", acc: acc(p.RC.correct, p.RC.attempted), color: "#fbbf24" },
      { name: "VA", acc: acc(p.VA.correct, p.VA.attempted), color: "#f59e0b" },
      { name: "DI", acc: acc(p.DI.correct, p.DI.attempted), color: "#f472b6" },
      { name: "LR", acc: acc(p.LR.correct, p.LR.attempted), color: "#a78bfa" },
    ];
  }, [logs, today]);

  const causeData = useMemo(() => errorsByCause(errors).sort((a, b) => b.count - a.count), [errors]);
  const openErrors = errors.filter((e) => e.status === "open").length;
  const resolvedErrors = errors.filter((e) => e.status === "resolved").length;
  const dueErrors = errors.filter((e) => e.status === "open" && e.nextReview && e.nextReview <= today).length;

  const lrDaily = useMemo(() => {
    return logs
      .filter((l) => (l.lr?.setsDone || 0) > 0)
      .map((l) => ({ label: fmtDateShort(l.date), time: l.lr.avgTimePerSet, accuracy: l.lr.accuracy }));
  }, [logs]);

  const PIE = ["#f472b6", "#a78bfa", "#34d399", "#fbbf24", "#5b8cff", "#fb7185", "#22d3ee", "#f59e0b"];

  if (err)
    return (
      <Panel title="Connection error">
        <p className="text-sm text-rose-300">{err}</p>
        <p className="mt-2 text-sm text-slate-400">
          Open <code className="rounded bg-panel2 px-1">.env.local</code> and paste your MongoDB Atlas URI, then restart the dev server.
        </p>
      </Panel>
    );

  return (
    <div className="space-y-5">
      {/* Phase banner */}
      <div className="card flex flex-wrap items-center justify-between gap-3" style={{ borderColor: phase.color + "66" }}>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Current phase · Week {weekNumberOf(today)} of 26
          </div>
          <div className="mt-0.5 text-lg font-semibold" style={{ color: phase.color }}>
            {phase.id} — {phase.name}
          </div>
          <div className="text-xs text-slate-400">{phase.theme}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color: phase.color }}>{daysToExam()}</div>
          <div className="text-xs text-slate-400">days to exam · 29 Nov 2026</div>
        </div>
      </div>

      {loading && <Empty>Loading your data…</Empty>}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Study streak" value={`${streak}🔥`} sub="consecutive days" accent="#fb7185" />
        <StatCard label="Hours this week" value={weekHours.toFixed(1)} sub={`target ${WEEKLY_HOURS_TARGET}h`} accent="#5b8cff" />
        <StatCard label="LR sets / week" value={totalLrSets(wk)} sub={`target ${volTarget.lr}`} accent="#a78bfa" />
        <StatCard label="Mocks taken" value={mocks.filter((m) => m.type === "full").length} sub={`${mocks.length} incl. sectionals`} accent="#34d399" />
        <StatCard label="Open errors" value={openErrors} sub={`${dueErrors} due to review`} accent="#fbbf24" />
        <StatCard label="Resolved" value={resolvedErrors} sub="graduated out" accent="#22d3ee" />
      </div>

      {/* Mock percentile trend + target */}
      <Panel title="Mock %ile trend vs monthly target" right={<span className="text-xs text-slate-500">full mocks only</span>}>
        {mockRows.length === 0 ? (
          <Empty>No mocks yet — log your Week-1 diagnostic on the Mocks page.</Empty>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mockRows} margin={{ left: -10, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
              <XAxis dataKey="label" {...axis} />
              <YAxis domain={[60, 100]} {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="overall" name="Your %ile" stroke="#5b8cff" strokeWidth={3} dot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="target" name="Target" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Section percentile trend */}
        <Panel title="Sectional %ile trend">
          {mockRows.length === 0 ? (
            <Empty>Section data appears once you log full mocks.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={mockRows} margin={{ left: -10, right: 10, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
                <XAxis dataKey="label" {...axis} />
                <YAxis domain={[40, 100]} {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="QA" stroke="#34d399" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="VARC" stroke="#fbbf24" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="DILR" stroke="#f472b6" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Mock score trend */}
        <Panel title="Mock score trend (/204)">
          {mockRows.length === 0 ? (
            <Empty>No mocks yet.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={mockRows} margin={{ left: -10, right: 10, top: 5 }}>
                <defs>
                  <linearGradient id="sc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b8cff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#5b8cff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
                <XAxis dataKey="label" {...axis} />
                <YAxis domain={[0, 204]} {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="score" name="Score" stroke="#5b8cff" strokeWidth={2} fill="url(#sc)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Study hours last 21 days */}
        <Panel title="Study hours · last 21 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hoursSeries} margin={{ left: -10, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" vertical={false} />
              <XAxis dataKey="label" {...axis} interval={2} />
              <YAxis {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={DAILY_HOURS_TARGET} stroke="#34d399" strokeDasharray="4 4" label={{ value: "4h target", fill: "#34d399", fontSize: 10, position: "right" }} />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {hoursSeries.map((d, i) => (
                  <Cell key={i} fill={d.hours >= DAILY_HOURS_TARGET ? "#34d399" : d.hours > 0 ? "#5b8cff" : "#26304d"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Accuracy by section */}
        <Panel title="Accuracy by area · last 30 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={accSeries} margin={{ left: -10, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" vertical={false} />
              <XAxis dataKey="name" {...axis} />
              <YAxis domain={[0, 100]} {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="acc" name="Accuracy %" radius={[4, 4, 0, 0]}>
                {accSeries.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Weekly volume vs target */}
        <Panel title={`This week's volume vs ${phaseId} target`}>
          <div className="space-y-3">
            <Progress label="LR sets" value={totalLrSets(wk)} target={volTarget.lr} color="#a78bfa" />
            <Progress label="DI sets" value={totalDiSets(wk)} target={volTarget.di} color="#f472b6" />
            <Progress label="QA questions" value={wkPractice.QA.attempted} target={volTarget.qa} color="#34d399" />
            <Progress label="RC passages" value={totalRc(wk)} target={volTarget.rc} color="#fbbf24" />
            <Progress label="VA drills" value={totalVa(wk)} target={volTarget.va} color="#f59e0b" />
            <Progress label="Study hours" value={Math.round(weekHours)} target={WEEKLY_HOURS_TARGET} unit="h" color="#5b8cff" />
          </div>
        </Panel>

        {/* Errors by cause */}
        <Panel title="Error log by cause">
          {causeData.length === 0 ? (
            <Empty>No errors logged yet.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={causeData} dataKey="count" nameKey="cause" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {causeData.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* LR progress */}
        <Panel title="LR: avg time/set & accuracy">
          {lrDaily.length === 0 ? (
            <Empty>Log LR sets on the Daily page.</Empty>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lrDaily} margin={{ left: -10, right: 10, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
                <XAxis dataKey="label" {...axis} />
                <YAxis yAxisId="l" domain={[0, 20]} {...axis} />
                <YAxis yAxisId="r" orientation="right" domain={[0, 100]} {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine yAxisId="l" y={11} stroke="#a78bfa" strokeDasharray="4 4" />
                <Line yAxisId="l" type="monotone" dataKey="time" name="min/set" stroke="#a78bfa" strokeWidth={2} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="accuracy" name="acc %" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>
    </div>
  );
}
