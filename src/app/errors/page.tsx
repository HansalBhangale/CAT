"use client";
import { useEffect, useMemo, useState } from "react";
import { jget, jpost, jdelete } from "@/lib/api";
import { Panel, Empty, StatCard, Tag } from "@/components/Ui";
import { ErrLog } from "@/lib/compute";
import { ERROR_CAUSES, SECTION_TAGS, LR_SET_TYPES, SPACED_DAYS } from "@/lib/planData";
import { todayStr, fmtDateShort } from "@/lib/utils";

function emptyErr() {
  return { date: todayStr(), source: "", section: "LR", topic: "", cause: "wrong representation", description: "", lrSetType: "" };
}

const FILTERS = ["due", "open", "resolved", "all"] as const;

export default function ErrorsPage() {
  const [errors, setErrors] = useState<ErrLog[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("open");
  const [form, setForm] = useState<any>(emptyErr());
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      setErrors(await jget<ErrLog[]>("/api/errors"));
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const today = todayStr();
  const filtered = useMemo(() => {
    let list = errors;
    if (filter === "open") list = errors.filter((e) => e.status === "open");
    else if (filter === "resolved") list = errors.filter((e) => e.status === "resolved");
    else if (filter === "due") list = errors.filter((e) => e.status === "open" && e.nextReview && e.nextReview <= today);
    return list;
  }, [errors, filter, today]);

  const open = errors.filter((e) => e.status === "open").length;
  const resolved = errors.filter((e) => e.status === "resolved").length;
  const due = errors.filter((e) => e.status === "open" && e.nextReview && e.nextReview <= today).length;

  const add = async () => {
    if (!form.description && !form.topic) {
      setMsg("Add a topic or description");
      return;
    }
    try {
      await jpost("/api/errors", form);
      setForm(emptyErr());
      setShow(false);
      setMsg("");
      await load();
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  const act = async (id: string, action: string) => {
    await jpost(`/api/errors/${id}`, { action }, "PUT");
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this error?")) return;
    await jdelete(`/api/errors/${id}`);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Master error log</h1>
        <button className="btn" onClick={() => setShow((s) => !s)}>{show ? "Close" : "+ Log error"}</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Open" value={open} accent="#fbbf24" />
        <StatCard label="Due to review" value={due} sub="spaced repetition" accent="#fb7185" />
        <StatCard label="Resolved" value={resolved} sub="graduated out" accent="#34d399" />
      </div>

      {show && (
        <Panel title="Log an error">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="label">Source (mock / practice)</label><input className="input" placeholder="SimCAT 03" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
            <div><label className="label">Section</label>
              <select className="select" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
                {SECTION_TAGS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">Topic</label><input className="input" placeholder="Time-Speed-Distance" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
            <div><label className="label">Cause</label>
              <select className="select" value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })}>
                {ERROR_CAUSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            {form.section === "LR" && (
              <div><label className="label">LR set type</label>
                <select className="select" value={form.lrSetType} onChange={(e) => setForm({ ...form, lrSetType: e.target.value })}>
                  <option value="">—</option>
                  {LR_SET_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="mt-3"><label className="label">What went wrong & the correct approach</label>
            <textarea className="textarea h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            {msg && <span className="text-xs text-rose-300">{msg}</span>}
            <span className="text-xs text-slate-500">Auto-schedules reviews at day {SPACED_DAYS.join(", ")}.</span>
            <button className="btn" onClick={add}>Save error</button>
          </div>
        </Panel>
      )}

      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${filter === f ? "bg-brand text-white" : "bg-panel2 text-slate-300 hover:bg-panel"}`}>
            {f}{f === "due" && due > 0 ? ` (${due})` : ""}
          </button>
        ))}
      </div>

      <Panel>
        {filtered.length === 0 ? (
          <Empty>{filter === "due" ? "Nothing due — you're caught up on reviews 🎉" : "No errors here."}</Empty>
        ) : (
          <div className="space-y-2">
            {filtered.map((e) => {
              const isDue = e.status === "open" && e.nextReview && e.nextReview <= today;
              return (
                <div key={e._id} className={`rounded-xl border p-3 ${isDue ? "border-rose-500/40 bg-rose-500/5" : "border-line bg-panel2"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag>{e.section}</Tag>
                    <span className="pill bg-panel text-slate-300">{e.cause}</span>
                    {e.topic && <span className="text-sm font-medium text-slate-200">{e.topic}</span>}
                    {e.lrSetType && <span className="text-xs text-lr">· {e.lrSetType}</span>}
                    <span className="ml-auto text-xs text-slate-500">
                      {fmtDateShort(e.date)}{e.source && ` · ${e.source}`}
                    </span>
                  </div>
                  {e.description && <p className="mt-1.5 text-sm text-slate-400">{e.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500">
                      Reviews: {e.reviewsDone}/{SPACED_DAYS.length}
                      {e.status === "open" && e.nextReview && ` · next ${fmtDateShort(e.nextReview)}`}
                      {e.status === "resolved" && " · resolved ✓"}
                    </span>
                    <div className="ml-auto flex gap-1">
                      {e.status === "open" && <button className="btn-ghost px-2 py-1 text-xs" onClick={() => act(e._id, "review")}>Reviewed ✓</button>}
                      {e.status === "open"
                        ? <button className="btn-ghost px-2 py-1 text-xs" onClick={() => act(e._id, "resolve")}>Resolve</button>
                        : <button className="btn-ghost px-2 py-1 text-xs" onClick={() => act(e._id, "reopen")}>Reopen</button>}
                      <button className="btn-danger" onClick={() => remove(e._id)}>Del</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
