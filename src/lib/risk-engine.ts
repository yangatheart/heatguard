/**
 * SiteSafe SI demo risk model.
 *
 * Answers: which site, zone or task is creating elevated heat risk right now, and
 * what should the supervisor do? Inputs are measurable environmental conditions
 * (per zone) and recorded operational inputs (per task) — never physiological data.
 *
 * Deterministic and transparent: every point in the score is attributable to one
 * named factor. No LLM is involved in scoring. All weights and thresholds live in
 * RISK_CONFIG so they can be reviewed and changed in one place.
 *
 * DEMO ONLY — weights and thresholds require occupational-health validation
 * before any real deployment.
 */
import type {
  CoolingAvailability,
  Intensity,
  InterventionType,
  PpeCategory,
  RiskFactor,
  RiskLevel,
  ShadeAvailability,
  SolarExposure,
  Task,
  Zone,
} from "./types";

export interface Thresholds {
  moderate: number; // score >= moderate → MODERATE
  high: number;
  critical: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { moderate: 30, high: 55, critical: 75 };

export const RISK_CONFIG = {
  temperature: { start: 24, perDegree: 1.4, max: 15 },
  humidity: { start: 40, perPercent: 0.25, max: 8 },
  wbgt: { start: 25, perDegree: 2, max: 14 },
  solar: { Low: 0, Moderate: 1.5, High: 3 } as Record<SolarExposure, number>,
  wind: { calmBelowKmh: 5, lightBelowKmh: 15, calm: 4, light: 2 },
  timeOfDay: { peakFrom: 12, peakTo: 17, peak: 4, shoulder: 2 },
  intensity: { Low: 0, Moderate: 6, Heavy: 12 } as Record<Intensity, number>,
  exposure: { start: 20, perMinute: 0.18, max: 14 },
  ppe: { Light: 0, Standard: 3, Heavy: 6 } as Record<PpeCategory, number>,
  shade: { Good: 0, Limited: 4, None: 8 } as Record<ShadeAvailability, number>,
  cooling: { Available: 0, Limited: 3, None: 6 } as Record<CoolingAvailability, number>,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Simplified WBGT estimate for the demo, calculated from air temperature and humidity. */
export function estimateWbgt(temperature: number, humidity: number): number {
  return Math.round(temperature - (100 - humidity) * 0.125);
}

export function levelFor(score: number, t: Thresholds = DEFAULT_THRESHOLDS): RiskLevel {
  if (score >= t.critical) return "CRITICAL";
  if (score >= t.high) return "HIGH";
  if (score >= t.moderate) return "MODERATE";
  return "LOW";
}

export const clockLabel = (hour: number) => `${String(Math.floor(hour)).padStart(2, "0")}:${hour % 1 ? "30" : "00"}`;

export interface RiskInputs {
  // Environmental (zone sensor / weather API)
  temperature: number;
  humidity: number;
  wind_kmh: number;
  solar: SolarExposure;
  hour: number;
  // Operational (supervisor / site inputs)
  intensity: Intensity;
  exposure_minutes: number;
  ppe: PpeCategory;
  shade: ShadeAvailability;
  cooling: CoolingAvailability;
}

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  wbgt: number;
}

export function assessRisk(input: RiskInputs, thresholds: Thresholds = DEFAULT_THRESHOLDS): RiskResult {
  const c = RISK_CONFIG;
  const wbgt = estimateWbgt(input.temperature, input.humidity);
  const windPts = input.wind_kmh < c.wind.calmBelowKmh ? c.wind.calm : input.wind_kmh < c.wind.lightBelowKmh ? c.wind.light : 0;
  const peak = input.hour >= c.timeOfDay.peakFrom && input.hour < c.timeOfDay.peakTo;
  const shoulder = (input.hour >= c.timeOfDay.peakFrom - 1 && input.hour < c.timeOfDay.peakFrom) || (input.hour >= c.timeOfDay.peakTo && input.hour < c.timeOfDay.peakTo + 1);

  const factors: RiskFactor[] = [
    {
      key: "temperature",
      label: "Temperature",
      value: `${input.temperature}°C`,
      points: r1(clamp((input.temperature - c.temperature.start) * c.temperature.perDegree, 0, c.temperature.max)),
      max: c.temperature.max,
      elevated: input.temperature >= 30,
      source: "Environmental sensor",
    },
    {
      key: "humidity",
      label: "Humidity",
      value: `${input.humidity}%`,
      points: r1(clamp((input.humidity - c.humidity.start) * c.humidity.perPercent, 0, c.humidity.max)),
      max: c.humidity.max,
      elevated: input.humidity >= 60,
      source: "Environmental sensor",
    },
    {
      key: "wbgt",
      label: "WBGT",
      value: `${wbgt}°C`,
      points: r1(clamp((wbgt - c.wbgt.start) * c.wbgt.perDegree, 0, c.wbgt.max)),
      max: c.wbgt.max,
      elevated: wbgt >= 28,
      source: "Calculated",
    },
    {
      key: "solar",
      label: "Solar exposure",
      value: input.solar,
      points: c.solar[input.solar],
      max: c.solar.High,
      elevated: input.solar === "High",
      source: "Environmental sensor",
    },
    {
      key: "wind",
      label: "Wind speed",
      value: `${input.wind_kmh} km/h`,
      points: windPts,
      max: c.wind.calm,
      elevated: input.wind_kmh < c.wind.calmBelowKmh,
      source: "Environmental sensor",
    },
    {
      key: "time",
      label: "Time of day",
      value: clockLabel(input.hour),
      points: peak ? c.timeOfDay.peak : shoulder ? c.timeOfDay.shoulder : 0,
      max: c.timeOfDay.peak,
      elevated: peak,
      source: "Demo scenario time",
    },
    {
      key: "intensity",
      label: "Work intensity",
      value: input.intensity,
      points: c.intensity[input.intensity],
      max: c.intensity.Heavy,
      elevated: input.intensity === "Heavy",
      source: "Supervisor input",
    },
    {
      key: "exposure",
      label: "Exposure duration",
      value: `${input.exposure_minutes} min`,
      points: r1(clamp((input.exposure_minutes - c.exposure.start) * c.exposure.perMinute, 0, c.exposure.max)),
      max: c.exposure.max,
      elevated: input.exposure_minutes >= 60,
      source: "Site/task tracking",
    },
    {
      key: "ppe",
      label: "PPE / clothing category",
      value: input.ppe,
      points: c.ppe[input.ppe],
      max: c.ppe.Heavy,
      elevated: input.ppe === "Heavy",
      source: "Supervisor input",
    },
    {
      key: "shade",
      label: "Shade availability",
      value: input.shade,
      points: c.shade[input.shade],
      max: c.shade.None,
      elevated: input.shade !== "Good",
      source: "Site configuration",
    },
    {
      key: "cooling",
      label: "Cooling / rest area",
      value: input.cooling,
      points: c.cooling[input.cooling],
      max: c.cooling.None,
      elevated: input.cooling !== "Available",
      source: "Site configuration",
    },
  ];

  const score = clamp(Math.round(factors.reduce((s, f) => s + f.points, 0)), 0, 100);
  return { score, level: levelFor(score, thresholds), factors, wbgt };
}

export function taskInputs(task: Task, zone: Zone): RiskInputs {
  return {
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
  };
}

export const assessTask = (task: Task, zone: Zone, thresholds?: Thresholds) => assessRisk(taskInputs(task, zone), thresholds);

/** Elevated factors, largest first — the "trigger" recorded with an alert. */
export const topDrivers = (r: RiskResult, n = 3) =>
  r.factors
    .filter((f) => f.elevated && f.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, n);

/** Wording used wherever a recommended intervention is shown. */
export const RECOMMENDATION_LABEL: Record<InterventionType, string> = {
  Hydration: "Hydration",
  "Cooling/rest break": "Cooling/rest break",
  "Move activity to shade": "Move activity to shade where possible",
  "Work rotation": "Consider work rotation",
  "Pause task": "Pause task until conditions are reassessed",
  "Escalated to site safety manager": "Escalate to site safety manager",
};

/** Recommended interventions come from fixed rules, never from the LLM. */
export function recommendedActions(level: RiskLevel, factors: RiskFactor[]): InterventionType[] {
  if (level === "LOW") return [];
  if (level === "MODERATE") return ["Hydration"];
  const heavy = factors.some((f) => (f.key === "intensity" || f.key === "exposure") && f.elevated);
  const actions: InterventionType[] = ["Hydration", "Cooling/rest break", "Move activity to shade"];
  if (heavy || level === "CRITICAL") actions.push("Work rotation");
  if (level === "CRITICAL") actions.push("Pause task");
  return actions;
}

/** One-line action summary for tables and team views. */
export function actionSummary(r: RiskResult): string {
  if (r.level === "LOW") return "Routine monitoring";
  if (r.level === "MODERATE") return "Hydration reminder · monitor at next check";
  return recommendedActions(r.level, r.factors)
    .map((a) => RECOMMENDATION_LABEL[a])
    .join(" · ");
}

export const LEVEL_ORDER: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
export const levelRank = (l: RiskLevel) => LEVEL_ORDER.indexOf(l);
export const maxLevel = (levels: RiskLevel[]): RiskLevel => levels.reduce<RiskLevel>((m, l) => (levelRank(l) > levelRank(m) ? l : m), "LOW");

/** Site-level heat risk is driven by environmental conditions only (calculated WBGT). */
export const SITE_WBGT_BANDS = { moderate: 25, high: 29, critical: 33 };

export function siteLevel(temperature: number, humidity: number): RiskLevel {
  const w = estimateWbgt(temperature, humidity);
  if (w >= SITE_WBGT_BANDS.critical) return "CRITICAL";
  if (w >= SITE_WBGT_BANDS.high) return "HIGH";
  if (w >= SITE_WBGT_BANDS.moderate) return "MODERATE";
  return "LOW";
}
