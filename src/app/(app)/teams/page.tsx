"use client";

import { ChevronRight, Search, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, EmptyState, PageHeader, RiskBadge, SimulatedTag } from "@/components/ui";
import { LEVEL_ORDER, actionSummary, estimateWbgt } from "@/lib/risk-engine";
import { LEVEL_STYLE, cx } from "@/lib/format";
import { useDemo } from "@/lib/store";
import type { RiskLevel } from "@/lib/types";

export default function TeamsPage() {
  const { state, assess } = useDemo();
  const [q, setQ] = useState("");
  const [site, setSite] = useState<string>(state.currentSiteId);
  const [level, setLevel] = useState<RiskLevel | "all">("all");

  const rows = useMemo(
    () =>
      state.tasks
        .map((task) => ({
          task,
          zone: state.zones.find((z) => z.id === task.zone_id)!,
          members: state.workers.filter((w) => w.task_id === task.id),
          risk: assess(task.id),
          siteName: state.sites.find((s) => s.id === task.site_id)!.name,
        }))
        .filter(({ task, risk }) => (site === "all" || task.site_id === site) && (level === "all" || risk.level === level))
        .filter(({ task, zone, members }) => !q || `${task.team} ${task.name} ${zone.name} ${members.map((m) => `${m.name} ${m.role}`).join(" ")}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.risk.score - a.risk.score),
    [state, assess, q, site, level],
  );
  const people = rows.reduce((n, r) => n + r.members.length, 0);

  return (
    <div>
      <PageHeader
        title="Teams"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {rows.length} teams · {people} people · assigned task, zone and task risk <SimulatedTag>Demo data</SimulatedTag>
          </span>
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search team, task, zone or name"
              className="w-full rounded-xl border border-line py-2 pr-3 pl-9 text-sm outline-none focus:border-ink-3"
            />
          </div>
          <select value={site} onChange={(e) => setSite(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
            <option value="all">All sites</option>
            {state.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...LEVEL_ORDER] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cx(
                  "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                  level === l ? "bg-ink text-white ring-ink" : "bg-white text-ink-2 ring-line hover:text-ink",
                )}
              >
                {l === "all" ? "All" : LEVEL_STYLE[l].label}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No teams match" body="Try a different search, site or risk filter." />
        ) : (
          <ul className="divide-y divide-line-2">
            {rows.map(({ task, zone, members, risk, siteName }) => (
              <li key={task.id}>
                <Link href={`/tasks/${task.id}`} className="group grid gap-3 px-5 py-4 transition-colors hover:bg-line-2/50 md:grid-cols-[1.2fr_1.2fr_1fr_1.4fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="font-semibold">{task.team}</p>
                    <p className="truncate text-xs text-ink-3" title={members.map((m) => m.name).join(", ")}>
                      {members.length} {members.length === 1 ? "person" : "people"} · {members.map((m) => m.name).join(", ")}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p>{task.name}</p>
                    <p className="text-xs text-ink-3">
                      {zone.name}
                      {site === "all" ? ` · ${siteName}` : ""} · {task.exposure_minutes} min exposure
                    </p>
                  </div>
                  <div className="tabular text-xs text-ink-2">
                    {zone.temperature}°C · {zone.humidity}%
                    <span className="block text-ink-3">WBGT {estimateWbgt(zone.temperature, zone.humidity)}°C · {zone.wind_kmh} km/h</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <RiskBadge level={risk.level} />
                    <span className="text-xs text-ink-2">{actionSummary(risk)}</span>
                  </div>
                  <ChevronRight className="hidden h-4 w-4 text-ink-3 group-hover:text-ink md:block" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-3 px-1 text-xs text-ink-3">
        Workers are listed only for assignment and accountability. SiteSafe SI does not collect heart rate, body temperature, wearable readings or any
        medical information, and records no productivity metrics.
      </p>
    </div>
  );
}
