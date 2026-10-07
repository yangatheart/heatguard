import type { DemoState } from "./store";
import type { RiskLevel } from "./types";

export interface Analytics {
  weekly: { day: string; events: number }[];
  byHour: { hour: string; events: number }[];
  byTask: { task: string; events: number; workers: number }[];
  alerts: number;
  confirmed: number;
  resolved: number;
  peakWindow: string | null;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 07:00–18:00

export function peakWindow(hours: number[]): string | null {
  if (hours.length === 0) return null;
  let best = -1;
  let start = 12;
  for (let h = 0; h <= 21; h++) {
    const n = hours.filter((x) => x >= h && x < h + 3).length;
    if (n > best) {
      best = n;
      start = h;
    }
  }
  const p = (n: number) => `${String(n).padStart(2, "0")}:00`;
  return `${p(start)}–${p(start + 3)}`;
}

export function computeAnalytics(state: DemoState): Analytics {
  const alerts = state.alerts;
  const today = new Date();
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const key = d.toDateString();
    return {
      day: i === 6 ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" }),
      events: alerts.filter((a) => new Date(a.created_at).toDateString() === key).length,
    };
  });

  const hours = alerts.map((a) => new Date(a.created_at).getHours());
  const byHour = HOURS.map((h) => ({ hour: `${String(h).padStart(2, "0")}:00`, events: hours.filter((x) => x === h).length }));

  // High/critical events per task this week; tasks with no events stay visible as a baseline.
  const workersPerTask = new Map<string, number>();
  for (const w of state.workers) workersPerTask.set(w.task, (workersPerTask.get(w.task) ?? 0) + 1);
  const eventsPerTask = new Map<string, number>();
  for (const a of alerts) eventsPerTask.set(a.snapshot.task, (eventsPerTask.get(a.snapshot.task) ?? 0) + 1);
  const byTask = [...new Set([...eventsPerTask.keys(), ...workersPerTask.keys()])]
    .map((task) => ({ task, events: eventsPerTask.get(task) ?? 0, workers: workersPerTask.get(task) ?? 0 }))
    .sort((a, b) => b.events - a.events || b.workers - a.workers)
    .slice(0, 9);

  return {
    weekly,
    byHour,
    byTask,
    alerts: alerts.length,
    confirmed: alerts.filter((a) => a.status === "confirmed" || a.status === "resolved" || a.status === "escalated").length,
    resolved: alerts.filter((a) => a.status === "resolved").length,
    peakWindow: peakWindow(hours),
  };
}

/** Structured facts for the daily report. The LLM only narrates these. */
export interface ReportFacts {
  date: string;
  site: string;
  conditions: { temperature: number; humidity: number; wbgt: number; solar: string; weatherOnline: boolean };
  workersMonitored: number;
  currentByLevel: Record<RiskLevel, number>;
  todaysEvents: { time: string; worker: string; task: string; level: RiskLevel; intervention: string | null; status: string }[];
  peakWindowToday: string | null;
  topFactors: { factor: string; workers: number }[];
  heartRateUnavailable: number;
  openAlerts: number;
  configuredMaxExposureMinutes: number;
  configuredBreakMinutes: number;
}
