"use client";

import { ArrowDown, ArrowRight, ArrowUp, Flame, FlaskConical, Play, RotateCcw, Sun, Sunrise } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { WhyRiskIncreased } from "@/components/risk-explainer";
import { Banner, Button, Card, PageHeader, RiskBadge, ScoreRing, Segmented, SimulatedTag } from "@/components/ui";
import { AlertCard } from "@/components/workflow";
import { HERO_TASK_ID } from "@/lib/demo-data";
import { LEVEL_STYLE, cx } from "@/lib/format";
import { RECOMMENDATION_LABEL, actionSummary, assessRisk, clockLabel, levelRank, recommendedActions, type RiskInputs, type RiskResult } from "@/lib/risk-engine";
import { useDemo } from "@/lib/store";
import type { Alert } from "@/lib/types";

export default function DemoPage() {
  return (
    <Suspense>
      <SimulatorPage />
    </Suspense>
  );
}

type Draft = RiskInputs;

const PRESETS: { id: string; label: string; icon: typeof Sunrise; hint: string; draft: Draft }[] = [
  {
    id: "morning",
    label: "Morning baseline",
    icon: Sunrise,
    hint: "10:00 · 31°C · 55% · wind 12 · 45 min",
    draft: { temperature: 31, humidity: 55, wind_kmh: 12, solar: "Moderate", hour: 10, intensity: "Heavy", exposure_minutes: 45, ppe: "Standard", shade: "Limited", cooling: "Available" },
  },
  {
    id: "peak",
    label: "Peak heat (Roof Zone)",
    icon: Sun,
    hint: "14:30 · 35°C · 68% · wind 8 · 82 min",
    draft: { temperature: 35, humidity: 68, wind_kmh: 8, solar: "High", hour: 14.5, intensity: "Heavy", exposure_minutes: 82, ppe: "Standard", shade: "Limited", cooling: "Available" },
  },
  {
    id: "heatwave",
    label: "Heatwave afternoon",
    icon: Flame,
    hint: "15:00 · 39°C · 45% · wind 3 · 110 min",
    draft: { temperature: 39, humidity: 45, wind_kmh: 3, solar: "High", hour: 15, intensity: "Heavy", exposure_minutes: 110, ppe: "Standard", shade: "Limited", cooling: "Limited" },
  },
];

