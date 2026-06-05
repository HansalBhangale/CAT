"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { jget, jpost } from "@/lib/api";
import { Panel, StatCard } from "@/components/Ui";
import { todayStr } from "@/lib/utils";

type Mode = "focus" | "short" | "long";

interface Settings {
  focus: number; // minutes
  short: number;
  long: number;
  longEvery: number; // long break after N focus sessions
  autoStartNext: boolean;
  autoLog: boolean; // log completed focus sessions to today's daily log
  sound: boolean;
}

const DEFAULTS: Settings = { focus: 25, short: 5, long: 15, longEvery: 4, autoStartNext: true, autoLog: true, sound: true };

const MODE_META: Record<Mode, { label: string; color: string }> = {
  focus: { label: "Focus", color: "#5b8cff" },
  short: { label: "Short break", color: "#34d399" },
  long: { label: "Long break", color: "#fbbf24" },
};

const CATEGORIES = ["LR", "QA", "DI", "RC", "VA", "Mock analysis", "Revision", "Other"];
const SKEY = "pomodoro.settings.v1";
const STATE = "pomodoro.state.v1";

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
}

function beep(times = 2) {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    let t = ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.type = "sine";
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.start(t);
      o.stop(t + 0.36);
      t += 0.45;
    }
    setTimeout(() => ctx.close(), 1500);
  } catch {
    /* ignore */
  }
}

