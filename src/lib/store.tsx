"use client";

/**
 * Client-side demo store. Holds the whole demo state, persists it to localStorage
 * and exposes the workflow actions (simulate → alert → intervene → log).
 * In production these actions map to API routes backed by supabase/schema.sql.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COOLING_AREA, SUPERVISOR, buildSeed } from "./demo-data";
import {
  DEFAULT_THRESHOLDS,
  assessRisk,
  estimateWbgt,
  levelRank,
  recommendedActions,
  type RiskResult,
  type Thresholds,
} from "./risk-engine";
import type {
  Alert,
  Intervention,
  InterventionType,
  SafetyLogEntry,
  SensorReading,
  Site,
  Worker,
} from "./types";

const STORAGE_KEY = "heatguard-demo-v1";

export interface SiteConfig {
  coolingArea: string;
  hydrationAvailable: boolean;
  breakMinutes: number;
  maxContinuousExposure: number;
}

export interface AlertPrefs {
  workerAlerts: boolean;
  supervisorAlerts: boolean;
  escalation: boolean;
  escalationMinutes: number;
}

export interface DemoState {
  sites: Site[];
  workers: Worker[];
  readings: Record<string, SensorReading>;
  alerts: Alert[];
  interventions: Intervention[];
  log: SafetyLogEntry[];
  thresholds: Thresholds;
  siteConfig: SiteConfig;
  alertPrefs: AlertPrefs;
  wearablesEnabled: boolean;
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
    alertPrefs: { workerAlerts: true, supervisorAlerts: true, escalation: true, escalationMinutes: 5 },
    wearablesEnabled: true,
    currentSiteId: "madrid",
    supervisor: SUPERVISOR,
  };
}

export type ReadingPatch = Partial<
  Pick<SensorReading, "temperature" | "humidity" | "heart_rate" | "activity_level" | "exposure_minutes" | "shade_available" | "ppe_level" | "solar">
>;

export interface ConfirmInput {
  alertId: string;
  actions: InterventionType[];
  supervisor: string;
  notes: string;
  mode: "confirm" | "escalate";
}

interface Ctx {
  state: DemoState | null;
  assess: (workerId: string) => RiskResult;
  setSite: (id: string) => void;
  simulate: (workerId: string, patch: ReadingPatch) => { before: RiskResult; after: RiskResult; alert?: Alert };
  confirmIntervention: (input: ConfirmInput) => SafetyLogEntry;
  dismissAlert: (alertId: string, reason: string) => void;
  updateSettings: (patch: Partial<Pick<DemoState, "thresholds" | "siteConfig" | "alertPrefs" | "wearablesEnabled" | "supervisor">>) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<Ctx | null>(null);

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

  const assessWith = useCallback((s: DemoState, workerId: string, reading?: SensorReading): RiskResult => {
    const w = s.workers.find((x) => x.id === workerId)!;
    const r = reading ?? s.readings[workerId];
    const hr = s.wearablesEnabled ? r.heart_rate : null;
    return assessRisk({ ...r, heart_rate: hr, baseline_heart_rate: w.baseline_heart_rate }, s.thresholds);
  }, []);

  const assess = useCallback((workerId: string) => assessWith(state!, workerId), [state, assessWith]);

  const setSite = useCallback((id: string) => setState((s) => (s ? { ...s, currentSiteId: id } : s)), []);

  const simulate = useCallback<Ctx["simulate"]>(
    (workerId, patch) => {
      const s = state!;
      const w = s.workers.find((x) => x.id === workerId)!;
      const prev = s.readings[workerId];
      const nowIso = new Date().toISOString();
      const next: SensorReading = { ...prev, ...patch, timestamp: nowIso };
      next.wbgt = estimateWbgt(next.temperature, next.humidity);
      const before = assessWith(s, workerId);
      const after = assessWith(s, workerId, next);

      // One open alert per worker: a HIGH/CRITICAL reading re-raises the open alert
      // with the latest snapshot, or creates a new one. Alerts never auto-close —
      // only a supervisor can confirm, escalate or dismiss them.
      let alert: Alert | undefined;
      const open = s.alerts.find((a) => a.worker_id === workerId && a.status === "active");
      if (levelRank(after.level) >= levelRank("HIGH")) {
        alert = {
          id: open?.id ?? `al_${workerId}_${Date.now()}`,
          worker_id: workerId,
          risk_assessment_id: `ra_${workerId}_${Date.now()}`,
          severity: after.level,
          message: `${after.level === "CRITICAL" ? "Critical" : "High"} heat risk detected`,
          status: "active",
          created_at: nowIso,
          recommended: recommendedActions(after.level, after.factors),
          snapshot: { temperature: next.temperature, humidity: next.humidity, exposure: next.exposure_minutes, task: w.task, score: after.score },
        };
      }

      setState((cur) => {
        if (!cur) return cur;
        const alerts = alert ? [alert, ...cur.alerts.filter((a) => a.id !== alert.id)] : cur.alerts;
        return {
          ...cur,
          readings: { ...cur.readings, [workerId]: next },
          workers: cur.workers.map((x) => (x.id === workerId && x.status !== "Working" && levelRank(after.level) >= 2 ? { ...x, status: "Working" } : x)),
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
      const w = s.workers.find((x) => x.id === alert.worker_id)!;
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
        worker_id: w.id,
        worker_name: w.name,
        site_id: w.site_id,
        task: w.task,
        risk_level: alert.severity,
        score: alert.snapshot.score,
        intervention: actions.join(" + ") || "No action recorded",
        resolution: mode === "escalate" ? "Escalated" : "Resolved",
        supervisor,
        notes: notes || undefined,
        timestamp: nowIso,
      };
      const takesBreak = actions.some((a) => a === "Cooling break" || a === "Move to shade");

      setState((cur) => {
        if (!cur) return cur;
        const prev = cur.readings[w.id];
        // Recovery break: reassess the worker against cooling-area conditions.
        const reading: SensorReading = takesBreak
          ? {
              ...prev,
              ...COOLING_AREA,
              wbgt: estimateWbgt(COOLING_AREA.temperature, COOLING_AREA.humidity),
              activity_level: "Low",
              exposure_minutes: 0,
              shade_available: "Good",
              timestamp: nowIso,
            }
          : prev;
        return {
          ...cur,
          alerts: cur.alerts.map((a) => (a.id === alertId ? { ...a, status: mode === "escalate" ? "escalated" : "resolved" } : a)),
          interventions: [intervention, ...cur.interventions],
          log: [entry, ...cur.log],
          readings: { ...cur.readings, [w.id]: reading },
          workers: cur.workers.map((x) =>
            x.id === w.id ? { ...x, status: takesBreak ? "Cooling down" : actions.includes("Work rotation") ? "Working" : x.status } : x,
          ),
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
      const w = s.workers.find((x) => x.id === alert.worker_id)!;
      const entry: SafetyLogEntry = {
        id: `log_${Date.now()}`,
        worker_id: w.id,
        worker_name: w.name,
        site_id: w.site_id,
        task: w.task,
        risk_level: alert.severity,
        score: alert.snapshot.score,
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
