"use client";
import { useEffect, useMemo, useState } from "react";
import { jget } from "@/lib/api";
import { Panel, Empty, StatCard } from "@/components/Ui";
import { PLAN_START, TOPIC_SECTIONS } from "@/lib/planData";
import { fmtDateShort, diffDays, todayStr } from "@/lib/utils";

type Topic = { block: string; section: string; name: string };
type Log = { date: string; topics: Topic[] };
type Row = { section: string; name: string; count: number; first: string; last: string; daysAgo: number };

export default function TopicsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [q, setQ] = useState("");
  const [section, setSection] = useState("All");
  const [sort, setSort] = useState<"recent" | "count" | "stale" | "az">("recent");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLogs(await jget<Log[]>(`/api/daily?from=${PLAN_START}`));
      } catch (e: any) {
        setErr(e.message);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const l of logs) {
      for (const t of l.topics || []) {
        const key = `${t.section}::${t.name.trim().toLowerCase()}`;
        const cur = map.get(key);
        if (cur) {
          cur.count++;
          if (l.date < cur.first) cur.first = l.date;
          if (l.date > cur.last) cur.last = l.date;
        } else {
          map.set(key, { section: t.section, name: t.name.trim(), count: 1, first: l.date, last: l.date, daysAgo: 0 });
        }
      }
    }
    const today = todayStr();
    const arr = Array.from(map.values()).map((r) => ({ ...r, daysAgo: diffDays(today, r.last) }));
    return arr;
  }, [logs]);

  const sections = useMemo(() => ["All", ...TOPIC_SECTIONS.filter((s) => rows.some((r) => r.section === s))], [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (section !== "All") r = r.filter((x) => x.section === section);
    if (q.trim()) r = r.filter((x) => x.name.toLowerCase().includes(q.trim().toLowerCase()));
    const s = [...r];
    if (sort === "recent") s.sort((a, b) => b.last.localeCompare(a.last));
    else if (sort === "stale") s.sort((a, b) => a.last.localeCompare(b.last));
    else if (sort === "count") s.sort((a, b) => b.count - a.count);
    else s.sort((a, b) => a.name.localeCompare(b.name));
    return s;
  }, [rows, section, q, sort]);

  const totalUnique = rows.length;
  const totalLogged = rows.reduce((s, r) => s + r.count, 0);
  const repeats = rows.filter((r) => r.count > 1).length;
  const stale = rows.filter((r) => r.daysAgo >= 21).length;

  const bySection = useMemo(() => {
    const m: Record<string, number> = {};
    rows.forEach((r) => (m[r.section] = (m[r.section] || 0) + 1));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  if (err)
    return (
      <Panel title="Connection error">
        <p className="text-sm text-rose-300">{err}</p>
      </Panel>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Topic coverage</h1>
        <a href="/daily" className="text-sm text-brand hover:underline">← Tag topics on Daily</a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Unique topics" value={totalUnique} accent="#5b8cff" />
        <StatCard label="Total study touches" value={totalLogged} accent="#34d399" />
        <StatCard label="Repeated topics" value={repeats} sub="done 2+ times" accent="#fbbf24" />
        <StatCard label="Going stale" value={stale} sub="21+ days untouched" accent="#fb7185" />
      </div>

      {bySection.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {bySection.map(([s, n]) => (
            <span key={s} className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-sm text-slate-300">
              {s}: <span className="font-semibold text-brand">{n}</span>
            </span>
          ))}
        </div>
      )}

      <Panel
        title="All topics studied"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <input className="input h-8 w-44 py-1 text-sm" placeholder="Search topic…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="select h-8 w-32 py-1 text-sm" value={section} onChange={(e) => setSection(e.target.value)}>
              {sections.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="select h-8 w-36 py-1 text-sm" value={sort} onChange={(e) => setSort(e.target.value as any)}>
              <option value="recent">Most recent</option>
              <option value="stale">Most stale</option>
              <option value="count">Most repeated</option>
              <option value="az">A–Z</option>
            </select>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <Empty>No topics yet — tag what you study in each block on the Daily page.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Topic</th><th>Area</th><th>Times</th><th>First</th><th>Last</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const stale = r.daysAgo >= 21;
                  const repeat = r.count > 1;
                  return (
                    <tr key={`${r.section}-${r.name}`} className="border-t border-line hover:bg-panel2/50">
                      <td className="py-2 font-medium text-slate-200">{r.name}</td>
                      <td><span className="pill bg-panel2 text-slate-300">{r.section}</span></td>
                      <td className={repeat ? "font-semibold text-amber-300" : "text-slate-400"}>{r.count}{repeat ? " ↻" : ""}</td>
                      <td className="text-slate-500">{fmtDateShort(r.first)}</td>
                      <td className="text-slate-400">{fmtDateShort(r.last)}</td>
                      <td className="text-xs">
                        {stale ? <span className="text-rose-300">{r.daysAgo}d ago — revisit</span> : <span className="text-emerald-300">fresh</span>}
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