export default function TimerPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(DEFAULTS.focus * 60); // seconds
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0); // completed focus sessions this run
  const [category, setCategory] = useState("LR");
  const [today, setToday] = useState<{ pomodoros: number; focusMinutes: number }>({ pomodoros: 0, focusMinutes: 0 });
  const [hydrated, setHydrated] = useState(false);
  const tickRef = useRef<any>(null);
  const completingRef = useRef(false);
  const cycleDayRef = useRef(todayStr()); // the day the long-break cycle belongs to

  const durFor = useCallback((m: Mode, s: Settings) => (m === "focus" ? s.focus : m === "short" ? s.short : s.long) * 60, []);

  const refreshToday = useCallback(async () => {
    try {
      const d = await jget<any>(`/api/daily?date=${todayStr()}`);
      setToday({ pomodoros: d?.pomodoros || 0, focusMinutes: d?.focusMinutes || 0 });
    } catch {
      /* db not configured — ignore */
    }
  }, []);

  // hydrate from localStorage + DB on mount
  useEffect(() => {
    const s = loadLS<Settings>(SKEY, DEFAULTS);
    setSettings(s);
    const st = loadLS<any>(STATE, null as any);
    if (st && st.mode) {
      const sameDay = st.day === todayStr();
      setMode(st.mode);
      setCycle(sameDay ? st.cycle || 0 : 0); // reset the long-break cycle on a new day
      cycleDayRef.current = todayStr();
      setCategory(st.category || "LR");
      if (st.running && st.endsAt && st.endsAt > Date.now()) {
        setRunning(true);
        setEndsAt(st.endsAt);
        setRemaining(Math.round((st.endsAt - Date.now()) / 1000));
      } else {
        setRunning(false);
        setEndsAt(null);
        setRemaining(typeof st.remaining === "number" ? st.remaining : durFor(st.mode, s));
      }
    } else {
      setRemaining(durFor("focus", s));
    }
    setHydrated(true);
    refreshToday();
  }, [durFor, refreshToday]);

  // persist settings
  useEffect(() => {
    if (hydrated) localStorage.setItem(SKEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  // persist runtime state
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STATE, JSON.stringify({ mode, running, endsAt, remaining, cycle, category, day: cycleDayRef.current }));
  }, [mode, running, endsAt, remaining, cycle, category, hydrated]);

  const total = durFor(mode, settings);

  const goToNext = useCallback(
    (fromFocus: boolean, newCycle: number) => {
      let next: Mode;
      if (fromFocus) next = newCycle % settings.longEvery === 0 ? "long" : "short";
      else next = "focus";
      const dur = durFor(next, settings);
      setMode(next);
      setRemaining(dur);
      if (settings.autoStartNext) {
        setEndsAt(Date.now() + dur * 1000);
        setRunning(true);
      } else {
        setEndsAt(null);
        setRunning(false);
      }
    },
    [settings, durFor]
  );

  const handleComplete = useCallback(async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    if (settings.sound) beep(mode === "focus" ? 3 : 2);
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(MODE_META[mode].label + " complete", {
          body: mode === "focus" ? "Nice — take a break." : "Break over — back to focus.",
        });
      }
    } catch {}

    const wasFocus = mode === "focus";
    let newCycle = cycle;
    if (wasFocus) {
      const today = todayStr();
      // a focus session finishing on a new day restarts the long-break cycle
      newCycle = cycleDayRef.current === today ? cycle + 1 : 1;
      cycleDayRef.current = today;
      setCycle(newCycle);
      if (settings.autoLog) {
        try {
          await jpost("/api/daily/focus", { date: todayStr(), minutes: settings.focus });
          refreshToday();
        } catch {}
      } else {
        setToday((t) => ({ ...t })); // no-op
      }
    }
    goToNext(wasFocus, newCycle);
    setTimeout(() => (completingRef.current = false), 500);
  }, [mode, cycle, settings, goToNext, refreshToday]);

  // ticking
  useEffect(() => {
    if (!running || endsAt == null) return;
    tickRef.current = setInterval(() => {
      const left = Math.round((endsAt - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        clearInterval(tickRef.current);
        handleComplete();
      } else {
        setRemaining(left);
      }
    }, 250);
    return () => clearInterval(tickRef.current);
  }, [running, endsAt, handleComplete]);

  // document title
  useEffect(() => {
    if (!hydrated) return;
    const mm = String(Math.floor(Math.max(0, remaining) / 60)).padStart(2, "0");
    const ss = String(Math.max(0, remaining) % 60).padStart(2, "0");
    document.title = running ? `${mm}:${ss} · ${MODE_META[mode].label}` : "CAT 2026 Tracker";
    return () => {
      document.title = "CAT 2026 Tracker";
    };
  }, [remaining, running, mode, hydrated]);

  const start = () => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
    if (settings.sound) beep(1); // unlock audio on user gesture
    setEndsAt(Date.now() + remaining * 1000);
    setRunning(true);
  };
  const pause = () => {
    setRemaining(endsAt ? Math.max(0, Math.round((endsAt - Date.now()) / 1000)) : remaining);
    setEndsAt(null);
    setRunning(false);
  };
  const reset = () => {
    setRunning(false);
    setEndsAt(null);
    setRemaining(durFor(mode, settings));
  };
  const skip = () => {
    setRunning(false);
    setEndsAt(null);
    goToNext(mode === "focus", mode === "focus" ? cycle + (settings.autoLog ? 0 : 0) : cycle);
  };
  const switchMode = (m: Mode) => {
    setRunning(false);
    setEndsAt(null);
    setMode(m);
    setRemaining(durFor(m, settings));
  };

  const meta = MODE_META[mode];
  const R = 120;
  const C = 2 * Math.PI * R;
  const progress = total > 0 ? Math.min(1, (total - remaining) / total) : 0;
  const offset = C * (1 - progress);
  const mm = String(Math.floor(Math.max(0, remaining) / 60)).padStart(2, "0");
  const ss = String(Math.max(0, remaining) % 60).padStart(2, "0");

  const upd = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Focus today" value={today.pomodoros} sub="pomodoros" accent="#5b8cff" />
        <StatCard label="Focused minutes" value={today.focusMinutes} sub="logged to today" accent="#34d399" />
        <StatCard label="This run" value={cycle} sub="sessions completed" accent="#a78bfa" />
        <StatCard label="Until long break" value={Math.max(0, settings.longEvery - (cycle % settings.longEvery))} sub={`every ${settings.longEvery}`} accent="#fbbf24" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        {/* Timer */}
        <Panel>
          {/* mode tabs */}
          <div className="mb-5 flex justify-center gap-1">
            {(Object.keys(MODE_META) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${mode === m ? "text-white" : "bg-panel2 text-slate-300 hover:bg-panel"}`}
                style={mode === m ? { background: MODE_META[m].color } : {}}
              >
                {MODE_META[m].label}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center">
            <div className="relative" style={{ width: 280, height: 280 }}>
              <svg width={280} height={280} className="-rotate-90">
                <circle cx={140} cy={140} r={R} fill="none" stroke="#1e2740" strokeWidth={14} />
                <circle
                  cx={140}
                  cy={140}
                  r={R}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 0.3s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-6xl font-bold tabular-nums tracking-tight" style={{ color: meta.color }}>
                  {mm}:{ss}
                </div>
                <div className="mt-1 text-sm uppercase tracking-widest text-slate-400">{meta.label}</div>
                {mode === "focus" && <div className="mt-1 text-xs text-slate-500">focusing on {category}</div>}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              {!running ? (
                <button className="btn px-8 py-2.5 text-base" onClick={start}>▶ Start</button>
              ) : (
                <button className="btn px-8 py-2.5 text-base" onClick={pause}>⏸ Pause</button>
              )}
              <button className="btn-ghost" onClick={reset}>↺ Reset</button>
              <button className="btn-ghost" onClick={skip}>⏭ Skip</button>
            </div>

            {mode === "focus" && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-3 py-1 text-xs transition ${category === c ? "bg-brand text-white" : "bg-panel2 text-slate-300 hover:bg-panel"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Settings */}
        <Panel title="Settings">
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Focus (min)" value={settings.focus} onChange={(v) => upd({ focus: v })} />
            <NumField label="Short (min)" value={settings.short} onChange={(v) => upd({ short: v })} />
            <NumField label="Long (min)" value={settings.long} onChange={(v) => upd({ long: v })} />
          </div>
          <div className="mt-3">
            <NumField label="Long break every N focus sessions" value={settings.longEvery} onChange={(v) => upd({ longEvery: Math.max(1, v) })} />
          </div>
          <div className="mt-4 space-y-2">
            <Toggle label="Auto-start next interval" checked={settings.autoStartNext} onChange={(v) => upd({ autoStartNext: v })} />
            <Toggle label="Log completed focus sessions to today's Daily" checked={settings.autoLog} onChange={(v) => upd({ autoLog: v })} />
            <Toggle label="Sound on completion" checked={settings.sound} onChange={(v) => upd({ sound: v })} />
          </div>
          <div className="mt-4 flex gap-2">
            <button className="btn-ghost" onClick={() => { setSettings(DEFAULTS); switchMode("focus"); }}>Reset to 25/5/15</button>
          </div>
          <p className="mt-4 rounded-lg bg-panel2 p-3 text-xs text-slate-400">
            The timer keeps running even if you switch pages or reload — it tracks the real end time. With auto-log on, each
            finished focus block adds a pomodoro + its minutes to <span className="text-slate-300">today&apos;s</span> log
            (separate from your manually entered study hours, so nothing is double-counted).
          </p>
        </Panel>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type="number"
        min={1}
        className="input"
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.round(parseFloat(e.target.value) || 0)))}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2 text-left text-sm text-slate-200 hover:border-brand/60"
    >
      <span>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-brand" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
