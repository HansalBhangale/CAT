"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { daysToExam } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/daily", label: "Daily" },
  { href: "/timer", label: "Timer" },
  { href: "/topics", label: "Topics" },
  { href: "/mocks", label: "Mocks" },
  { href: "/errors", label: "Error Log" },
  { href: "/weekly", label: "Weekly" },
  { href: "/monthly", label: "Monthly" },
  { href: "/plan", label: "Plan" },
];

const MODE_COLOR: Record<string, string> = { focus: "#5b8cff", short: "#34d399", long: "#fbbf24" };
const MODE_LABEL: Record<string, string> = { focus: "Focus", short: "Break", long: "Long break" };

// Live mini-timer that reads the Pomodoro state from localStorage and ticks on every page.
function TimerChip() {
  const [chip, setChip] = useState<{ running: boolean; mode: string; remaining: number } | null>(null);

  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("pomodoro.state.v1");
        if (!raw) return setChip(null);
        const st = JSON.parse(raw);
        if (st.running && st.endsAt) {
          const left = Math.max(0, Math.round((st.endsAt - Date.now()) / 1000));
          setChip({ running: true, mode: st.mode, remaining: left });
        } else if (typeof st.remaining === "number" && st.mode) {
          setChip({ running: false, mode: st.mode, remaining: st.remaining });
        } else {
          setChip(null);
        }
      } catch {
        setChip(null);
      }
    };
    read();
    const id = setInterval(read, 500);
    return () => clearInterval(id);
  }, []);

  if (!chip) return null;
  const color = MODE_COLOR[chip.mode] || "#5b8cff";
  const mm = String(Math.floor(chip.remaining / 60)).padStart(2, "0");
  const ss = String(chip.remaining % 60).padStart(2, "0");
  return (
    <Link
      href="/timer"
      className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm tabular-nums"
      style={{ borderColor: color + "66", background: color + "1a" }}
      title={`${MODE_LABEL[chip.mode] || "Timer"} — ${chip.running ? "running" : "paused"}`}
    >
      <span className={`h-2 w-2 rounded-full ${chip.running ? "animate-pulse" : ""}`} style={{ background: color }} />
      <span className="font-semibold" style={{ color }}>{mm}:{ss}</span>
      <span className="hidden text-xs text-slate-400 sm:inline">{MODE_LABEL[chip.mode]}</span>
    </Link>
  );
}

export default function Nav() {
  const path = usePathname();
  const d = daysToExam();
  return (
    <header className="sticky top-3 z-20">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel/80 px-3 py-2 backdrop-blur">
        <Link href="/" className="mr-2 flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-xs font-bold text-white">CAT</span>
          <span className="hidden sm:inline">2026 Tracker</span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {links.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  active ? "bg-brand text-white" : "text-slate-300 hover:bg-panel2"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <TimerChip />
        <div className="rounded-lg border border-line bg-panel2 px-3 py-1.5 text-sm">
          <span className="text-slate-400">Exam in </span>
          <span className="font-semibold text-brand">{d}d</span>
        </div>
      </div>
    </header>
  );
}
