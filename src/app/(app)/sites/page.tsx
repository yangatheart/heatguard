"use client";

import { ChevronRight, CloudOff, Gauge, LayoutGrid, MapPin, Thermometer } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, PageHeader, RiskBadge, SimulatedTag } from "@/components/ui";
import { LEVEL_STYLE, cx } from "@/lib/format";
import { estimateWbgt, siteLevel } from "@/lib/risk-engine";
import { siteSnapshot, useDemo } from "@/lib/store";

export default function SitesPage() {
  const { state, assess, setSite } = useDemo();
  const router = useRouter();

  return (
    <div>
      <PageHeader title="Sites" subtitle={<span className="flex items-center gap-2">{state.sites.length} active construction sites <SimulatedTag>Demo data</SimulatedTag></span>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.sites.map((s) => {
          const snap = siteSnapshot(state, s.id, assess);
          const alerts = snap.activeAlerts.length;
          const level = siteLevel(s.temperature, s.humidity);
          return (
            <button
              key={s.id}
              onClick={() => {
                setSite(s.id);
                router.push("/dashboard");
              }}
              className="group text-left"
            >
              <Card className={cx("h-full p-6 transition-all group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-pop)]", s.id === state.currentSiteId && "ring-2 ring-ink/80")}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{s.name}</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
                      <MapPin className="h-3 w-3" />
                      {s.location}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {s.coordinates} · station {s.weather_station}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-ink-3 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-6 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-ink-2">Current risk</p>
                    <p className={cx("text-3xl font-semibold tracking-tight", LEVEL_STYLE[level].fg)}>{LEVEL_STYLE[level].label}</p>
                  </div>
                  <RiskBadge level={level} size="md" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
                  <Stat icon={LayoutGrid} label="Zones" value={snap.zones.length} />
                  <Stat icon={Thermometer} label="Temp" value={`${s.temperature}°`} />
                  <Stat icon={Gauge} label="WBGT" value={`${estimateWbgt(s.temperature, s.humidity)}°`} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line-2 pt-3 text-xs text-ink-2">
                  <span>
                    {snap.highRiskZones.length} high-risk zone{snap.highRiskZones.length === 1 ? "" : "s"} · {snap.highRiskTasks.length} task
                    {snap.highRiskTasks.length === 1 ? "" : "s"} at high/critical · {alerts} alert{alerts === 1 ? "" : "s"}
                  </span>
                  {!s.weather_online && (
                    <span className="inline-flex items-center gap-1 text-moderate">
                      <CloudOff className="h-3.5 w-3.5" /> Weather offline
                    </span>
                  )}
                </div>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-line-2/60 px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] text-ink-3">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="tabular font-semibold">{value}</p>
    </div>
  );
}