function SimulatorPage() {
  const params = useSearchParams();
  const { state, resetDemo } = useDemo();
  const [taskId, setTaskId] = useState(params.get("task") ?? HERO_TASK_ID);
  const [resetKey, setResetKey] = useState(0);
  const site = state.tasks.find((t) => t.id === taskId)?.site_id;

  return (
    <div>
      <PageHeader
        title="Risk Simulator"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Change environmental and operational inputs and see how task risk responds. <SimulatedTag>Demo data</SimulatedTag>
          </span>
        }
        actions={
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => {
              resetDemo();
              setTaskId(HERO_TASK_ID);
              setResetKey((k) => k + 1);
            }}
          >
            Reset to original scenario
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-sm text-ink-2">Task type</label>
        <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2 text-sm sm:w-96">
          {state.sites.map((s) => (
            <optgroup key={s.id} label={s.name}>
              {state.tasks
                .filter((t) => t.site_id === s.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {state.zones.find((z) => z.id === t.zone_id)?.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {site && site !== state.currentSiteId && <span className="text-xs text-ink-3">Task is on another site — switch site to see it on the dashboard.</span>}
      </div>
      <Simulator key={`${taskId}-${resetKey}`} taskId={taskId} />
    </div>
  );
}

function Simulator({ taskId }: { taskId: string }) {
  const { state, assess, simulate } = useDemo();
  const task = state.tasks.find((t) => t.id === taskId)!;
  const zone = state.zones.find((z) => z.id === task.zone_id)!;
  const [draft, setDraft] = useState<Draft>({
    temperature: zone.temperature,
    humidity: zone.humidity,
    wind_kmh: zone.wind_kmh,
    solar: zone.solar,
    hour: task.scenario_hour,
    intensity: task.intensity,
    exposure_minutes: task.exposure_minutes,
    ppe: task.ppe,
    shade: task.shade,
    cooling: task.cooling,
  });
  const [result, setResult] = useState<{ before: RiskResult; after: RiskResult; alert?: Alert } | null>(null);
  const [running, setRunning] = useState(false);

  const current = assess(taskId);
  const preview = assessRisk(draft, state.thresholds);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const run = () => {
    setRunning(true);
    setResult(null);
    // Short, real delay so the transition reads as an event; always resolves.
    setTimeout(() => {
      setResult(
        simulate(taskId, {
          zone: { temperature: draft.temperature, humidity: draft.humidity, wind_kmh: draft.wind_kmh, solar: draft.solar },
          task: { scenario_hour: draft.hour, intensity: draft.intensity, exposure_minutes: draft.exposure_minutes, ppe: draft.ppe, shade: draft.shade, cooling: draft.cooling },
        }),
      );
      setRunning(false);
    }, 450);
  };

  const liveAlert = result?.alert && state.alerts.find((a) => a.id === result.alert!.id && a.status === "active");
  const recs = recommendedActions(preview.level, preview.factors);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="p-6 lg:col-span-3">
        <div className="mb-5 grid gap-2 sm:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setDraft(p.draft)}
              className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-left transition-colors hover:border-ink-3"
            >
              <p.icon className="h-4 w-4 shrink-0 text-ink-2" />
              <span>
                <span className="block text-sm font-medium">{p.label}</span>
                <span className="block text-xs text-ink-3">{p.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">Environmental inputs · {zone.name} sensor</p>
        <div className="mt-3 space-y-5">
          <Slider label="Air temperature" unit="°C" min={20} max={45} value={draft.temperature} onChange={(v) => set("temperature", v)} />
          <Slider label="Relative humidity" unit="%" min={10} max={100} value={draft.humidity} onChange={(v) => set("humidity", v)} />
          <Slider label="Wind speed" unit=" km/h" min={0} max={40} value={draft.wind_kmh} onChange={(v) => set("wind_kmh", v)} />
          <Slider label="Time of day" min={6} max={20} step={0.5} value={draft.hour} display={clockLabel(draft.hour)} onChange={(v) => set("hour", v)} />
          <Field label="Solar exposure">
            <Segmented value={draft.solar} options={["Low", "Moderate", "High"]} onChange={(v) => set("solar", v)} />
          </Field>
        </div>

        <p className="mt-7 text-xs font-medium tracking-wide text-ink-3 uppercase">Operational inputs · supervisor & site configuration</p>
        <div className="mt-3 space-y-5">
          <Slider label="Exposure duration" unit=" min" min={0} max={180} value={draft.exposure_minutes} onChange={(v) => set("exposure_minutes", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Work intensity">
              <Segmented value={draft.intensity} options={["Low", "Moderate", "Heavy"]} onChange={(v) => set("intensity", v)} />
            </Field>
            <Field label="PPE / clothing category">
              <Segmented value={draft.ppe} options={["Light", "Standard", "Heavy"]} onChange={(v) => set("ppe", v)} />
            </Field>
            <Field label="Shade availability">
              <Segmented value={draft.shade} options={["Good", "Limited", "None"]} onChange={(v) => set("shade", v)} />
            </Field>
            <Field label="Cooling / rest area">
              <Segmented value={draft.cooling} options={["Available", "Limited", "None"]} onChange={(v) => set("cooling", v)} />
            </Field>
          </div>
        </div>

        <Button onClick={run} disabled={running} icon={Play} className="mt-6 w-full py-3">
          {running ? "Running simulation…" : "Run heat-risk simulation"}
        </Button>
        <p className="mt-3 text-center text-[11px] text-ink-3">Demo risk model — thresholds require occupational-health validation before real deployment.</p>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-2">{task.name}</p>
              <p className="text-xs text-ink-3">
                {zone.name} · {task.team}
              </p>
            </div>
            <span className="text-xs text-ink-3">Live on dashboard: {current.score}</span>
          </div>
          <div className="my-5 flex flex-col items-center">
            <ScoreRing score={preview.score} level={preview.level} size={150} />
            <p className={cx("mt-3 text-2xl font-semibold tracking-tight", LEVEL_STYLE[preview.level].fg)}>{LEVEL_STYLE[preview.level].label} heat risk</p>
            <p className="text-xs text-ink-3">Preview — run the simulation to apply</p>
          </div>
          <p className="text-xs font-medium text-ink-2">Explanation</p>
          <div className="mt-2">
            <WhyRiskIncreased risk={preview} />
          </div>
          <p className="mt-4 text-xs font-medium text-ink-2">Recommended intervention</p>
          {recs.length > 1 ? (
            <ul className="mt-1.5 space-y-1 text-sm">
              {recs.map((r) => (
                <li key={r} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-ink-2" />
                  {RECOMMENDATION_LABEL[r]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-ink-2">{actionSummary(preview)}</p>
          )}
        </Card>

        {running && <div className="skeleton h-40" />}
        {result && <TransitionCard before={result.before} after={result.after} />}
        {liveAlert && <AlertCard alert={liveAlert} />}
        {result?.alert && !liveAlert && (
          <Banner tone="info">
            Alert handled — see the{" "}
            <Link className="font-medium underline" href="/safety-log">
              Safety Log
            </Link>
            .
          </Banner>
        )}
        {result && (
          <Link href="/dashboard" className="block">
            <Button variant="secondary" className="w-full" icon={ArrowRight}>
              See it on the dashboard
            </Button>
          </Link>
        )}
        {!result && !running && (
          <Card className="p-5 text-sm text-ink-2">
            <p className="flex items-center gap-2 font-medium text-ink">
              <FlaskConical className="h-4 w-4" /> Try this
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Load “Morning baseline” and run — Moderate.</li>
              <li>Load “Peak heat” and run — High, alert raised for the Roof Zone.</li>
              <li>Load “Heatwave afternoon” and run — Critical, with “Pause task” recommended.</li>
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}

function TransitionCard({ before, after }: { before: RiskResult; after: RiskResult }) {
  const delta = after.score - before.score;
  const up = levelRank(after.level) > levelRank(before.level);
  const down = levelRank(after.level) < levelRank(before.level);
  const changes = after.factors
    .map((f) => ({ f, d: Math.round((f.points - (before.factors.find((b) => b.key === f.key)?.points ?? 0)) * 10) / 10 }))
    .filter((x) => x.d !== 0)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  return (
    <Card className={cx("animate-pop p-5", up && "border-critical/30", down && "border-low/30")}>
      <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">Simulation result</p>
      <p className="mt-1 text-lg font-semibold">{up ? "Risk increased" : down ? "Risk decreased" : delta === 0 ? "No change in risk" : "Risk level unchanged"}</p>
      <div className="mt-3 flex items-center gap-3">
        <RiskBadge level={before.level} size="md" />
        <ArrowRight className="h-4 w-4 text-ink-3" />
        <RiskBadge level={after.level} size="md" />
        <span className={cx("tabular ml-auto text-sm font-semibold", delta > 0 ? "text-critical" : delta < 0 ? "text-low" : "text-ink-3")}>
          {before.score} → {after.score} ({delta >= 0 ? "+" : ""}
          {delta})
        </span>
      </div>
      {changes.length > 0 && (
        <>
          <p className="mt-4 text-xs font-medium text-ink-2">Why</p>
          <ul className="mt-1.5 space-y-1">
            {changes.map(({ f, d }) => (
              <li key={f.key} className="flex items-center justify-between text-sm">
                <span>
                  {f.label} <span className="text-ink-3">· {f.value}</span>
                </span>
                <span className={cx("tabular inline-flex items-center gap-0.5 text-xs font-medium", d > 0 ? "text-high" : "text-low")}>
                  {d > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {d > 0 ? "+" : ""}
                  {d}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function Slider({
  label,
  unit = "",
  min,
  max,
  step = 1,
  value,
  display,
  onChange,
}: {
  label: string;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  display?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="tabular text-base font-semibold">
          {display ?? value}
          {display ? "" : unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full" aria-label={label} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-ink-2">{label}</p>
      {children}
    </div>
  );
}
