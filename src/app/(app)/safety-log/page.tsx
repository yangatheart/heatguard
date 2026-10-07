"use client";

import { Download, Printer, ScrollText } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, EmptyState, PageHeader, RiskBadge, SimulatedTag } from "@/components/ui";
import { dayLabel, hhmm, cx } from "@/lib/format";
import { useDemo } from "@/lib/store";
import type { RiskLevel, SafetyLogEntry } from "@/lib/types";

const INTERVENTIONS = ["Cooling break", "Hydration", "Move to shade", "Work rotation", "Escalated", "Override"];
const STATUSES: SafetyLogEntry["resolution"][] = ["Resolved", "Monitoring", "Escalated", "Dismissed"];

const STATUS_STYLE: Record<SafetyLogEntry["resolution"], string> = {
  Resolved: "bg-low-bg text-low",
  Monitoring: "bg-moderate-bg text-moderate",
  Escalated: "bg-critical-bg text-critical",
  Dismissed: "bg-line-2 text-ink-2",
};

function matchesIntervention(e: SafetyLogEntry, f: string) {
  const t = e.intervention.toLowerCase();
  if (f === "Escalated") return t.includes("escalat");
  if (f === "Override") return t.includes("override");
  return t.includes(f.toLowerCase());
}

export default function SafetyLogPage() {
  const { state } = useDemo();
  const [range, setRange] = useState<"today" | "7d" | "all">("7d");
  const [worker, setWorker] = useState("all");
  const [level, setLevel] = useState<RiskLevel | "all">("all");
  const [intervention, setIntervention] = useState("all");
  const [status, setStatus] = useState<string>("all");

  const workers = useMemo(() => [...new Set(state.log.map((e) => e.worker_name))].sort(), [state.log]);
  const siteName = (id: string) => state.sites.find((s) => s.id === id)?.name ?? id;

  const entries = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const cutoff = range === "today" ? startToday : range === "7d" ? startToday - 6 * 86_400_000 : 0;
    return state.log
      .filter((e) => new Date(e.timestamp).getTime() >= cutoff)
      .filter((e) => worker === "all" || e.worker_name === worker)
      .filter((e) => level === "all" || e.risk_level === level)
      .filter((e) => intervention === "all" || matchesIntervention(e, intervention))
      .filter((e) => status === "all" || e.resolution === status)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [state.log, range, worker, level, intervention, status]);

  const groups = entries.reduce<Record<string, SafetyLogEntry[]>>((g, e) => {
    const k = dayLabel(e.timestamp);
    (g[k] ||= []).push(e);
    return g;
  }, {});

  const exportCsv = () => {
    const header = ["timestamp", "site", "worker", "task", "risk_level", "score", "intervention", "status", "supervisor", "notes"];
    const esc = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = entries.map((e) =>
      [e.timestamp, siteName(e.site_id), e.worker_name, e.task, e.risk_level, e.score, e.intervention, e.resolution, e.supervisor, e.notes].map(esc).join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `heatguard-safety-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const select = "rounded-xl border border-line bg-white px-3 py-2 text-sm";

  return (
    <div>
      <PageHeader
        title="Safety Log"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Every alert, intervention and override — timestamped and attributed. <SimulatedTag />
          </span>
        }
        actions={
          <div className="no-print flex gap-2">
            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
              Print report
            </Button>
            <Button icon={Download} onClick={exportCsv} disabled={entries.length === 0}>
              Export report
            </Button>
          </div>
        }
      />

      <div className="no-print mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
        <select aria-label="Date" className={select} value={range} onChange={(e) => setRange(e.target.value as typeof range)}>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="all">All time</option>
        </select>
        <select aria-label="Worker" className={select} value={worker} onChange={(e) => setWorker(e.target.value)}>
          <option value="all">All workers</option>
          {workers.map((w) => (
            <option key={w}>{w}</option>
          ))}
        </select>
        <select aria-label="Risk level" className={select} value={level} onChange={(e) => setLevel(e.target.value as RiskLevel | "all")}>
          <option value="all">All risk levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
        </select>
        <select aria-label="Intervention" className={select} value={intervention} onChange={(e) => setIntervention(e.target.value)}>
          <option value="all">All interventions</option>
          {INTERVENTIONS.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <select aria-label="Status" className={select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {entries.length === 0 ? (
        <Card>
          <EmptyState icon={ScrollText} title="No records match these filters" body="Adjust the filters, or confirm an intervention from an active alert to create a record." />
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-ink-2">
                {day} <span className="font-normal text-ink-3">· {list.length} event{list.length > 1 ? "s" : ""}</span>
              </h2>
              <Card className="divide-y divide-line-2">
                {list.map((e, i) => (
                  <div key={e.id} className={cx("grid gap-3 px-5 py-4 sm:grid-cols-[64px_1fr_auto]", i === 0 && day === "Today" && e.id.startsWith("log_") && !e.id.startsWith("log_seed") && "animate-fade-up")}>
                    <span className="tabular text-sm font-semibold">{hhmm(e.timestamp)}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.worker_name}</span>
                        <RiskBadge level={e.risk_level} />
                        <span className="text-xs text-ink-3">
                          {e.risk_level === "CRITICAL" ? "Critical" : "High"} heat risk detected · {e.score}/100 · {e.task} · {siteName(e.site_id)}
                        </span>
                      </div>
                      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        <div className="flex gap-2">
                          <dt className="text-ink-3">Intervention</dt>
                          <dd>{e.intervention}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-ink-3">Supervisor</dt>
                          <dd>{e.supervisor}</dd>
                        </div>
                        {e.notes && (
                          <div className="flex gap-2 sm:col-span-2">
                            <dt className="text-ink-3">Notes</dt>
                            <dd className="text-ink-2">{e.notes}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <span className={cx("h-fit self-start rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[e.resolution])}>{e.resolution}</span>
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
