"use client";

import { BellOff, CloudOff, Droplets, FlaskConical, HeartPulse, Sun, Thermometer, Users, Gauge, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { WorkerTable } from "@/components/worker-table";
import { AlertCard } from "@/components/workflow";
import { Button, Card, EmptyState, PageHeader, RiskBadge, SimulatedTag, Banner } from "@/components/ui";
import { LEVEL_STYLE, cx } from "@/lib/format";
import { estimateWbgt, levelRank, siteLevel, SITE_WBGT_BANDS } from "@/lib/risk-engine";
import { useDemo } from "@/lib/store";
import type { RiskLevel } from "@/lib/types";

export default function Dashboard() {
  const { state, assess } = useDemo();
  const site = state.sites.find((s) => s.id === state.currentSiteId)!;
  const [filter, setFilter] = useState<"all" | "affected">("all");
  const tableRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () =>
      state.workers
        .filter((w) => w.site_id === site.id)
        .map((worker) => ({ worker, risk: assess(worker.id) }))
        .sort((a, b) => b.risk.score - a.risk.score),
    [state, site.id, assess],
  );
  const counts = rows.reduce(
    (acc, r) => ({ ...acc, [r.risk.level]: acc[r.risk.level] + 1 }),
    { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 } as Record<RiskLevel, number>,
  );
  const siteIds = new Set(rows.map((r) => r.worker.id));
  const alerts = state.alerts.filter((a) => a.status === "active" && siteIds.has(a.worker_id));
  const level = siteLevel(site.temperature, site.humidity);
  const wbgt = estimateWbgt(site.temperature, site.humidity);
  const shown = filter === "affected" ? rows.filter((r) => levelRank(r.risk.level) >= 2) : rows;
  const missingHr = rows.filter((r) => r.risk.heartRateMissing).length;

  const viewAffected = () => {
    setFilter("affected");
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const kpis: { label: string; value: number; level?: RiskLevel; icon?: typeof Users }[] = [
    { label: "Workers monitored", value: rows.length, icon: Users },
    { label: "Low risk", value: counts.LOW, level: "LOW" },
    { label: "Moderate", value: counts.MODERATE, level: "MODERATE" },
    { label: "High", value: counts.HIGH, level: "HIGH" },
    { label: "Critical", value: counts.CRITICAL, level: "CRITICAL" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={site.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {site.location} <SimulatedTag />
          </span>
        }
        actions={
          <Link href="/demo">
            <Button variant="secondary" icon={FlaskConical}>
              Demo Mode
            </Button>
          </Link>
        }
      />

      {!site.weather_online && (
        <Banner tone="warn" icon={CloudOff}>
          <b>Weather feed offline.</b> Showing the last environmental reading from {site.weather_last_update}. Worker risk uses the last known
          conditions until the feed reconnects.
        </Banner>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-ink-2">
              {k.level ? <span className={cx("h-2 w-2 rounded-full", LEVEL_STYLE[k.level].dot)} /> : k.icon && <k.icon className="h-3.5 w-3.5" />}
              {k.label}
            </div>
            <p className={cx("tabular mt-2 text-3xl font-semibold tracking-tight", k.level === "CRITICAL" && k.value > 0 && "text-critical")}>{k.value}</p>
          </Card>
        ))}
        <a href="#alerts" className="block">
          <Card className={cx("h-full p-4 transition-colors", alerts.length > 0 ? "border-critical/30 bg-critical-bg/50" : "")}>
            <div className="text-xs text-ink-2">Active alerts</div>
            <p className={cx("tabular mt-2 text-3xl font-semibold tracking-tight", alerts.length > 0 && "text-critical")}>{alerts.length}</p>
          </Card>
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Site heat risk */}
        <Card className="p-6 sm:p-7 lg:col-span-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-ink-2">Site Heat Risk</p>
              <p className={cx("mt-1 text-5xl font-semibold tracking-tight sm:text-6xl", LEVEL_STYLE[level].fg)}>{level}</p>
            </div>
            <RiskBadge level={level} size="md" />
          </div>

          <WbgtScale wbgt={wbgt} />

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Thermometer, label: "Temperature", value: `${site.temperature}°C` },
              { icon: Droplets, label: "Humidity", value: `${site.humidity}%` },
              { icon: Gauge, label: "Heat indicator / WBGT", value: `${wbgt}°C` },
              { icon: Sun, label: "Solar exposure", value: site.solar },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl bg-line-2/60 p-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-2">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </div>
                <p className="tabular mt-1 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-2">
              {levelRank(level) >= 2
                ? "Conditions are currently elevated. Review workers at high or critical risk."
                : levelRank(level) === 1
                  ? "Conditions are warm. Keep hydration reminders active and monitor heavy tasks."
                  : "Conditions are within normal range. Continue routine monitoring."}
            </p>
            <Button onClick={viewAffected} className="shrink-0">
              View affected workers
            </Button>
          </div>
          <p className="mt-4 text-[11px] text-ink-3">WBGT is a simplified estimate from temperature and humidity for this prototype.</p>
        </Card>

        {/* Alerts */}
        <div id="alerts" className="scroll-mt-20 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-semibold">Active alerts</h2>
            <span className="text-xs text-ink-3">Supervisor confirmation required</span>
          </div>
          {alerts.length === 0 ? (
            <Card>
              <EmptyState icon={BellOff} title="No active alerts" body="All high-risk events on this site have been actioned. New alerts appear here when a worker reaches High or Critical." />
            </Card>
          ) : (
            alerts
              .sort((a, b) => levelRank(b.severity) - levelRank(a.severity))
              .map((a) => <AlertCard key={a.id} alert={a} />)
          )}
        </div>
      </div>

      {/* Worker table */}
      <div ref={tableRef} className="scroll-mt-20">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Worker risk</h2>
              <p className="text-xs text-ink-3">Sorted by risk score · tap a worker for the full assessment</p>
            </div>
            <div className="inline-flex rounded-xl bg-line-2 p-1 text-sm">
              {(["all", "affected"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cx("rounded-lg px-3 py-1 font-medium", filter === f ? "bg-white shadow-sm" : "text-ink-2")}
                >
                  {f === "all" ? `All (${rows.length})` : `High & critical (${counts.HIGH + counts.CRITICAL})`}
                </button>
              ))}
            </div>
          </div>
          {missingHr > 0 && (
            <div className="border-b border-line-2 px-5 py-2.5 text-xs text-ink-2">
              <HeartPulse className="mr-1 inline h-3.5 w-3.5" />
              Heart-rate data unavailable for {missingHr} worker{missingHr > 1 ? "s" : ""}. Their risk assessment is based on environmental and activity
              signals.
            </div>
          )}
          <WorkerTable rows={shown} />
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
    "Designed for safety management — not productivity surveillance",
    "Wearable data is optional; personal data minimised",
    "Every alert requires human supervisor confirmation or override",
    "Missing sensor data is shown explicitly, never inferred",
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
