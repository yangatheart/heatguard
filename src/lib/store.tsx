"use client";

/**
 * Client-side demo store. Holds the whole demo state, persists it to localStorage
 * and exposes the workflow actions (sense → understand → act → record).
 * In production these actions map to API routes backed by supabase/schema.sql.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SUPERVISOR, buildAlert, buildSeed } from "./demo-data";
import { DEFAULT_THRESHOLDS, assessTask, levelRank, type RiskResult, type Thresholds } from "./risk-engine";
import type { Alert, Intensity, Intervention, InterventionType, SafetyLogEntry, Site, Task, Worker, Zone } from "./types";

const STORAGE_KEY = "sitesafe-demo-v1";

export interface SiteConfig {
  coolingArea: string;
  hydrationAvailable: boolean;
  breakMinutes: number;
  maxContinuousExposure: number;
}

export interface AlertPrefs {
  teamLeadAlerts: boolean;
  supervisorAlerts: boolean;
  escalation: boolean;
  escalationMinutes: number;
}

export interface DemoState {
  sites: Site[];
  zones: Zone[];
  tasks: Task[];
  workers: Worker[];
  alerts: Alert[];
  interventions: Intervention[];
  log: SafetyLogEntry[];
  thresholds: Thresholds;
  siteConfig: SiteConfig;
  alertPrefs: AlertPrefs;
  currentSiteId: string;
  supervisor: string;
}

function initialState(): DemoState {
  const seed = buildSeed();
  return {
    ...seed,
    interventions: [],
    thresholds: { ...DEFAULT_THRESHOLDS },
    siteConfig: { coolingArea: "Tent B — north gate", hydrationAvailable: true, breakMinutes: 15, maxContinuousExposure: 60 },
    alertPrefs: { teamLeadAlerts: true, supervisorAlerts: true, escalation: true, escalationMinutes: 5 },
    currentSiteId: "madrid",
    supervisor: SUPERVISOR,
  };
}

export type ZonePatch = Partial<Pick<Zone, "temperature" | "humidity" | "wind_kmh" | "solar">>;
export type TaskPatch = Partial<Pick<Task, "intensity" | "exposure_minutes" | "ppe" | "shade" | "cooling" | "scenario_hour">>;

export interface ConfirmInput {
  alertId: string;
  actions: InterventionType[];
  supervisor: string;
  notes: string;
  mode: "confirm" | "escalate";
}

interface Ctx {
  state: DemoState | null;
  assess: (taskId: string) => RiskResult;
  setSite: (id: string) => void;
  simulate: (taskId: string, patch: { zone: ZonePatch; task: TaskPatch }) => { before: RiskResult; after: RiskResult; alert?: Alert };
  confirmIntervention: (input: ConfirmInput) => SafetyLogEntry;
  dismissAlert: (alertId: string, reason: string) => void;
  updateSettings: (patch: Partial<Pick<DemoState, "thresholds" | "siteConfig" | "alertPrefs" | "supervisor">>) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

const LIGHTER: Record<Intensity, Intensity> = { Heavy: "Moderate", Moderate: "Low", Low: "Low" };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);

  useEffect(() => {
    let loaded: DemoState | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw) as DemoState;
    } catch {
      loaded = null;
    }
    setState(loaded ?? initialState());
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — demo still works in memory */
    }
  }, [state]);

  const assessWith = useCallback((s: DemoState, taskId: string, task?: Task, zone?: Zone): RiskResult => {
    const t = task ?? s.tasks.find((x) => x.id === taskId)!;
    const z = zone ?? s.zones.find((x) => x.id === t.zone_id)!;
    return assessTask(t, z, s.thresholds);
  }, []);

  const assess = useCallback((taskId: string) => assessWith(state!, taskId), [state, assessWith]);

  const setSite = useCallback((id: string) => setState((s) => (s ? { ...s, currentSiteId: id } : s)), []);

  const simulate = useCallback<Ctx["simulate"]>(
    (taskId, patch) => {
      const s = state!;
      const prevTask = s.tasks.find((x) => x.id === taskId)!;
      const prevZone = s.zones.find((x) => x.id === prevTask.zone_id)!;
      const nowIso = new Date().toISOString();
      const task: Task = { ...prevTask, ...patch.task, updated_at: nowIso };
      const zone: Zone = { ...prevZone, ...patch.zone, updated_at: nowIso };
      const before = assessWith(s, taskId);
      const after = assessWith(s, taskId, task, zone);

      // One open alert per task: a HIGH/CRITICAL assessment re-raises the open alert
      // with the latest snapshot, or creates a new one. Alerts never auto-close —
      // only a supervisor can confirm, escalate or dismiss them.
      let alert: Alert | undefined;
      const open = s.alerts.find((a) => a.task_id === taskId && a.status === "active");
      if (levelRank(after.level) >= levelRank("HIGH")) {
        alert = buildAlert(task, zone, after, nowIso, open?.id ?? `al_${taskId}_${Date.now()}`);
      }

      setState((cur) => {
        if (!cur) return cur;
        const alerts = alert ? [alert, ...cur.alerts.filter((a) => a.id !== alert.id)] : cur.alerts;
        return {
          ...cur,
          zones: cur.zones.map((z) => (z.id === zone.id ? zone : z)),
          tasks: cur.tasks.map((t) => (t.id === taskId ? { ...task, status: alert ? "Active" : t.status } : t)),
          alerts,
        };
      });
      return { before, after, alert };
    },
    [state, assessWith],
  );

  const confirmIntervention = useCallback<Ctx["confirmIntervention"]>(
    ({ alertId, actions, supervisor, notes, mode }) => {
      const s = state!;
      const alert = s.alerts.find((a) => a.id === alertId)!;
      const task = s.tasks.find((x) => x.id === alert.task_id)!;
      const zone = s.zones.find((x) => x.id === task.zone_id)!;
      const nowIso = new Date().toISOString();
      const intervention: Intervention = {
        id: `iv_${Date.now()}`,
        alert_id: alertId,
        type: actions,
        confirmed_by: supervisor,
        confirmed_at: nowIso,
        notes,
      };
      const entry: SafetyLogEntry = {
        id: `log_${Date.now()}`,
        site_id: task.site_id,
        zone_id: zone.id,
        zone: zone.name,
        task_id: task.id,
        task: task.name,
        team: task.team,
        conditions: { temperature: alert.snapshot.temperature, humidity: alert.snapshot.humidity, wbgt: alert.snapshot.wbgt },
        risk_level: alert.severity,
        score: alert.snapshot.score,
        trigger: alert.trigger,
        recommended: alert.recommended,
        intervention: actions.join(" + ") || "No action recorded",
        resolution: mode === "escalate" ? "Escalated" : "Resolved",
        supervisor,
        notes: notes || undefined,
        timestamp: nowIso,
      };

      // Apply the confirmed actions to the task's operational inputs, then reassess.
      const next: Task = { ...task, updated_at: nowIso, status: actions.includes("Pause task") ? "Paused" : "Intervention in place" };
      if (actions.includes("Cooling/rest break") || actions.includes("Pause task")) next.exposure_minutes = 0;
      if (actions.includes("Move activity to shade")) next.shade = "Good";
      if (actions.includes("Work rotation")) next.intensity = LIGHTER[task.intensity];

      setState((cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          alerts: cur.alerts.map((a) => (a.id === alertId ? { ...a, status: mode === "escalate" ? "escalated" : "resolved" } : a)),
          interventions: [intervention, ...cur.interventions],
          log: [entry, ...cur.log],
          tasks: cur.tasks.map((t) => (t.id === task.id ? next : t)),
        };
      });
      return entry;
    },
    [state],
  );

  const dismissAlert = useCallback<Ctx["dismissAlert"]>(
    (alertId, reason) => {
      const s = state!;
      const alert = s.alerts.find((a) => a.id === alertId)!;
      const task = s.tasks.find((x) => x.id === alert.task_id)!;
      const entry: SafetyLogEntry = {
        id: `log_${Date.now()}`,
        site_id: task.site_id,
        zone_id: task.zone_id,
        zone: alert.snapshot.zone,
        task_id: task.id,
        task: task.name,
        team: task.team,
        conditions: { temperature: alert.snapshot.temperature, humidity: alert.snapshot.humidity, wbgt: alert.snapshot.wbgt },
        risk_level: alert.severity,
        score: alert.snapshot.score,
        trigger: alert.trigger,
        recommended: alert.recommended,
        intervention: "Supervisor override — alert dismissed",
        resolution: "Dismissed",
        supervisor: s.supervisor,
        notes: reason,
        timestamp: new Date().toISOString(),
      };
      setState((cur) =>
        cur
          ? { ...cur, alerts: cur.alerts.map((a) => (a.id === alertId ? { ...a, status: "dismissed" } : a)), log: [entry, ...cur.log] }
          : cur,
      );
    },
    [state],
  );

  const updateSettings = useCallback<Ctx["updateSettings"]>((patch) => setState((s) => (s ? { ...s, ...patch } : s)), []);

  const resetDemo = useCallback(() => {
    const fresh = initialState();
    setState((cur) => ({ ...fresh, currentSiteId: cur?.currentSiteId ?? "madrid" }));
  }, []);

  const value = useMemo(
    () => ({ state, assess, setSite, simulate, confirmIntervention, dismissAlert, updateSettings, resetDemo }),
    [state, assess, setSite, simulate, confirmIntervention, dismissAlert, updateSettings, resetDemo],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Convenience: state is guaranteed non-null inside <AppShell> once hydrated. */
export function useDemo() {
  const ctx = useStore();
  return { ...ctx, state: ctx.state! };
}

/** Derived site view used by the dashboard, sites page and report. */
export function siteSnapshot(state: DemoState, siteId: string, assess: (taskId: string) => RiskResult) {
  const zones = state.zones.filter((z) => z.site_id === siteId);
  const tasks = state.tasks
    .filter((t) => t.site_id === siteId)
    .map((task) => ({ task, zone: zones.find((z) => z.id === task.zone_id)!, risk: assess(task.id) }))
    .sort((a, b) => b.risk.score - a.risk.score);
  const zoneRows = zones
    .map((zone) => {
      const zt = tasks.filter((t) => t.zone.id === zone.id);
      const top = zt[0];
      return { zone, tasks: zt, level: top?.risk.level ?? "LOW", top };
    })
    .sort((a, b) => levelRank(b.level) - levelRank(a.level) || (b.top?.risk.score ?? 0) - (a.top?.risk.score ?? 0));
  const taskIds = new Set(tasks.map((t) => t.task.id));
  const activeAlerts = state.alerts.filter((a) => a.status === "active" && taskIds.has(a.task_id));
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const confirmedThisWeek = state.log.filter((e) => e.site_id === siteId && e.resolution !== "Dismissed" && new Date(e.timestamp) >= weekStart).length;
  return {
    zones: zoneRows,
    tasks,
    activeAlerts,
    highRiskZones: zoneRows.filter((z) => levelRank(z.level) >= 2),
    highRiskTasks: tasks.filter((t) => levelRank(t.risk.level) >= 2),
    recommended: [...new Set(activeAlerts.flatMap((a) => a.recommended))],
    confirmedThisWeek,
  };
}
