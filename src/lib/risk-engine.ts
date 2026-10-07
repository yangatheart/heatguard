/**
 * HeatGuard demo risk model.
 *
 * Deterministic and transparent: every point in the score is attributable to one
 * named factor. No LLM is involved in scoring. All weights and thresholds live in
 * RISK_CONFIG so they can be reviewed and changed in one place.
 *
 * DEMO ONLY — weights and thresholds require occupational-health validation
 * before any real deployment. This is not a medical assessment.
 */
import type {
  ActivityLevel,
  PpeLevel,
  RiskFactor,
  RiskLevel,
  SensorReading,
  ShadeAvailability,
  SolarExposure,
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
  heartRate: { perBpmAboveBaseline: 0.47, max: 17 },
  activity: { Low: 0, Moderate: 6, Heavy: 12 } as Record<ActivityLevel, number>,
  exposure: { start: 20, perMinute: 0.18, max: 14 },
  ppe: { Low: 0, Medium: 3, High: 6 } as Record<PpeLevel, number>,
  shade: { Good: 0, Limited: 4, None: 8 } as Record<ShadeAvailability, number>,
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

/** Simplified WBGT estimate for the demo (no globe/wind sensor). */
export function estimateWbgt(temperature: number, humidity: number): number {
  return Math.round(temperature - (100 - humidity) * 0.125);
}

export function levelFor(score: number, t: Thresholds = DEFAULT_THRESHOLDS): RiskLevel {
  if (score >= t.critical) return "CRITICAL";
  if (score >= t.high) return "HIGH";
  if (score >= t.moderate) return "MODERATE";
  return "LOW";
}

export type RiskInputs = Pick<
  SensorReading,
  | "temperature"
  | "humidity"
  | "heart_rate"
  | "activity_level"
  | "exposure_minutes"
  | "shade_available"
  | "solar"
  | "ppe_level"
> & { baseline_heart_rate: number };

export interface RiskResult {
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  wbgt: number;
  heartRateMissing: boolean;
}

export function assessRisk(input: RiskInputs, thresholds: Thresholds = DEFAULT_THRESHOLDS): RiskResult {
  const c = RISK_CONFIG;
  const wbgt = estimateWbgt(input.temperature, input.humidity);
  const hrMissing = input.heart_rate == null;
  const hrDelta = hrMissing ? 0 : input.heart_rate! - input.baseline_heart_rate;

  const factors: RiskFactor[] = [
    {
      key: "temperature",
      label: "Temperature",
      value: `${input.temperature}°C`,
      points: r1(clamp((input.temperature - c.temperature.start) * c.temperature.perDegree, 0, c.temperature.max)),
      max: c.temperature.max,
      elevated: input.temperature >= 30,
    },
    {
      key: "humidity",
      label: "Humidity",
      value: `${input.humidity}%`,
      points: r1(clamp((input.humidity - c.humidity.start) * c.humidity.perPercent, 0, c.humidity.max)),
      max: c.humidity.max,
      elevated: input.humidity >= 60,
    },
    {
      key: "wbgt",
      label: "Heat indicator (WBGT est.)",
      value: `${wbgt}°C`,
      points: r1(clamp((wbgt - c.wbgt.start) * c.wbgt.perDegree, 0, c.wbgt.max)),
      max: c.wbgt.max,
      elevated: wbgt >= 28,
    },
    {
      key: "solar",
      label: "Solar exposure",
      value: input.solar,
      points: c.solar[input.solar],
      max: c.solar.High,
      elevated: input.solar === "High",
    },
    {
      key: "heart_rate",
      label: "Heart rate vs baseline",
      value: hrMissing
        ? "Unavailable"
        : `${input.heart_rate} bpm (${hrDelta >= 0 ? "+" : ""}${hrDelta} vs ${input.baseline_heart_rate})`,
      points: hrMissing ? 0 : r1(clamp(hrDelta * c.heartRate.perBpmAboveBaseline, 0, c.heartRate.max)),
      max: c.heartRate.max,
      elevated: !hrMissing && hrDelta >= 15,
      missing: hrMissing,
    },
    {
      key: "activity",
      label: "Activity intensity",
      value: input.activity_level,
      points: c.activity[input.activity_level],
      max: c.activity.Heavy,
      elevated: input.activity_level === "Heavy",
    },
    {
      key: "exposure",
      label: "Exposure duration",
      value: `${input.exposure_minutes} min`,
      points: r1(clamp((input.exposure_minutes - c.exposure.start) * c.exposure.perMinute, 0, c.exposure.max)),
      max: c.exposure.max,
      elevated: input.exposure_minutes >= 60,
    },
    {
      key: "ppe",
      label: "PPE / clothing coverage",
      value: `${input.ppe_level} coverage`,
      points: c.ppe[input.ppe_level],
      max: c.ppe.High,
      elevated: input.ppe_level === "High",
    },
    {
      key: "shade",
      label: "Shade access",
      value: input.shade_available,
      points: c.shade[input.shade_available],
      max: c.shade.None,
      elevated: input.shade_available !== "Good",
    },
  ];

  const score = clamp(Math.round(factors.reduce((s, f) => s + f.points, 0)), 0, 100);
  return { score, level: levelFor(score, thresholds), factors, wbgt, heartRateMissing: hrMissing };
}

/** Recommended interventions come from fixed rules, never from the LLM. */
export function recommendedActions(level: RiskLevel, factors: RiskFactor[]): string[] {
  if (level === "LOW") return [];
  if (level === "MODERATE") return ["Hydration reminder", "Monitor at next check-in"];
  const actions = ["Move to cooling area", "Hydrate", "Take configured recovery break"];
  if (level === "CRITICAL" || factors.find((f) => f.key === "activity" && f.elevated)) {
    actions.push("Rotate to lighter task before returning");
  }
  return actions;
}

export const LEVEL_ORDER: RiskLevel[] = ["LOW", "MODERATE", "HIGH", "CRITICAL"];
export const levelRank = (l: RiskLevel) => LEVEL_ORDER.indexOf(l);

/** Site-level heat risk is driven by environmental conditions only (estimated WBGT). */
export const SITE_WBGT_BANDS = { moderate: 25, high: 29, critical: 33 };

export function siteLevel(temperature: number, humidity: number): RiskLevel {
  const w = estimateWbgt(temperature, humidity);
  if (w >= SITE_WBGT_BANDS.critical) return "CRITICAL";
  if (w >= SITE_WBGT_BANDS.high) return "HIGH";
  if (w >= SITE_WBGT_BANDS.moderate) return "MODERATE";
  return "LOW";
}
