"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Radar,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { jget, jpost, jdelete } from "@/lib/api";
import { Panel, Empty, StatCard } from "@/components/Ui";
import { Mock, mockChartRows } from "@/lib/compute";
import { SECTIONS, MONTHLY_PERCENTILE_TARGET } from "@/lib/planData";
import { todayStr, fmtDateShort, fmtDate, monthKeyOf, accuracy } from "@/lib/utils";

const tooltipStyle = { background: "#121a2e", border: "1px solid #26304d", borderRadius: 10, fontSize: 12 };
const axis = { tick: { fill: "#8aa0c8", fontSize: 11 }, stroke: "#26304d" };

function emptyMock() {
  return {
    date: todayStr(),
    name: "",
    type: "full",
    series: "",
    overall: { score: 0, maxScore: 204, percentile: 0, attempted: 0, correct: 0 },
    sections: SECTIONS.map((s) => ({ section: s.key, score: 0, maxScore: s.marks, percentile: 0, attempted: 0, correct: 0, timeSpent: 40 })),
    takeaways: "",
    selectionNotes: "",
  };
}

export default function MocksPage() {
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [form, setForm] = useState<any>(emptyMock());
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setMocks(await jget<Mock[]>("/api/mocks"));
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    return mockChartRows(mocks).map((r) => {
      const t = MONTHLY_PERCENTILE_TARGET.find((x) => x.key === monthKeyOf(r.date));
      return { ...r, target: t?.pct ?? null, label: fmtDateShort(r.date) };
    });
  }, [mocks]);

  const fullMocks = mocks.filter((m) => m.type === "full");
  const last = fullMocks[fullMocks.length - 1];
  const best = fullMocks.reduce((b, m) => (m.overall.percentile > (b?.overall.percentile ?? -1) ? m : b), null as Mock | null);

  // radar of latest mock section percentiles
  const radarData = last
    ? SECTIONS.map((s) => ({ section: s.key, value: last.sections.find((x) => x.section === s.key)?.percentile ?? 0 }))
    : [];

  const submit = async () => {
    if (!form.name || !form.date) {
      setMsg("Name and date required");
      return;
    }
    setBusy(true);
    try {
      // recompute overall from sections if full
      const body = { ...form };
      if (form.type === "full") {
        body.overall = {
          ...form.overall,
          score: form.sections.reduce((s: number, x: any) => s + (+x.score || 0), 0),
          maxScore: 204,
          attempted: form.sections.reduce((s: number, x: any) => s + (+x.attempted || 0), 0),
          correct: form.sections.reduce((s: number, x: any) => s + (+x.correct || 0), 0),
          percentile: +form.overall.percentile || 0,
        };
      }
      if (form._id) await jpost(`/api/mocks/${form._id}`, body, "PUT");
      else await jpost("/api/mocks", body);
      setForm(emptyMock());
      setShow(false);
      setMsg("");
      await load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const edit = (m: Mock) => {
    setForm(JSON.parse(JSON.stringify(m)));
    setShow(true);
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this mock?")) return;
    await jdelete(`/api/mocks/${id}`);
    await load();
  };

  const setSec = (i: number, field: string, v: any) =>
    setForm((f: any) => ({ ...f, sections: f.sections.map((s: any, idx: number) => (idx === i ? { ...s, [field]: v } : s)) }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mocks & sectionals</h1>
        <button className="btn" onClick={() => { setForm(emptyMock()); setShow((s) => !s); }}>
          {show ? "Close" : "+ Log a mock"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Full mocks" value={fullMocks.length} accent="#5b8cff" />
        <StatCard label="Latest %ile" value={last ? last.overall.percentile : "—"} sub={last ? fmtDate(last.date) : ""} accent="#34d399" />
        <StatCard label="Best %ile" value={best ? best.overall.percentile : "—"} sub={best?.name} accent="#fbbf24" />
        <StatCard label="Latest score" value={last ? `${last.overall.score}/204` : "—"} accent="#f472b6" />
      </div>

      {/* Add/edit form */}
      {show && (
        <Panel title={form._id ? "Edit mock" : "Log a new mock"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="label">Name</label><input className="input" placeholder="SimCAT 01" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label">Type</label>
              <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="full">Full mock</option>
                <option value="sectional">Sectional</option>
                <option value="topic">Topic test</option>
              </select>
            </div>
            <div><label className="label">Series</label><input className="input" placeholder="IMS / TIME / CL…" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} /></div>
            <div><label className="label">Overall %ile</label><input type="number" step="0.01" className="input" value={form.overall.percentile} onChange={(e) => setForm({ ...form, overall: { ...form.overall, percentile: +e.target.value } })} /></div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="py-1">Section</th><th>Score</th><th>%ile</th><th>Attempted</th><th>Correct</th><th>Acc</th><th>Time(m)</th>
                </tr>
              </thead>
              <tbody>
                {form.sections.map((s: any, i: number) => (
                  <tr key={s.section} className="border-t border-line">
                    <td className="py-1.5 font-medium" style={{ color: SECTIONS.find((x) => x.key === s.section)?.color }}>{s.section}</td>
                    <td><input type="number" className="input w-20" value={s.score} onChange={(e) => setSec(i, "score", +e.target.value)} /></td>
                    <td><input type="number" step="0.01" className="input w-24" value={s.percentile} onChange={(e) => setSec(i, "percentile", +e.target.value)} /></td>
                    <td><input type="number" className="input w-20" value={s.attempted} onChange={(e) => setSec(i, "attempted", +e.target.value)} /></td>
                    <td><input type="number" className="input w-20" value={s.correct} onChange={(e) => setSec(i, "correct", +e.target.value)} /></td>
                    <td className="text-slate-400">{accuracy(s.correct, s.attempted)}%</td>
                    <td><input type="number" className="input w-20" value={s.timeSpent} onChange={(e) => setSec(i, "timeSpent", +e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div><label className="label">Takeaways — "Next mock I will ___"</label><textarea className="textarea h-20" value={form.takeaways} onChange={(e) => setForm({ ...form, takeaways: e.target.value })} /></div>
            <div><label className="label">Selection audit (which DILR sets did/should you have done?)</label><textarea className="textarea h-20" value={form.selectionNotes} onChange={(e) => setForm({ ...form, selectionNotes: e.target.value })} /></div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            {msg && <span className="text-xs text-rose-300">{msg}</span>}
            <button className="btn" onClick={submit} disabled={busy}>{busy ? "Saving…" : form._id ? "Update mock" : "Save mock"}</button>
          </div>
        </Panel>
      )}

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Overall %ile vs target">
          {rows.length === 0 ? <Empty>No full mocks yet.</Empty> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={rows} margin={{ left: -10, right: 10, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" />
                <XAxis dataKey="label" {...axis} /><YAxis domain={[60, 100]} {...axis} />
                <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="overall" name="%ile" stroke="#5b8cff" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="target" name="target" stroke="#34d399" strokeDasharray="5 5" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Latest mock — section %ile radar">
          {radarData.length === 0 ? <Empty>Log a full mock to see the radar.</Empty> : (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#26304d" />
                <PolarAngleAxis dataKey="section" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
                <Radar dataKey="value" stroke="#5b8cff" fill="#5b8cff" fillOpacity={0.4} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* List */}
      <Panel title="All attempts">
        {mocks.length === 0 ? <Empty>No mocks logged.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Date</th><th>Name</th><th>Type</th><th>Score</th><th>%ile</th>
                  <th>QA</th><th>VARC</th><th>DILR</th><th></th>
                </tr>
              </thead>
              <tbody>
                {[...mocks].reverse().map((m) => {
                  const g = (s: string) => m.sections.find((x) => x.section === s)?.percentile ?? "—";
                  return (
                    <tr key={m._id} className="border-t border-line hover:bg-panel2/50">
                      <td className="py-2 text-slate-400">{fmtDateShort(m.date)}</td>
                      <td className="font-medium">{m.name}{m.series && <span className="text-slate-500"> · {m.series}</span>}</td>
                      <td><span className="pill bg-panel2 text-slate-300">{m.type}</span></td>
                      <td>{m.type === "full" ? `${m.overall.score}/204` : "—"}</td>
                      <td className="font-semibold text-brand">{m.overall.percentile || "—"}</td>
                      <td className="text-qa">{g("QA")}</td><td className="text-varc">{g("VARC")}</td><td className="text-dilr">{g("DILR")}</td>
                      <td className="text-right">
                        <button className="btn-ghost mr-1 px-2 py-1 text-xs" onClick={() => edit(m)}>Edit</button>
                        <button className="btn-danger" onClick={() => remove(m._id)}>Del</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
