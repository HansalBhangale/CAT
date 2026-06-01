"use client";
import { Panel } from "@/components/Ui";
import {
  PHASES, DAILY_TEMPLATES, LR_SET_TYPES, DI_SET_TYPES, LR_MILESTONES, CALENDAR,
  MONTHLY_PERCENTILE_TARGET, SECTIONS, VOLUME_TARGETS,
} from "@/lib/planData";
import { phaseForDate, todayStr } from "@/lib/utils";

export default function PlanPage() {
  const currentPhase = phaseForDate(todayStr());

  return (
    <div className="space-y-5">
      <div className="card">
        <h1 className="text-xl font-bold">CAT 2026 — 6-Month Plan</h1>
        <p className="mt-1 text-sm text-slate-400">
          Target 99.9+ (north star 99.99). Daily budget 4h. Strengths: QA, DI, RC. Weakness: LR — and it lives inside DILR,
          your highest-leverage battleground. Exam expected <span className="text-brand">Sun 29 Nov 2026</span>.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {SECTIONS.map((s) => (
            <span key={s.key} className="rounded-lg border border-line bg-panel2 px-3 py-1.5" style={{ color: s.color }}>
              {s.label}: {s.q}Q · {s.marks}m · {s.time}min
            </span>
          ))}
        </div>
      </div>

      {/* Phases */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {PHASES.map((p) => (
          <div key={p.id} className={`card ${p.id === currentPhase ? "ring-2" : ""}`} style={{ borderColor: p.color + "66", ...(p.id === currentPhase ? { boxShadow: `0 0 0 2px ${p.color}66` } : {}) }}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold" style={{ color: p.color }}>{p.id}</span>
              {p.id === currentPhase && <span className="pill" style={{ background: p.color + "22", color: p.color }}>NOW</span>}
            </div>
            <div className="text-sm font-medium">{p.name}</div>
            <div className="text-xs text-slate-400">{p.calendar} · {p.weeks}</div>
            <p className="mt-2 text-xs text-slate-500">{p.theme}</p>
            <p className="mt-2 text-xs text-slate-400"><span className="text-slate-500">Mocks:</span> {p.mockCadence}</p>
          </div>
        ))}
      </div>

      {/* Daily templates */}
      <Panel title="Daily 4-hour template (by phase)">
        <div className="grid gap-4 lg:grid-cols-4">
          {PHASES.map((p) => (
            <div key={p.id}>
              <div className="mb-2 text-sm font-semibold" style={{ color: p.color }}>{p.id} · {p.calendar}</div>
              <div className="space-y-1.5">
                {DAILY_TEMPLATES[p.id].map((b) => (
                  <div key={b.name} className="rounded-lg border border-line bg-panel2 p-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-200">{b.name}</span>
                      <span className="text-slate-500">{b.min}m</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{b.what}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* LR set types */}
        <Panel title="LR set types — your rebuild list">
          <ol className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
            {LR_SET_TYPES.map((t, i) => (
              <li key={t} className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-slate-300">
                <span className="text-lr">{i + 1}.</span> {t}
              </li>
            ))}
          </ol>
          <div className="mt-3 text-sm font-semibold text-slate-300">DI set types to own</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {DI_SET_TYPES.map((t) => <span key={t} className="pill bg-dilr/20 text-dilr">{t}</span>)}
          </div>
        </Panel>

        {/* LR milestones */}
        <Panel title="LR progression milestones">
          <div className="space-y-2">
            {LR_MILESTONES.map((m) => (
              <div key={m.by} className="rounded-lg border border-line bg-panel2 p-2.5">
                <span className="pill bg-lr/20 text-lr">{m.by}</span>
                <p className="mt-1 text-sm text-slate-300">{m.state}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-line bg-panel2 p-3">
            <div className="text-sm font-semibold text-slate-300">Weekly volume targets</div>
            <table className="mt-2 w-full text-xs">
              <thead><tr className="text-slate-500"><th className="text-left">Phase</th><th>LR</th><th>DI</th><th>QA</th><th>RC</th><th>VA</th></tr></thead>
              <tbody>
                {Object.entries(VOLUME_TARGETS).map(([ph, v]) => (
                  <tr key={ph} className="border-t border-line text-slate-300">
                    <td className="py-1 text-left font-medium">{ph}</td><td className="text-center">{v.lr}</td><td className="text-center">{v.di}</td><td className="text-center">{v.qa}</td><td className="text-center">{v.rc}</td><td className="text-center">{v.va}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Month-by-month calendar */}
      <Panel title="Month-by-month calendar">
        <div className="space-y-2">
          {CALENDAR.map((c) => {
            const t = MONTHLY_PERCENTILE_TARGET.find((m) => m.month === c.month);
            return (
              <div key={c.month} className="rounded-xl border border-line bg-panel2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-brand">{c.month}</span>
                  <span className="text-xs text-slate-500">Wk {c.weeks}</span>
                  {t?.pct != null && <span className="pill bg-qa/20 text-qa">target {t.label}</span>}
                </div>
                <p className="mt-1 text-sm text-slate-300">{c.focus}</p>
                <p className="mt-1 text-xs text-slate-500">🎯 {c.milestone}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="card text-sm text-slate-400">
        <span className="font-semibold text-slate-200">The whole plan in one breath: </span>
        Fix LR because it's stapled to your DI strength inside DILR → keep QA/RC near-perfect with maintenance →
        analyze every mock 2–3× harder than you take it → track your trend, not single scores → protect sleep and taper →
        arrive ~29 Nov rested and sharp.
      </div>
    </div>
  );
}
