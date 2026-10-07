"use client";

import { Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Banner, Button, Card, PageHeader, Toggle } from "@/components/ui";
import { DEFAULT_THRESHOLDS, RISK_CONFIG } from "@/lib/risk-engine";
import { LEVEL_STYLE, cx } from "@/lib/format";
import { useDemo } from "@/lib/store";

export default function SettingsPage() {
  const { state, updateSettings, resetDemo } = useDemo();
  const [t, setT] = useState(state.thresholds);
  const valid = t.moderate > 0 && t.moderate < t.high && t.high < t.critical && t.critical <= 100;
  const dirty = JSON.stringify(t) !== JSON.stringify(state.thresholds);

  const sc = state.siteConfig;
  const ap = state.alertPrefs;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Risk model, alerting and site safety configuration" />

      <Section title="Risk thresholds" desc="Score bands used by the deterministic rule engine (0–100).">
        <Banner tone="warn">Demo risk model — thresholds require occupational-health validation before real deployment.</Banner>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <BandField label="Low" level="LOW" value={0} readOnly suffix={`– ${t.moderate - 1}`} />
          <BandField label="Moderate" level="MODERATE" value={t.moderate} onChange={(v) => setT({ ...t, moderate: v })} suffix={`– ${t.high - 1}`} />
          <BandField label="High" level="HIGH" value={t.high} onChange={(v) => setT({ ...t, high: v })} suffix={`– ${t.critical - 1}`} />
          <BandField label="Critical" level="CRITICAL" value={t.critical} onChange={(v) => setT({ ...t, critical: v })} suffix="– 100" />
        </div>
        {!valid && <p className="mt-2 text-sm text-critical">Bands must increase: Moderate &lt; High &lt; Critical ≤ 100.</p>}
        <div className="mt-4 flex gap-2">
          <Button disabled={!valid || !dirty} onClick={() => updateSettings({ thresholds: t })}>
            Save thresholds
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setT(DEFAULT_THRESHOLDS);
              updateSettings({ thresholds: DEFAULT_THRESHOLDS });
            }}
          >
            Restore defaults
          </Button>
        </div>
        <details className="mt-5 rounded-xl border border-line p-4 text-sm">
          <summary className="cursor-pointer font-medium">View rule-engine weights</summary>
          <p className="mt-2 text-xs text-ink-3">Defined in src/lib/risk-engine.ts → RISK_CONFIG. Every point in a score is attributable to one of these factors.</p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-line-2/60 p-3 text-xs">{JSON.stringify(RISK_CONFIG, null, 2)}</pre>
        </details>
      </Section>

      <Section title="Alert preferences">
        <Row label="Worker alerts" desc="Haptic prompt on the worker's wearable to hydrate or rest">
          <Toggle label="Worker alerts" checked={ap.workerAlerts} onChange={(v) => updateSettings({ alertPrefs: { ...ap, workerAlerts: v } })} />
        </Row>
        <Row label="Supervisor alerts" desc="Push + dashboard alert when a worker reaches High or Critical">
          <Toggle label="Supervisor alerts" checked={ap.supervisorAlerts} onChange={(v) => updateSettings({ alertPrefs: { ...ap, supervisorAlerts: v } })} />
        </Row>
        <Row label="Escalation" desc={`Escalate to safety manager if not confirmed within ${ap.escalationMinutes} min`}>
          <div className="flex items-center gap-3">
            <NumberInput value={ap.escalationMinutes} min={1} max={30} onChange={(v) => updateSettings({ alertPrefs: { ...ap, escalationMinutes: v } })} unit="min" />
            <Toggle label="Escalation" checked={ap.escalation} onChange={(v) => updateSettings({ alertPrefs: { ...ap, escalation: v } })} />
          </div>
        </Row>
      </Section>

      <Section title="Site safety configuration">
        <Row label="Cooling area" desc="Where workers are sent for recovery breaks">
          <input
            value={sc.coolingArea}
            onChange={(e) => updateSettings({ siteConfig: { ...sc, coolingArea: e.target.value } })}
            className="w-56 rounded-xl border border-line px-3 py-2 text-sm"
          />
        </Row>
        <Row label="Hydration availability" desc="Drinking water stations on site">
          <Toggle label="Hydration availability" checked={sc.hydrationAvailable} onChange={(v) => updateSettings({ siteConfig: { ...sc, hydrationAvailable: v } })} />
        </Row>
        <Row label="Break duration" desc="Configured recovery break">
          <NumberInput value={sc.breakMinutes} min={5} max={60} unit="min" onChange={(v) => updateSettings({ siteConfig: { ...sc, breakMinutes: v } })} />
        </Row>
        <Row label="Maximum continuous exposure" desc="Prompt a break after this many minutes in direct heat">
          <NumberInput value={sc.maxContinuousExposure} min={15} max={180} unit="min" onChange={(v) => updateSettings({ siteConfig: { ...sc, maxContinuousExposure: v } })} />
        </Row>
      </Section>

      <Section title="Privacy">
        <div className="flex gap-3 rounded-xl bg-low-bg/70 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-low" />
          <p className="text-sm font-medium">HeatGuard is designed for safety management, not punitive productivity surveillance.</p>
        </div>
        <Row label="Use wearable data" desc="Wearable data is optional. When off, risk is assessed from environmental and activity signals only.">
          <Toggle label="Use wearable data" checked={state.wearablesEnabled} onChange={(v) => updateSettings({ wearablesEnabled: v })} />
        </Row>
        <ul className="mt-2 grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
          {[
            "Personal data minimised to name, role, site and heat-risk signals",
            "Worker consent captured where required before pairing a wearable",
            "Supervisors can override any assessment; overrides are logged",
            "Simulated and missing data are always labelled",
            "All alerts, interventions and overrides are written to the audit log",
            "No productivity or location-tracking metrics are collected",
          ].map((i) => (
            <li key={i} className="flex gap-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
              {i}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Demo data">
        <Row label="Reset demo" desc="Restore the original Madrid scenario, alerts and safety log">
          <Button variant="secondary" icon={RotateCcw} onClick={() => { resetDemo(); setT(DEFAULT_THRESHOLDS); }}>
            Reset
          </Button>
        </Row>
      </Section>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className="mt-0.5 mb-4 text-sm text-ink-2">{desc}</p>}
      <div className={cx(!desc && "mt-4")}>{children}</div>
    </Card>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line-2 py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-ink-3">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, unit }: { value: number; onChange: (v: number) => void; min: number; max: number; unit: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="tabular w-20 rounded-xl border border-line px-3 py-2 text-sm"
      />
      <span className="text-sm text-ink-3">{unit}</span>
    </div>
  );
}

function BandField({
  label,
  level,
  value,
  onChange,
  readOnly,
  suffix,
}: {
  label: string;
  level: keyof typeof LEVEL_STYLE;
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  suffix: string;
}) {
  return (
    <div className={cx("rounded-xl p-3", LEVEL_STYLE[level].bg)}>
      <p className={cx("text-xs font-medium", LEVEL_STYLE[level].fg)}>{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className={cx("tabular w-16 rounded-lg border border-black/5 bg-white/80 px-2 py-1 text-sm font-semibold", readOnly && "text-ink-3")}
        />
        <span className="tabular text-sm text-ink-2">{suffix}</span>
      </div>
    </div>
  );
}
