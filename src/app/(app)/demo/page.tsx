"use client";

import { ArrowDown, ArrowRight, ArrowUp, FlaskConical, Play, RotateCcw, Sunrise, Flame } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, PageHeader, RiskBadge, ScoreRing, Segmented, SimulatedTag, Toggle, Banner } from "@/components/ui";
import { AlertCard } from "@/components/workflow";
import { HERO_WORKER_ID } from "@/lib/demo-data";
import { LEVEL_STYLE, cx } from "@/lib/format";
import { assessRisk, levelRank, type RiskResult } from "@/lib/risk-engine";
import { useDemo, type ReadingPatch } from "@/lib/store";
import type { ActivityLevel, Alert, PpeLevel, ShadeAvailability } from "@/lib/types";

export default function DemoPage() {
  return (
    <Suspense>
      <DemoInner />
    </Suspense>
  );
}

interface Draft {
  temperature: number;
  humidity: number;
  heart_rate: number;
  hrAvailable: boolean;
  exposure_minutes: number;
  activity_level: ActivityLevel;
  ppe_level: PpeLevel;
  shade_available: ShadeAvailability;
}

const PRESETS: { id: string; label: string; icon: typeof Sunrise; hint: string; draft: Draft }[] = [
  {
    id: "morning",
    label: "Morning baseline",
    icon: Sunrise,
    hint: "10:00 · 31°C · 55% · 45 min",
    draft: { temperature: 31, humidity: 55, heart_rate: 108, hrAvailable: true, exposure_minutes: 45, activity_level: "Heavy", ppe_level: "High", shade_available: "Limited" },
  },
  {
    id: "peak",
    label: "Peak heat (hero scenario)",
    icon: Flame,
    hint: "14:30 · 35°C · 68% · 82 min",
    draft: { temperature: 35, humidity: 68, heart_rate: 128, hrAvailable: true, exposure_minutes: 82, activity_level: "Heavy", ppe_level: "High", shade_available: "Limited" },
  },
];

