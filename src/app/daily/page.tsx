"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { jget, jpost } from "@/lib/api";
import { Panel, Tag } from "@/components/Ui";
import { DAILY_TEMPLATES, DAILY_HOURS_TARGET, PHASES, PLAN_START, blockTag } from "@/lib/planData";
import { todayStr, addDays, phaseForDate, fmtDate, fmtDateShort, weekNumberOf } from "@/lib/utils";

type Practice = { attempted: number; correct: number };
type Topic = { block: string; section: string; name: string };
interface DayState {
  date: string;
  phase: string;
  hoursActual: number;
  practice: Record<string, Practice>;
  rcPassages: number;
  vaDrills: number;
  lr: { setsDone: number; avgTimePerSet: number; accuracy: number };
  errorsLogged: number;
  errorsRevised: number;
  energy: number;
  sleepHours: number;
  blocksDone: string[];
  extraWork: ExtraWork[];
  topics: Topic[];
  notes: string;
}
type ExtraWork = { description: string; category: string; topic: string; minutes: number; attempted: number; correct: number };

const TAGS = ["QA", "RC", "VA", "DI", "LR"];
const EXTRA_CATS = ["QA", "RC", "VA", "DI", "LR", "Other"];
type HistInfo = { count: number; last: string; label: string };

function blank(date: string): DayState {
  return {
    date,
    phase: phaseForDate(date),
    hoursActual: 0,
    practice: Object.fromEntries(TAGS.map((t) => [t, { attempted: 0, correct: 0 }])),
    rcPassages: 0,
    vaDrills: 0,
    lr: { setsDone: 0, avgTimePerSet: 0, accuracy: 0 },
    errorsLogged: 0,
    errorsRevised: 0,
    energy: 3,
    sleepHours: 7,
    blocksDone: [],
    extraWork: [],
    topics: [],
    notes: "",
  };
}

