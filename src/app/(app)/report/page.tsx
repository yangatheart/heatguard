"use client";

import { CircleAlert, FileText, Printer, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { Banner, Button, Card, EmptyState, PageHeader, RiskBadge, SimulatedTag } from "@/components/ui";
import { peakWindow, type ReportFacts } from "@/lib/analytics";
import { actionsFor, templateSummary } from "@/lib/report";
import { hhmm } from "@/lib/format";
import { estimateWbgt, levelRank, topDrivers } from "@/lib/risk-engine";
import { siteSnapshot, useDemo } from "@/lib/store";
import type { RiskLevel } from "@/lib/types";

interface ReportResult {
  summary: string;
  actions: string[];
  source: "ai" | "template";
  notice?: string;
  generatedAt: string;
}

export default function ReportPage() {
  const { state, assess } = useDemo();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [report, setReport] = useState<ReportResult | null>(null);
  const [facts, setFacts] = useState<ReportFacts | null>(null);
  const site = state.sites.find((s) => s.id === state.currentSiteId)!;

  const buildFacts = (): ReportFacts => {
    const snap = siteSnapshot(state, site.id, assess);
    const today = new Date().toDateString();
    const isToday = (iso: string) => new Date(iso).toDateString() === today;

    const logged = state.log
      .filter((e) => e.site_id === site.id && isToday(e.timestamp))
      .map((e) => ({ time: hhmm(e.timestamp), zone: e.zone, task: e.task, team: e.team, level: e.risk_level, trigger: e.trigger, intervention: e.intervention, status: e.resolution }));
    const open = snap.activeAlerts.map((a) => ({
      time: hhmm(a.created_at),
      zone: a.snapshot.zone,
      task: a.snapshot.task,
      team: a.snapshot.team,
      level: a.severity,
      trigger: a.trigger,
      intervention: null,
      status: "Awaiting supervisor confirmation",
    }));
    const todaysEvents = [...logged, ...open].sort((a, b) => a.time.localeCompare(b.time));

    const involved = new Set(state.log.filter((e) => isToday(e.timestamp)).map((e) => e.task_id));
    const factorCounts = new Map<string, number>();
    snap.tasks
      .filter(({ task, risk }) => levelRank(risk.level) >= 2 || involved.has(task.id))
      .forEach(({ risk }) => topDrivers(risk, 5).forEach((f) => factorCounts.set(f.label, (factorCounts.get(f.label) ?? 0) + 1)));

    const byLevel = snap.tasks.reduce((acc, { risk }) => ({ ...acc, [risk.level]: acc[risk.level] + 1 }), { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 } as Record<RiskLevel, number>);

    return {
      date: new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      site: site.name,
      conditions: {
        temperature: site.temperature,
        humidity: site.humidity,
        wbgt: estimateWbgt(site.temperature, site.humidity),
        windKmh: site.wind_kmh,
        solar: site.solar,
        weatherOnline: site.weather_online,
      },
      zonesMonitored: snap.zones.length,
      tasksMonitored: snap.tasks.length,
      currentTasksByLevel: byLevel,
      highRiskZones: snap.highRiskZones.map((z) => z.zone.name),
      todaysEvents,
      peakWindowToday: peakWindow(todaysEvents.map((e) => Number(e.time.slice(0, 2)))),
      topFactors: [...factorCounts.entries()].map(([factor, n]) => ({ factor, tasks: n })).sort((a, b) => b.tasks - a.tasks).slice(0, 5),
      openAlerts: open.length,
      configuredMaxExposureMinutes: state.siteConfig.maxContinuousExposure,
      configuredBreakMinutes: state.siteConfig.breakMinutes,
    };
  };

  const generate = async () => {
    setStatus("loading");
    const f = buildFacts();
    setFacts(f);
    // Static hosting (GitHub Pages) has no report API: build the rule-based report in the browser.
    if (process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") {
      await new Promise((r) => setTimeout(r, 600));
      setReport({ summary: templateSummary(f), actions: actionsFor(f), source: "template", generatedAt: new Date().toISOString() });
      setStatus("done");
      return;
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 45_000);
      const res = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f), signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport((await res.json()) as ReportResult);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Daily Safety Report"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {site.name} · summarises today&apos;s site, zone and task data <SimulatedTag>Demo data</SimulatedTag>
          </span>
        }
        actions={
          <div className="no-print flex gap-2">
            {status === "done" && (
              <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
                Print
              </Button>
            )}
            <Button icon={status === "done" ? RefreshCw : Sparkles} onClick={generate} disabled={status === "loading"}>
              {status === "loading" ? "Generating…" : status === "done" ? "Regenerate" : "Generate daily report"}
            </Button>
          </div>
        }
      />

      {status === "idle" && (
        <Card>
          <EmptyState
            icon={FileText}
            title="No report generated yet"
            body="SiteSafe SI summarises today's site conditions, risk events, interventions and contributing factors into a short operational report. Recommended actions come from configured rules."
            action={
              <Button icon={Sparkles} onClick={generate}>
                Generate daily report
              </Button>
            }
          />
        </Card>
      )}

      {status === "loading" && (
        <Card className="space-y-3 p-8">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
          <p className="pt-2 text-sm text-ink-3">Summarising today&apos;s site data…</p>
        </Card>
      )}

      {status === "error" && (
        <Card>
          <EmptyState
            icon={CircleAlert}
            title="Report generation failed"
            body="The report service could not be reached. Your site data is unaffected — try again."
            action={
              <Button icon={RefreshCw} onClick={generate}>
                Retry
              </Button>
            }
          />
        </Card>
      )}

      {status === "done" && report && facts && (
        <div className="animate-fade-up grid gap-4 lg:grid-cols-3">
          <Card className="p-7 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-2">{facts.date}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-line-2 px-2.5 py-0.5 text-xs text-ink-2">
                <Sparkles className="h-3 w-3" />
                {report.source === "ai" ? "AI summary of site data" : "Rule-based summary"} · {hhmm(report.generatedAt)}
              </span>
            </div>
            {report.notice && (
              <div className="mt-3">
                <Banner tone="warn">{report.notice}</Banner>
              </div>
            )}
            <h2 className="mt-5 text-lg font-semibold">Summary</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">{report.summary}</p>

            <h2 className="mt-7 text-lg font-semibold">Recommended operational actions</h2>
            <ul className="mt-3 space-y-2">
              {report.actions.map((a) => (
                <li key={a} className="flex gap-3 rounded-xl bg-line-2/60 px-4 py-3 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                  {a}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-ink-3">
              The summary only restates recorded site data. Actions are derived from configured site rules, not generated by AI. SiteSafe SI does not set
              safety thresholds or provide medical recommendations.
            </p>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold">Data used</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  ["Conditions", `${facts.conditions.temperature}°C · ${facts.conditions.humidity}% · ${facts.conditions.windKmh} km/h`],
                  ["WBGT (calculated)", `${facts.conditions.wbgt}°C`],
                  ["Zones · tasks monitored", `${facts.zonesMonitored} · ${facts.tasksMonitored}`],
                  ["High-risk zones", facts.highRiskZones.join(", ") || "—"],
                  ["Risk events today", facts.todaysEvents.length],
                  ["Peak window", facts.peakWindowToday ?? "—"],
                  ["Open alerts", facts.openAlerts],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex justify-between gap-3">
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="tabular text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold">Today&apos;s events</h3>
              {facts.todaysEvents.length === 0 ? (
                <p className="mt-2 text-sm text-ink-3">No high or critical events today.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {facts.todaysEvents.map((e, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="tabular w-11 text-ink-3">{e.time}</span>
                      <span className="flex-1 truncate">
                        {e.task} <span className="text-ink-3">· {e.zone}</span>
                      </span>
                      <RiskBadge level={e.level} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