function DemoInner() {
  const params = useSearchParams();
  const { state, resetDemo } = useDemo();
  const [workerId, setWorkerId] = useState(params.get("worker") ?? HERO_WORKER_ID);
  const [resetKey, setResetKey] = useState(0);
  const site = state.workers.find((w) => w.id === workerId)?.site_id;

  return (
    <div>
      <PageHeader
        title="Demo Mode"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Simulate changing conditions — no wearable hardware required. <SimulatedTag />
          </span>
        }
        actions={
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => {
              resetDemo();
              setWorkerId(HERO_WORKER_ID);
              setResetKey((k) => k + 1);
            }}
          >
            Reset to original scenario
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-sm text-ink-2">Worker</label>
        <select
          value={workerId}
          onChange={(e) => setWorkerId(e.target.value)}
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm sm:w-80"
        >
          {state.sites.map((s) => (
            <optgroup key={s.id} label={s.name}>
              {state.workers
                .filter((w) => w.site_id === s.id)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} — {w.task}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {site && site !== state.currentSiteId && <span className="text-xs text-ink-3">Worker is on another site — switch site to see them on the dashboard.</span>}
      </div>
      <Simulator key={`${workerId}-${resetKey}`} workerId={workerId} />
    </div>
  );
}

function Simulator({ workerId }: { workerId: string }) {
  const { state, assess, simulate } = useDemo();
  const worker = state.workers.find((w) => w.id === workerId)!;
  const rd = state.readings[workerId];
  const [draft, setDraft] = useState<Draft>({
    temperature: rd.temperature,
    humidity: rd.humidity,
    heart_rate: rd.heart_rate ?? worker.baseline_heart_rate + 10,
    hrAvailable: rd.heart_rate != null,
    exposure_minutes: rd.exposure_minutes,
    activity_level: rd.activity_level,
    ppe_level: rd.ppe_level,
    shade_available: rd.shade_available,
  });
  const [result, setResult] = useState<{ before: RiskResult; after: RiskResult; alert?: Alert } | null>(null);
  const [running, setRunning] = useState(false);

  const current = assess(workerId);
  const preview = assessRisk(
    { ...rd, ...draft, heart_rate: draft.hrAvailable && state.wearablesEnabled ? draft.heart_rate : null, baseline_heart_rate: worker.baseline_heart_rate },
    state.thresholds,
  );
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const run = () => {
    setRunning(true);
    setResult(null);
    const patch: ReadingPatch = {
      temperature: draft.temperature,
      humidity: draft.humidity,
      heart_rate: draft.hrAvailable ? draft.heart_rate : null,
      exposure_minutes: draft.exposure_minutes,
      activity_level: draft.activity_level,
      ppe_level: draft.ppe_level,
      shade_available: draft.shade_available,
    };
    // Short, real delay so the transition reads as an event; always resolves.
    setTimeout(() => {
      setResult(simulate(workerId, patch));
      setRunning(false);
    }, 450);
  };

  const liveAlert = result?.alert && state.alerts.find((a) => a.id === result.alert!.id && a.status === "active");

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="p-6 lg:col-span-3">
        <div className="mb-5 grid gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setDraft(p.draft)}
              className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-left transition-colors hover:border-ink-3"
            >
              <p.icon className="h-4 w-4 text-ink-2" />
              <span>
                <span className="block text-sm font-medium">{p.label}</span>
                <span className="block text-xs text-ink-3">{p.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-5">
          <Slider label="Temperature" unit="°C" min={20} max={45} value={draft.temperature} onChange={(v) => set("temperature", v)} />
          <Slider label="Humidity" unit="%" min={10} max={100} value={draft.humidity} onChange={(v) => set("humidity", v)} />
          <div>
            <Slider
              label={`Heart rate (baseline ${worker.baseline_heart_rate} bpm)`}
              unit=" bpm"
              min={60}
              max={180}
              value={draft.heart_rate}
              disabled={!draft.hrAvailable}
              onChange={(v) => set("heart_rate", v)}
            />
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-2">
              <Toggle checked={draft.hrAvailable} onChange={(v) => set("hrAvailable", v)} label="Heart-rate sensor available" />
              Wearable heart-rate sensor {draft.hrAvailable ? "reporting" : "unavailable (simulate missing data)"}
            </div>
          </div>
          <Slider label="Exposure duration" unit=" min" min={0} max={180} value={draft.exposure_minutes} onChange={(v) => set("exposure_minutes", v)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Activity intensity">
              <Segmented value={draft.activity_level} options={["Low", "Moderate", "Heavy"]} onChange={(v) => set("activity_level", v)} />
            </Field>
            <Field label="PPE">
              <Segmented value={draft.ppe_level} options={["Low", "Medium", "High"]} onChange={(v) => set("ppe_level", v)} />
            </Field>
            <Field label="Shade availability">
              <Segmented value={draft.shade_available} options={["Good", "Limited", "None"]} onChange={(v) => set("shade_available", v)} />
            </Field>
          </div>
        </div>

        <Button onClick={run} disabled={running} icon={Play} className="mt-6 w-full py-3">
          {running ? "Running simulation…" : "Run heat-risk simulation"}
        </Button>
        {!state.wearablesEnabled && (
          <div className="mt-3">
            <Banner tone="info">Wearable data is disabled in Settings — heart rate is excluded from all assessments.</Banner>
          </div>
        )}
      </Card>

      <div className="space-y-4 lg:col-span-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink-2">{worker.name}</p>
              <p className="text-xs text-ink-3">{worker.task}</p>
            </div>
            <span className="text-xs text-ink-3">Live on dashboard: {current.score}</span>
          </div>
          <div className="my-5 flex flex-col items-center">
            <ScoreRing score={preview.score} level={preview.level} size={150} />
            <p className={cx("mt-3 text-2xl font-semibold tracking-tight", LEVEL_STYLE[preview.level].fg)}>{preview.level}</p>
            <p className="text-xs text-ink-3">Preview — run the simulation to apply</p>
          </div>
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
              <li>Move temperature from 31°C → 35°C and run — risk increases to High.</li>
              <li>Load “Peak heat” and run — Critical, alert raised.</li>
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
  unit,
  min,
  max,
  value,
  onChange,
  disabled,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cx(disabled && "opacity-40")}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-2">{label}</span>
        <span className="tabular text-base font-semibold">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full"
        aria-label={label}
      />
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
