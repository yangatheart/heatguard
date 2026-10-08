import type { DemoState } from "./store";
import type { RiskLevel, SolarExposure } from "./types";

export interface Analytics {
  weekly: { day: string; events: number }[];
  byHour: { hour: string; events: number }[];
  byTask: { task: string; events: number }[];
  byZone: { zone: string; events: number }[];
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

const countBy = (keys: string[]) => {
  const m = new Map<string, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
};

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

  // High/critical events per task and per zone; tasks with no events stay visible as a baseline.
  const perTask = countBy(alerts.map((a) => a.snapshot.task));
  const byTask = [...new Set([...perTask.keys(), ...state.tasks.map((t) => t.name)])]
    .map((task) => ({ task, events: perTask.get(task) ?? 0 }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 9);
  const byZone = [...countBy(alerts.map((a) => a.snapshot.zone)).entries()]
    .map(([zone, events]) => ({ zone, events }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 6);

  return {
    weekly,
    byHour,
    byTask,
    byZone,
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
  conditions: { temperature: number; humidity: number; wbgt: number; windKmh: number; solar: SolarExposure; weatherOnline: boolean };
  zonesMonitored: number;
  tasksMonitored: number;
  currentTasksByLevel: Record<RiskLevel, number>;
  highRiskZones: string[];
  todaysEvents: { time: string; zone: string; task: string; team: string; level: RiskLevel; trigger: string[]; intervention: string | null; status: string }[];
  peakWindowToday: string | null;
  topFactors: { factor: string; tasks: number }[];
  openAlerts: number;
  configuredMaxExposureMinutes: number;
  configuredBreakMinutes: number;
}
