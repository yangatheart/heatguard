"use client";

/**
 * The central SiteSafe SI workflow (Sense → Understand → Act → Record):
 * Risk detected → Alert sent → Intervention confirmed → Record created.
 * A single modal driven by context so any screen can open it for an alert.
 */
import {
  ArrowRight,
  Bell,
  Check,
  CircleCheck,
  ClipboardCheck,
  Droplets,
  Gauge,
  Pause,
  ShieldAlert,
  Siren,
  Sun,
  Thermometer,
  Timer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { hhmm, relativeTime, cx, workLabel } from "@/lib/format";
import { RECOMMENDATION_LABEL } from "@/lib/risk-engine";
import { useDemo } from "@/lib/store";
import type { Alert, InterventionType, SafetyLogEntry } from "@/lib/types";
import { Button, Modal, RiskBadge } from "./ui";

type Mode = "confirm" | "escalate" | "review";

const WorkflowCtx = createContext<{ open: (alertId: string, mode?: Mode) => void } | null>(null);
export const useWorkflow = () => useContext(WorkflowCtx)!;

const ACTIONS: { type: InterventionType; icon: LucideIcon; hint: string }[] = [
  { type: "Hydration", icon: Droplets, hint: "Water stations stocked and announced to the team" },
  { type: "Cooling/rest break", icon: Wind, hint: "Configured break in the cooling/rest area — resets exposure" },
  { type: "Move activity to shade", icon: Sun, hint: "Relocate the activity to a shaded area where possible" },
  { type: "Work rotation", icon: Timer, hint: "Rotate the team to a lighter task" },
  { type: "Pause task", icon: Pause, hint: "Stop the task until conditions are reassessed" },
  { type: "Escalated to site safety manager", icon: Siren, hint: "Follow the site escalation procedure" },
];

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [alertId, setAlertId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("confirm");
  const open = useCallback((id: string, m: Mode = "confirm") => {
    setAlertId(id);
    setMode(m);
  }, []);
  return (
    <WorkflowCtx.Provider value={{ open }}>
      {children}
      {alertId && <WorkflowModal key={alertId + mode} alertId={alertId} mode={mode} onClose={() => setAlertId(null)} />}
    </WorkflowCtx.Provider>
  );
}

function WorkflowModal({ alertId, mode, onClose }: { alertId: string; mode: Mode; onClose: () => void }) {
  const { state, confirmIntervention, dismissAlert } = useDemo();
  const alert = state.alerts.find((a) => a.id === alertId);
  const task = alert && state.tasks.find((t) => t.id === alert.task_id);
  const [actions, setActions] = useState<InterventionType[]>(() => {
    const rec = alert?.recommended.length ? alert.recommended : (["Hydration", "Cooling/rest break"] as InterventionType[]);
    return mode === "escalate" ? ["Escalated to site safety manager", ...rec] : rec;
  });
  const [supervisor, setSupervisor] = useState(state.supervisor);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [saved, setSaved] = useState<SafetyLogEntry | null>(null);
  const [now] = useState(() => new Date().toISOString());

  if (!alert || !task) return null;

  const toggle = (t: InterventionType) => setActions((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]));

  if (saved) return <RecordedSheet entry={saved} alert={alert} onClose={onClose} />;

  if (mode === "review") {
    return (
      <Modal open onClose={onClose}>
        <div className="p-6 sm:p-8">
          <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">Review alert</p>
          <h2 className="mt-1 text-xl font-semibold">
            Dismiss alert for {task.name} · {alert.snapshot.zone}?
          </h2>
          <p className="mt-2 text-sm text-ink-2">
            Supervisors can override a risk assessment. The override and your reason are recorded in the safety log.
          </p>
          <label className="mt-5 block text-sm font-medium">Reason (required)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Team already on scheduled break; zone sensor placement checked"
            className="mt-1.5 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink-3"
          />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!reason.trim()}
              onClick={() => {
                dismissAlert(alert.id, reason.trim());
                onClose();
              }}
            >
              Dismiss & log override
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose}>
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className={cx("flex h-8 w-8 items-center justify-center rounded-full", mode === "escalate" ? "bg-critical-bg" : "bg-low-bg")}>
            {mode === "escalate" ? <ShieldAlert className="h-4 w-4 text-critical" /> : <ClipboardCheck className="h-4 w-4 text-low" />}
          </span>
          <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">{mode === "escalate" ? "Escalation" : "Supervisor confirmation"}</p>
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">{mode === "escalate" ? "Escalate alert" : "Intervention confirmed"}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <span className="font-medium text-ink">{task.name}</span>
          <span>·</span>
          <span>{alert.snapshot.zone}</span>
          <span>·</span>
          <span>{task.team}</span>
          <RiskBadge level={alert.severity} />
          <span className="tabular">{alert.snapshot.score}/100</span>
        </div>

        <p className="mt-6 text-sm font-medium">Actions taken</p>
        <div className="mt-2 space-y-2">
          {ACTIONS.filter((a) => mode === "escalate" || a.type !== "Escalated to site safety manager").map(({ type, icon: Icon, hint }) => {
            const on = actions.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggle(type)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                  on ? "border-ink bg-white" : "border-line bg-white hover:border-ink-3",
                )}
              >
                <span className={cx("flex h-5 w-5 items-center justify-center rounded-md border", on ? "border-ink bg-ink" : "border-ink-3")}>
                  {on && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                </span>
                <Icon className="h-4 w-4 text-ink-2" />
                <span className="flex-1">
                  <span className="block text-sm font-medium">
                    {type}
                    {alert.recommended.includes(type) && <span className="ml-2 text-[11px] font-normal text-ink-3">Recommended</span>}
                  </span>
                  <span className="block text-xs text-ink-3">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Supervisor</label>
            <input
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink-3"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Timestamp</label>
            <div className="tabular mt-1.5 rounded-xl border border-line bg-line-2/60 px-3 py-2 text-sm text-ink-2">
              {new Date(now).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {hhmm(now)}
            </div>
          </div>
        </div>
        <label className="mt-3 block text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional — e.g. Roof crew moved to shaded prep work until 16:00"
          className="mt-1.5 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-ink-3"
        />

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={mode === "escalate" ? "danger" : "primary"}
            disabled={actions.length === 0 || !supervisor.trim()}
            onClick={() => setSaved(confirmIntervention({ alertId: alert.id, actions, supervisor: supervisor.trim(), notes: notes.trim(), mode: mode === "escalate" ? "escalate" : "confirm" }))}
          >
            Save safety record
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RecordedSheet({ entry, alert, onClose }: { entry: SafetyLogEntry; alert: Alert; onClose: () => void }) {
  const steps = [
    { label: "Risk detected", time: alert.created_at },
    { label: "Alert sent", time: alert.created_at },
    { label: "Intervention confirmed", time: entry.timestamp },
    { label: "Record created", time: entry.timestamp },
  ];
  return (
    <Modal open onClose={onClose}>
      <div className="p-6 text-center sm:p-10">
        <div className="animate-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-low-bg">
          <CircleCheck className="h-8 w-8 text-low" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Safety action recorded</h2>
        <p className="mt-1 text-sm text-ink-2">
          {entry.task} · {entry.zone} · {entry.intervention} · by {entry.supervisor}
        </p>

        <ol className="mt-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-4 sm:gap-0">
          {steps.map((s, i) => (
            <li key={s.label} className="animate-fade-up relative flex flex-col items-center text-center" style={{ animationDelay: `${150 + i * 220}ms` }}>
              {i > 0 && <span className="absolute top-4 right-1/2 hidden h-px w-full bg-low/40 sm:block" />}
              <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-low text-white">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span className="mt-2 text-xs font-medium">{s.label}</span>
              <span className="tabular text-[11px] text-ink-3">{hhmm(s.time)}</span>
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-8 max-w-sm text-xs text-ink-3">
          Task reassessed with the confirmed interventions applied. Record is timestamped and attributed for audit.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/safety-log" onClick={onClose}>
            <Button className="w-full" icon={ArrowRight}>
              View safety log
            </Button>
          </Link>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Alert card used on the dashboard, task detail and the risk simulator. */
export function AlertCard({ alert, compact }: { alert: Alert; compact?: boolean }) {
  const { state } = useDemo();
  const { open } = useWorkflow();
  const task = state.tasks.find((t) => t.id === alert.task_id);
  if (!task) return null;
  const critical = alert.severity === "CRITICAL";
  const s = alert.snapshot;
  return (
    <div className={cx("animate-fade-up rounded-2xl border bg-white p-5", critical ? "border-critical/30" : "border-high/30")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cx("flex h-9 w-9 items-center justify-center rounded-full", critical ? "animate-pulse-ring bg-critical-bg" : "bg-high-bg")}>
            <Bell className={cx("h-4 w-4", critical ? "text-critical" : "text-high")} />
          </span>
          <div>
            <p className="font-semibold">{alert.message}</p>
            <p className="text-xs text-ink-3">{relativeTime(alert.created_at)}</p>
          </div>
        </div>
        <RiskBadge level={alert.severity} />
      </div>

      <div className="mt-4">
        <Link href={`/tasks/${task.id}`} className="text-[15px] font-medium hover:underline">
          {s.task}
        </Link>
        <p className="text-sm text-ink-2">
          {s.team} · {workLabel(s.intensity)} · {s.score}/100
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-2">
          <span className="inline-flex items-center gap-1">
            <Thermometer className="h-3.5 w-3.5" />
            {s.temperature}°C · {s.humidity}% · {s.wind_kmh} km/h
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" />
            WBGT {s.wbgt}°C
          </span>
          <span className="inline-flex items-center gap-1">
            <Timer className="h-3.5 w-3.5" />
            {s.exposure} min exposure
          </span>
        </div>
        {alert.trigger.length > 0 && (
          <p className="mt-2 text-xs text-ink-3">
            Trigger: <span className="text-ink-2">{alert.trigger.join(" · ")}</span>
          </p>
        )}
      </div>

      {!compact && alert.recommended.length > 0 && (
        <div className="mt-4 rounded-xl bg-line-2/70 p-3.5">
          <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">Recommended intervention</p>
          <ul className="mt-2 space-y-1">
            {alert.recommended.map((r) => (
              <li key={r} className="flex items-center gap-2 text-sm">
                <span className="h-1 w-1 rounded-full bg-ink-2" />
                {RECOMMENDATION_LABEL[r]}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-ink-3">From configured site rules — not generated by AI.</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => open(alert.id, "confirm")} className="flex-1 sm:flex-none">
          Confirm intervention
        </Button>
        <Button variant="secondary" onClick={() => open(alert.id, "escalate")}>
          Escalate
        </Button>
        <Button variant="ghost" onClick={() => open(alert.id, "review")}>
          Dismiss with reason
        </Button>
      </div>
    </div>
  );
}
