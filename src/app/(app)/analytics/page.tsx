"use client";

import { Clock } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, PageHeader, SimulatedTag } from "@/components/ui";
import { computeAnalytics } from "@/lib/analytics";
import { LEVEL_STYLE } from "@/lib/format";
import { useDemo } from "@/lib/store";

const AXIS = { fontSize: 12, fill: "#a1a1a6" };
const GRID = "#efeee9";

function ChartTooltip({ active, payload, label, unit }: { active?: boolean; payload?: { value: number; payload: Record<string, unknown> }[]; label?: string; unit: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-[var(--shadow-pop)]">
      <p className="font-medium text-ink">{label ?? String(p.payload.task)}</p>
      <p className="tabular text-ink-2">
        {p.value} {unit}
        {"level" in p.payload ? ` · ${LEVEL_STYLE[p.payload.level as keyof typeof LEVEL_STYLE].label}` : ""}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { state } = useDemo();
  const a = useMemo(() => computeAnalytics(state), [state]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Heat Risk Analytics"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            All sites · last 7 days · by task, zone and time of day <SimulatedTag>Demo data</SimulatedTag>
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Alerts" value={a.alerts} />
        <Kpi label="Confirmed interventions" value={a.confirmed} />
        <Kpi label="Resolved" value={a.resolved} />
        <Card className="p-5">
          <p className="flex items-center gap-1.5 text-xs text-ink-2">
            <Clock className="h-3.5 w-3.5" /> High-risk period
          </p>
          <p className="tabular mt-2 text-3xl font-semibold tracking-tight">{a.peakWindow ?? "—"}</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Risk events this week" desc="High and critical alerts per day">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={a.weekly} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f5f5f2" }} content={<ChartTooltip unit="events" />} />
              <Bar isAnimationActive={false} dataKey="events" fill="var(--chart)" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk by time of day" desc="Alerts by hour of the day, all days">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={a.byHour} margin={{ top: 16, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="hour" tick={AXIS} axisLine={false} tickLine={false} interval={1} />
              <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ stroke: "#d4d3ce" }} content={<ChartTooltip unit="events" />} />
              <Line isAnimationActive={false} type="monotone" dataKey="events" stroke="var(--chart)" strokeWidth={2} dot={{ r: 4, fill: "var(--chart)", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Risk by task" desc="High and critical events per task type, all sites" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={a.byTask} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke={GRID} />
              <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="task" width={130} tick={{ ...AXIS, fill: "#6e6e73" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f5f5f2" }} content={<ChartTooltip unit="events" />} />
              <Bar isAnimationActive={false} dataKey="events" fill="var(--chart)" radius={[0, 4, 4, 0]} maxBarSize={18} minPointSize={2}>
                <LabelList dataKey="events" position="right" style={{ fontSize: 12, fill: "#6e6e73" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="space-y-4">
        <ChartCard title="Risk by zone" desc="Zones generating the most high and critical events">
          <ul className="space-y-2.5">
            {a.byZone.map((z) => (
              <li key={z.zone}>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-2">{z.zone}</span>
                  <span className="tabular font-semibold">{z.events}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-line-2">
                  <div className="h-full rounded-full bg-chart" style={{ width: `${(z.events / Math.max(1, a.byZone[0]?.events ?? 1)) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>
        <ChartCard title="Intervention effectiveness" desc="From alert to confirmed action to resolution">
          <Funnel steps={[["Alerts", a.alerts], ["Confirmed interventions", a.confirmed], ["Resolved", a.resolved]]} />
          <p className="mt-5 text-xs text-ink-3">
            Confirmation rate {a.alerts ? Math.round((a.confirmed / a.alerts) * 100) : 0}% · resolution rate{" "}
            {a.alerts ? Math.round((a.resolved / a.alerts) * 100) : 0}%. Demonstration figures only — not a measure of real-world outcomes.
          </p>
        </ChartCard>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-ink-2">{label}</p>
      <p className="tabular mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </Card>
  );
}

function ChartCard({ title, desc, className, children }: { title: string; desc: string; className?: string; children: React.ReactNode }) {
  return (
    <Card className={`p-6 ${className ?? ""}`}>
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-ink-3">{desc}</p>
      {children}
    </Card>
  );
}

function Funnel({ steps }: { steps: [string, number][] }) {
  const max = Math.max(1, steps[0][1]);
  return (
    <div className="space-y-4">
      {steps.map(([label, v]) => (
        <div key={label}>
          <div className="flex justify-between text-sm">
            <span className="text-ink-2">{label}</span>
            <span className="tabular font-semibold">{v}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-line-2">
            <div className="h-full rounded-full bg-chart" style={{ width: `${(v / max) * 100}%`, transition: "width .8s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