function num(v: string) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export default function DailyPage() {
  const [date, setDate] = useState(todayStr());
  const [day, setDay] = useState<DayState>(blank(todayStr()));
  const [saved, setSaved] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");
  const [focus, setFocus] = useState<{ pomodoros: number; focusMinutes: number }>({ pomodoros: 0, focusMinutes: 0 });
  const [history, setHistory] = useState<{ section: string; name: string; date: string }[]>([]);

  const load = useCallback(async (d: string) => {
    try {
      const data = await jget<DayState | null>(`/api/daily?date=${d}`);
      if (data) {
        const practice = Object.fromEntries(TAGS.map((t) => [t, data.practice?.[t] || { attempted: 0, correct: 0 }]));
        setDay({ ...blank(d), ...data, practice, topics: data.topics || [] });
        setFocus({ pomodoros: (data as any).pomodoros || 0, focusMinutes: (data as any).focusMinutes || 0 });
      } else {
        setDay(blank(d));
        setFocus({ pomodoros: 0, focusMinutes: 0 });
      }
    } catch (e: any) {
      setMsg(e.message);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const logs = await jget<DayState[]>(`/api/daily?from=${PLAN_START}`);
      const flat: { section: string; name: string; date: string }[] = [];
      for (const l of logs) {
        for (const t of l.topics || []) flat.push({ section: t.section, name: t.name, date: l.date });
        for (const e of (l as any).extraWork || [])
          if (e.topic) flat.push({ section: e.category, name: e.topic, date: l.date });
      }
      setHistory(flat);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // section -> (lowercased name -> {count, last, label}); excludes the day currently being edited
  const index = useMemo(() => {
    const idx: Record<string, Record<string, HistInfo>> = {};
    for (const h of history) {
      if (h.date === date) continue;
      const sec = (idx[h.section] = idx[h.section] || {});
      const key = h.name.trim().toLowerCase();
      if (!key) continue;
      const cur = sec[key];
      if (cur) {
        cur.count++;
        if (h.date > cur.last) cur.last = h.date;
      } else {
        sec[key] = { count: 1, last: h.date, label: h.name.trim() };
      }
    }
    return idx;
  }, [history, date]);

  const suggestionsFor = useCallback(
    (section: string) => Object.values(index[section] || {}).map((i) => i.label).sort(),
    [index]
  );
  const histFor = useCallback(
    (section: string, name: string): HistInfo | null => index[section]?.[name.trim().toLowerCase()] || null,
    [index]
  );

  const set = (patch: Partial<DayState>) => setDay((d) => ({ ...d, ...patch }));
  const setPractice = (tag: string, field: "attempted" | "correct", v: number) =>
    setDay((d) => ({ ...d, practice: { ...d.practice, [tag]: { ...d.practice[tag], [field]: v } } }));

  const toggleBlock = (name: string) =>
    setDay((d) => ({
      ...d,
      blocksDone: d.blocksDone.includes(name) ? d.blocksDone.filter((b) => b !== name) : [...d.blocksDone, name],
    }));

  const addTopic = (block: string, section: string, name: string) => {
    const n = name.trim();
    if (!n) return;
    setDay((d) => {
      if (d.topics.some((t) => t.block === block && t.name.toLowerCase() === n.toLowerCase())) return d;
      return { ...d, topics: [...d.topics, { block, section, name: n }] };
    });
  };
  const removeTopic = (i: number) => setDay((d) => ({ ...d, topics: d.topics.filter((_, idx) => idx !== i) }));

  const addExtra = () =>
    setDay((d) => ({
      ...d,
      extraWork: [...d.extraWork, { description: "", category: "QA", topic: "", minutes: 30, attempted: 0, correct: 0 }],
    }));
  const updExtra = (i: number, patch: any) =>
    setDay((d) => ({ ...d, extraWork: d.extraWork.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) }));
  const delExtra = (i: number) => setDay((d) => ({ ...d, extraWork: d.extraWork.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaved("saving");
    try {
      await jpost("/api/daily", { ...day, phase: phaseForDate(day.date) });
      setSaved("ok");
      await loadHistory();
      setTimeout(() => setSaved("idle"), 1500);
    } catch (e: any) {
      setSaved("err");
      setMsg(e.message);
    }
  };

  const phase = PHASES.find((p) => p.id === phaseForDate(date))!;
  const template = DAILY_TEMPLATES[phase.id];
  const extraMin = day.extraWork.reduce((s, e) => s + (e.minutes || 0), 0);
  const uniqueSections = Array.from(new Set([...template.map((b) => blockTag(b.name)), ...EXTRA_CATS]));
  const extraQ = day.extraWork.reduce((s, e) => s + (e.attempted || 0), 0);

  return (
    <div className="space-y-5">
      {/* shared datalists for topic autocomplete (one per area) */}
      {uniqueSections.map((sec) => (
        <datalist key={sec} id={`topics-${sec}`}>
          {suggestionsFor(sec).map((n) => <option key={n} value={n} />)}
        </datalist>
      ))}

      {/* Date nav */}
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => setDate(addDays(date, -1))}>←</button>
          <input type="date" className="input w-44" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn-ghost" onClick={() => setDate(addDays(date, 1))}>→</button>
          <button className="btn-ghost" onClick={() => setDate(todayStr())}>Today</button>
        </div>
        <div className="text-sm text-slate-400">
          {fmtDate(date)} · Week {weekNumberOf(date)} ·{" "}
          <span style={{ color: phase.color }}>{phase.id} {phase.name}</span>
          {focus.pomodoros > 0 && (
            <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">
              🍅 {focus.pomodoros} focus · {focus.focusMinutes}m
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-rose-300">{msg}</span>}
          <button className="btn" onClick={save} disabled={saved === "saving"}>
            {saved === "saving" ? "Saving…" : saved === "ok" ? "Saved ✓" : "Save day"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Plan blocks + topics */}
        <Panel title={`${phase.id} daily template — topics covered`}>
          <div className="space-y-2">
            {template.map((b) => {
              const done = day.blocksDone.includes(b.name);
              const section = blockTag(b.name);
              const blockTopics = day.topics.map((t, i) => ({ t, i })).filter((x) => x.t.block === b.name);
              return (
                <div key={b.name} className={`rounded-xl border transition ${done ? "border-brand/70 bg-brand/10" : "border-line bg-panel2"}`}>
                  <div className="cursor-pointer px-3 py-2" onClick={() => toggleBlock(b.name)}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${done ? "text-brand" : "text-slate-200"}`}>
                        {done ? "✓ " : "○ "}{b.name}
                      </span>
                      <span className="text-xs text-slate-400">{b.min}m</span>
                    </div>
                    <div className="text-xs text-slate-500">{b.what}</div>
                  </div>
                  <div className="border-t border-line/60 px-3 py-2">
                    <TopicEditor
                      section={section}
                      topics={blockTopics}
                      onAdd={(name) => addTopic(b.name, section, name)}
                      onRemove={removeTopic}
                      histFor={histFor}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>{day.blocksDone.length}/{template.length} blocks · {day.topics.length} topics today</span>
            <a href="/topics" className="text-brand hover:underline">Full coverage →</a>
          </div>
        </Panel>

        {/* Core numbers */}
        <Panel title="Core metrics">
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Hours studied (target ${DAILY_HOURS_TARGET})`}>
              <input type="number" step="0.25" className="input" value={day.hoursActual}
                onChange={(e) => set({ hoursActual: num(e.target.value) })} />
            </Field>
            <Field label="Sleep last night (h)">
              <input type="number" step="0.5" className="input" value={day.sleepHours}
                onChange={(e) => set({ sleepHours: num(e.target.value) })} />
            </Field>
            <Field label="Energy / focus (1-5)">
              <input type="number" min={1} max={5} className="input" value={day.energy}
                onChange={(e) => set({ energy: num(e.target.value) })} />
            </Field>
            <Field label="RC passages">
              <input type="number" className="input" value={day.rcPassages}
                onChange={(e) => set({ rcPassages: num(e.target.value) })} />
            </Field>
            <Field label="VA drills">
              <input type="number" className="input" value={day.vaDrills}
                onChange={(e) => set({ vaDrills: num(e.target.value) })} />
            </Field>
            <Field label="New errors logged">
              <input type="number" className="input" value={day.errorsLogged}
                onChange={(e) => set({ errorsLogged: num(e.target.value) })} />
            </Field>
            <Field label="Old errors revised">
              <input type="number" className="input" value={day.errorsRevised}
                onChange={(e) => set({ errorsRevised: num(e.target.value) })} />
            </Field>
          </div>
        </Panel>

        {/* LR focus block */}
        <Panel title="LR — the centerpiece">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Sets done">
              <input type="number" className="input" value={day.lr.setsDone}
                onChange={(e) => set({ lr: { ...day.lr, setsDone: num(e.target.value) } })} />
            </Field>
            <Field label="Avg min/set">
              <input type="number" step="0.5" className="input" value={day.lr.avgTimePerSet}
                onChange={(e) => set({ lr: { ...day.lr, avgTimePerSet: num(e.target.value) } })} />
            </Field>
            <Field label="Accuracy %">
              <input type="number" className="input" value={day.lr.accuracy}
                onChange={(e) => set({ lr: { ...day.lr, accuracy: num(e.target.value) } })} />
            </Field>
          </div>
          <p className="mt-3 rounded-lg bg-panel2 p-2 text-xs text-slate-400">
            Daily ritual: 2–3 sets, reviewed. Drive min/set toward 10–12. Tag every miss in the Error Log.
          </p>
        </Panel>
      </div>

      {/* Practice by area */}
      <Panel title="Questions attempted & correct, by area">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TAGS.map((t) => {
            const p = day.practice[t];
            const a = p.attempted ? Math.round((p.correct / p.attempted) * 100) : 0;
            return (
              <div key={t} className="rounded-xl border border-line bg-panel2 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Tag>{t}</Tag>
                  <span className="text-xs text-slate-400">{a}%</span>
                </div>
                <label className="label">Attempted</label>
                <input type="number" className="input mb-2" value={p.attempted}
                  onChange={(e) => setPractice(t, "attempted", num(e.target.value))} />
                <label className="label">Correct</label>
                <input type="number" className="input" value={p.correct}
                  onChange={(e) => setPractice(t, "correct", num(e.target.value))} />
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Extra work beyond plan */}
      <Panel
        title="Extra work — beyond the plan"
        right={
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">+{extraMin}m · {extraQ} Q/sets</span>
            <button className="btn-ghost" onClick={addExtra}>+ Add</button>
          </div>
        }
      >
        <p className="mb-3 text-xs text-slate-500">
          Anything you did outside the planned blocks. It rolls into the same area accuracy, LR-set counts and topic tracker as your planned work — so nothing is tracked separately.
        </p>
        {day.extraWork.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing extra logged yet.</p>
        ) : (
          <div className="space-y-2">
            {day.extraWork.map((e, i) => {
              const a = e.attempted ? Math.round((e.correct / e.attempted) * 100) : 0;
              const unit = e.category === "LR" || e.category === "DI" ? "Sets" : "Questions";
              return (
                <div key={i} className="rounded-xl border border-line bg-panel2 p-3">
                  <div className="grid items-end gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <label className="label">What did you do?</label>
                      <input className="input" placeholder="e.g. Arun Sharma TSD set" value={e.description}
                        onChange={(ev) => updExtra(i, { description: ev.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Area</label>
                      <select className="select" value={e.category} onChange={(ev) => updExtra(i, { category: ev.target.value })}>
                        {EXTRA_CATS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Topic</label>
                      <input className="input" list={`topics-${e.category}`} placeholder="topic" value={e.topic}
                        onChange={(ev) => updExtra(i, { topic: ev.target.value })} />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="label">{unit}</label>
                      <input type="number" className="input" value={e.attempted}
                        onChange={(ev) => updExtra(i, { attempted: num(ev.target.value) })} />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="label">Correct</label>
                      <input type="number" className="input" value={e.correct}
                        onChange={(ev) => updExtra(i, { correct: num(ev.target.value) })} />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="label">Minutes</label>
                      <input type="number" className="input" value={e.minutes}
                        onChange={(ev) => updExtra(i, { minutes: num(ev.target.value) })} />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button className="btn-danger" onClick={() => delExtra(i)}>Remove</button>
                    </div>
                  </div>
                  <div className="mt-1.5 text-xs text-slate-500">
                    {e.attempted > 0 && <span className="mr-3">Accuracy {a}%</span>}
                    {e.topic && (() => {
                      const seen = histFor(e.category, e.topic);
                      return seen ? <span className="text-amber-300">↻ Already studied {seen.count}× · last {fmtDateShort(seen.last)}</span> : null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Notes */}
      <Panel title="Notes / one-line takeaway">
        <textarea className="textarea h-24" placeholder="What worked, what to fix tomorrow…"
          value={day.notes} onChange={(e) => set({ notes: e.target.value })} />
        <div className="mt-3 flex justify-end">
          <button className="btn" onClick={save} disabled={saved === "saving"}>
            {saved === "saving" ? "Saving…" : saved === "ok" ? "Saved ✓" : "Save day"}
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function TopicEditor({
  section,
  topics,
  onAdd,
  onRemove,
  histFor,
}: {
  section: string;
  topics: { t: Topic; i: number }[];
  onAdd: (name: string) => void;
  onRemove: (i: number) => void;
  histFor: (section: string, name: string) => HistInfo | null;
}) {
  const [val, setVal] = useState("");
  const warn = val.trim() ? histFor(section, val) : null;
  const commit = () => {
    onAdd(val);
    setVal("");
  };
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {topics.length === 0 && <span className="text-xs text-slate-500">No topic tagged yet</span>}
        {topics.map(({ t, i }) => {
          const seen = histFor(section, t.name);
          return (
            <span
              key={i}
              className={`pill flex items-center gap-1 ${seen ? "bg-amber-400/15 text-amber-300" : "bg-brand/15 text-brand"}`}
              title={seen ? `Repeat — done ${seen.count}× before · last ${fmtDateShort(seen.last)}` : "New topic"}
            >
              {seen ? "↻ " : ""}{t.name}
              <button className="ml-0.5 text-slate-400 hover:text-rose-300" onClick={() => onRemove(i)}>×</button>
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          className="input h-8 py-1 text-xs"
          list={`topics-${section}`}
          placeholder={`Add ${section} topic…`}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <button className="btn-ghost h-8 px-2 py-1 text-xs" onClick={commit}>+ Add</button>
      </div>
      {warn && (
        <div className="mt-1 text-[11px] text-amber-300">
          ↻ Already studied {warn.count}× · last {fmtDateShort(warn.last)}
        </div>
      )}
    </div>
  );
}
