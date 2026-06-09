"use client";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { jget, jpost, jdelete } from "@/lib/api";
import { Panel, Empty, StatCard, Tag } from "@/components/Ui";
import { todayStr, fmtDateShort, fmtDate } from "@/lib/utils";

const tooltipStyle = { background: "#121a2e", border: "1px solid #26304d", borderRadius: 10, fontSize: 12 };
const axis = { tick: { fill: "#8aa0c8", fontSize: 11 }, stroke: "#26304d" };
const AREAS = ["QA", "VARC", "DILR", "DI", "LR", "RC", "VA", "Other"];

interface Sectional {
  _id: string;
  date: string;
  area: string;
  chapter: string;
  testRef: string;
  marks: number;
  maxMarks: number;
  percentile: number;
  notes: string;
}

function blank() {
  return { date: todayStr(), area: "QA", chapter: "", testRef: "", marks: 0, maxMarks: 0, percentile: 0, notes: "" };
}

export default function SectionalsPage() {
  const [tests, setTests] = useState<Sectional[]>([]);
  const [form, setForm] = useState<any>(blank());
  const [show, setShow] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      setTests(await jget<Sectional[]>("/api/sectionals"));
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.chapter || !form.date) {
      setMsg("Chapter and date are required");
      return;
    }
    setBusy(true);
    try {
      if (form._id) await jpost(`/api/sectionals/${form._id}`, form, "PUT");
      else await jpost("/api/sectionals", form);
      setForm(blank());
      setMsg("");
      await load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };
  const edit = (t: Sectional) => {
    setForm({ ...t });
    setShow(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this sectional test?")) return;
    await jdelete(`/api/sectionals/${id}`);
    await load();
  };

  const chapters = useMemo(() => Array.from(new Set(tests.map((t) => t.chapter))).sort(), [tests]);

  // average percentile per chapter (weak-chapter finder)
  const byChapter = useMemo(() => {
    const m = new Map<string, { chapter: string; n: number; sumP: number; best: number; last: string; area: string }>();
    for (const t of tests) {
      const key = t.chapter.trim().toLowerCase();
      const cur = m.get(key);
      if (cur) {
        cur.n++;
        cur.sumP += t.percentile || 0;
        cur.best = Math.max(cur.best, t.percentile || 0);
        if (t.date > cur.last) cur.last = t.date;
      } else {
        m.set(key, { chapter: t.chapter.trim(), n: 1, sumP: t.percentile || 0, best: t.percentile || 0, last: t.date, area: t.area });
      }
    }
    return Array.from(m.values())
      .map((c) => ({ ...c, avg: Math.round((c.sumP / c.n) * 10) / 10 }))
      .sort((a, b) => a.avg - b.avg);
  }, [tests]);

  const filtered = useMemo(() => {
    let r = [...tests].reverse();
    if (filter !== "All") r = r.filter((t) => t.area === filter);
    if (q.trim()) r = r.filter((t) => t.chapter.toLowerCase().includes(q.trim().toLowerCase()) || t.testRef.toLowerCase().includes(q.trim().toLowerCase()));
    return r;
  }, [tests, filter, q]);

  const avgP = tests.length ? Math.round((tests.reduce((s, t) => s + (t.percentile || 0), 0) / tests.length) * 10) / 10 : 0;
  const bestP = tests.reduce((b, t) => Math.max(b, t.percentile || 0), 0);

  const set = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));
  const numField = (label: string, key: string, step?: string) => (
    <div>
      <label className="label">{label}</label>
      <input type="number" step={step} className="input" value={form[key]} onChange={(e) => set({ [key]: +e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Sectional / topic tests</h1>
          <p className="text-xs text-slate-500">Chapter-wise tests — track which chapters you&apos;ve tested and how they trend.</p>
        </div>
        <button className="btn" onClick={() => { setForm(blank()); setShow((s) => !s); }}>{show ? "Close" : "+ Log a test"}</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Tests logged" value={tests.length} accent="#5b8cff" />
        <StatCard label="Avg %ile" value={avgP || "—"} accent="#34d399" />
        <StatCard label="Best %ile" value={bestP || "—"} accent="#fbbf24" />
        <StatCard label="Chapters tested" value={chapters.length} accent="#f472b6" />
      </div>

      {show && (
        <Panel title={form._id ? "Edit test" : "Log a sectional / topic test"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => set({ date: e.target.value })} />
            </div>
            <div>
              <label className="label">Area</label>
              <select className="select" value={form.area} onChange={(e) => set({ area: e.target.value })}>
                {AREAS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="label">Chapter name</label>
              <input className="input" list="sec-chapters" placeholder="e.g. Time-Speed-Distance" value={form.chapter} onChange={(e) => set({ chapter: e.target.value })} />
              <datalist id="sec-chapters">{chapters.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="label">Test reference ID</label>
              <input className="input" placeholder="TIME-QA-12" value={form.testRef} onChange={(e) => set({ testRef: e.target.value })} />
            </div>
            {numField("Marks", "marks")}
            {numField("Max marks (optional)", "maxMarks")}
            {numField("Percentile", "percentile", "0.01")}
            <div className="lg:col-span-4">
              <label className="label">Notes (optional)</label>
              <input className="input" placeholder="what went wrong / takeaway" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            {msg && <span className="text-xs text-rose-300">{msg}</span>}
            <button className="btn" onClick={submit} disabled={busy}>{busy ? "Saving…" : form._id ? "Update" : "Save test"}</button>
          </div>
        </Panel>
      )}

      <Panel title="Avg %ile by chapter — weakest first" right={<span className="text-xs text-slate-500">compare lessons · red &lt;75 · amber 75–90 · green ≥90</span>}>
        {byChapter.length === 0 ? <Empty>Log tests to compare chapters and spot weak ones.</Empty> : (
          <ResponsiveContainer width="100%" height={Math.max(220, byChapter.length * 34)}>
            <BarChart data={byChapter} layout="vertical" margin={{ left: 20, right: 16, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2740" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} {...axis} />
              <YAxis type="category" dataKey="chapter" width={150} {...axis} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any, _n, p: any) => [`${v} %ile (${p.payload.n} test${p.payload.n > 1 ? "s" : ""}, best ${p.payload.best})`, p.payload.chapter]} />
              <Bar dataKey="avg" name="avg %ile" radius={[0, 4, 4, 0]}>
                {byChapter.map((c, i) => (
                  <Cell key={i} fill={c.avg >= 90 ? "#34d399" : c.avg >= 75 ? "#fbbf24" : "#fb7185"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      <Panel
        title="All sectional tests"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input className="input h-8 w-40 py-1 text-sm" placeholder="Search chapter / ref…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="select h-8 w-28 py-1 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {["All", ...AREAS].map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        }
      >
        {filtered.length === 0 ? <Empty>No tests match.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Date</th><th>Area</th><th>Chapter</th><th>Ref ID</th><th>Marks</th><th>%ile</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t._id} className="border-t border-line hover:bg-panel2/50">
                    <td className="py-2 text-slate-400">{fmtDateShort(t.date)}</td>
                    <td><Tag>{t.area}</Tag></td>
                    <td className="font-medium text-slate-200">{t.chapter}</td>
                    <td className="text-slate-400">{t.testRef || "—"}</td>
                    <td>{t.marks}{t.maxMarks ? <span className="text-slate-500">/{t.maxMarks}</span> : ""}</td>
                    <td className="font-semibold text-brand">{t.percentile || "—"}</td>
                    <td className="text-right">
                      <button className="btn-ghost mr-1 px-2 py-1 text-xs" onClick={() => edit(t)}>Edit</button>
                      <button className="btn-danger" onClick={() => remove(t._id)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
