"use client";

import { BellOff, CloudOff, Droplets, FlaskConical, Gauge, ShieldCheck, Sun, Thermometer, Wind } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { TaskTable } from "@/components/task-table";
import { AlertCard } from "@/components/workflow";
import { Banner, Button, Card, EmptyState, PageHeader, RiskBadge, SimulatedTag, SourceTag } from "@/components/ui";
import { LEVEL_STYLE, cx, workLabel } from "@/lib/format";
import { RECOMMENDATION_LABEL, estimateWbgt, levelRank, siteLevel, SITE_WBGT_BANDS } from "@/lib/risk-engine";
import { siteSnapshot, useDemo } from "@/lib/store";
import type { RiskLevel } from "@/lib/types";

export default function Dashboard() {
  const { state, assess } = useDemo();
  const site = state.sites.find((s) => s.id === state.currentSiteId)!;
  const [filter, setFilter] = useState<"all" | "affected">("all");
  const tableRef = useRef<HTMLDivElement>(null);

  const snap = useMemo(() => siteSnapshot(state, site.id, assess), [state, site.id, assess]);
  const level = siteLevel(site.temperature, site.humidity);
  const wbgt = estimateWbgt(site.temperature, site.humidity);
  const shown = filter === "affected" ? snap.highRiskTasks : snap.tasks;

  const viewAffected = () => {
    setFilter("affected");
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const kpis: { label: string; value: number; tone?: "alert" | "good"; href?: string }[] = [
    { label: "High-risk zones", value: snap.highRiskZones.length, tone: snap.highRiskZones.length ? "alert" : undefined, href: "#zones" },
    { label: "High-risk tasks", value: snap.highRiskTasks.length, tone: snap.highRiskTasks.length ? "alert" : undefined },
    { label: "Active alerts", value: snap.activeAlerts.length, tone: snap.activeAlerts.length ? "alert" : undefined, href: "#alerts" },
    { label: "Recommended interventions", value: snap.recommended.length },
    { label: "Confirmed interventions", value: snap.confirmedThisWeek, tone: "good" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={site.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Site Safety Super Intelligence Dashboard · {site.location} <SimulatedTag>Demo data</SimulatedTag>
          </span>
        }
        actions={
          <Link href="/demo">
            <Button variant="secondary" icon={FlaskConical}>
              Risk Simulator
            </Button>
          </Link>
        }
      />

      {!site.weather_online && (
        <Banner tone="warn" icon={CloudOff}>
          <b>Weather feed offline.</b> Showing the last environmental reading from {site.weather_last_update}. Task risk uses the last known
          conditions until the feed reconnects.
        </Banner>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => {
          const card = (
            <Card className={cx("h-full p-4 transition-colors", k.tone === "alert" && "border-high/30 bg-high-bg/40")}>
              <div className="text-xs text-ink-2">{k.label}</div>
              <p className={cx("tabular mt-2 text-3xl font-semibold tracking-tight", k.tone === "alert" && "text-high", k.tone === "good" && "text-low")}>{k.value}</p>
              {k.label === "Confirmed interventions" && <p className="text-[11px] text-ink-3">Last 7 days</p>}
            </Card>
          );
          return k.href ? (
            <a key={k.label} href={k.href} className="block">
              {card}
            </a>
          ) : (
            <div key={k.label}>{card}</div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Overall site risk */}
        <Card className="p-6 sm:p-7 lg:col-span-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-ink-2">Overall Site Risk</p>
              <p className={cx("mt-1 text-5xl font-semibold tracking-tight sm:text-6xl", LEVEL_STYLE[level].fg)}>{LEVEL_STYLE[level].label}</p>
            </div>
            <RiskBadge level={level} size="md" />
          </div>

          <WbgtScale wbgt={wbgt} />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { icon: Thermometer, label: "Temperature", value: `${site.temperature}°C`, source: "Environmental sensor" },
              { icon: Droplets, label: "Humidity", value: `${site.humidity}%`, source: "Environmental sensor" },
              { icon: Wind, label: "Wind", value: `${site.wind_kmh} km/h`, source: "Environmental sensor" },
              { icon: Sun, label: "Solar exposure", value: site.solar, source: "Environmental sensor" },
              { icon: Gauge, label: "WBGT", value: `${wbgt}°C`, source: "Calculated" },
            ].map(({ icon: Icon, label, value, source }) => (
              <div key={label} className="rounded-xl bg-line-2/60 p-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-2">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </div>
                <p className="tabular mt-1 text-xl font-semibold">{value}</p>
                <SourceTag source={source} />
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-2">
              {snap.highRiskZones.length
                ? `Elevated heat risk in ${snap.highRiskZones.map((z) => z.zone.name).join(" and ")}. Review the affected tasks and confirm interventions.`
                : levelRank(level) >= 1
                  ? "Conditions are warm. Keep hydration reminders active and monitor heavy tasks."
                  : "Conditions are within normal range. Continue routine monitoring."}
            </p>
            <Button onClick={viewAffected} className="shrink-0">
              View high-risk tasks
            </Button>
          </div>
          <p className="mt-4 text-[11px] text-ink-3">
            Weather station {site.weather_station} · WBGT is calculated from temperature and humidity for this prototype.
          </p>
        </Card>

        {/* Alerts */}
        <div id="alerts" className="scroll-mt-20 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-semibold">Active alerts</h2>
            <span className="text-xs text-ink-3">Supervisor confirmation required</span>
          </div>
          {snap.activeAlerts.length === 0 ? (
            <Card>
              <EmptyState icon={BellOff} title="No active alerts" body="All high-risk events on this site have been actioned. New alerts appear here when a task reaches High or Critical." />
            </Card>
          ) : (
            [...snap.activeAlerts].sort((a, b) => levelRank(b.severity) - levelRank(a.severity)).map((a) => <AlertCard key={a.id} alert={a} />)
          )}
          {snap.recommended.length > 0 && (
            <Card className="p-4">
              <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">Recommended interventions</p>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-1">
                {snap.recommended.map((r) => (
                  <li key={r} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-ink-2" />
                    {RECOMMENDATION_LABEL[r]}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Zones */}
      <section id="zones" className="scroll-mt-20">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-semibold">Zones</h2>
          <span className="text-xs text-ink-3">Each zone reports from its own environmental sensor</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {snap.zones.map(({ zone, tasks, level: zl, top }) => (
            <Card key={zone.id} className={cx("p-5", levelRank(zl) >= 2 && "border-high/30")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{zone.name}</p>
                  <p className="text-xs text-ink-3">
                    {zone.setting} · sensor {zone.sensor_id}
                  </p>
                </div>
                <RiskBadge level={zl} />
              </div>
              <p className="tabular mt-3 text-sm text-ink-2">
                {zone.temperature}°C · {zone.humidity}% · {zone.wind_kmh} km/h · WBGT {estimateWbgt(zone.temperature, zone.humidity)}°C
              </p>
              {top && (
                <Link href={`/tasks/${top.task.id}`} className="mt-3 block rounded-xl bg-line-2/60 px-3 py-2 text-sm hover:bg-line-2">
                  <span className="font-medium">{top.task.name}</span>
                  <span className="text-ink-2">
                    {" "}
                    · {workLabel(top.task.intensity)} · {top.task.exposure_minutes} min exposure
                  </span>
                  {tasks.length > 1 && <span className="block text-xs text-ink-3">+{tasks.length - 1} more task{tasks.length > 2 ? "s" : ""}</span>}
                </Link>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Task table */}
      <div ref={tableRef} className="scroll-mt-20">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Task risk</h2>
              <p className="text-xs text-ink-3">Sorted by risk score · open a task for the full assessment</p>
            </div>
            <div className="inline-flex rounded-xl bg-line-2 p-1 text-sm">
              {(["all", "affected"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx("rounded-lg px-3 py-1 font-medium", filter === f ? "bg-white shadow-sm" : "text-ink-2")}
                >
                  {f === "all" ? `All (${snap.tasks.length})` : `High & critical (${snap.highRiskTasks.length})`}
                </button>
              ))}
            </div>
          </div>
          <TaskTable rows={shown} />
        </Card>
      </div>

      <TrustStrip />
    </div>
  );
}

function WbgtScale({ wbgt }: { wbgt: number }) {
  const min = 18;
  const max = 36;
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const bands: [RiskLevel, number, number][] = [
    ["LOW", min, SITE_WBGT_BANDS.moderate],
    ["MODERATE", SITE_WBGT_BANDS.moderate, SITE_WBGT_BANDS.high],
    ["HIGH", SITE_WBGT_BANDS.high, SITE_WBGT_BANDS.critical],
    ["CRITICAL", SITE_WBGT_BANDS.critical, max],
  ];
  return (
    <div className="mt-6">
      <div className="relative flex h-2.5 gap-[2px]">
        {bands.map(([l, a, b]) => (
          <div key={l} className={cx("h-full rounded-full", LEVEL_STYLE[l].dot)} style={{ width: `${pct(b) - pct(a)}%` }} />
        ))}
        <div
          className="absolute -top-[5px] h-5 w-5 -translate-x-1/2 rounded-full border-4 border-white bg-ink shadow-md"
          style={{ left: `${Math.min(98, Math.max(2, pct(wbgt)))}%`, transition: "left .8s" }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-3">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Critical</span>
      </div>
    </div>
  );
}

function TrustStrip() {
  const items = [
    "Site-first: built only on measurable environmental and operational data",
    "No physiological, wearable or medical data is collected or inferred",
    "Every alert requires supervisor confirmation, escalation or a logged override",
    "Missing sensor data is shown explicitly, never filled in",
  ];
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-low" />
        <h3 className="text-sm font-semibold">Responsible by design</h3>
      </div>
      <ul className="mt-3 grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-3" />
            {i}
          </li>
        ))}
      </ul>
    </Card>
  );
}
