// Domain model — mirrors supabase/schema.sql so the demo store can be swapped for Postgres.

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type ActivityLevel = "Low" | "Moderate" | "Heavy";
export type PpeLevel = "Low" | "Medium" | "High";
export type ShadeAvailability = "Good" | "Limited" | "None";
export type SolarExposure = "Low" | "Moderate" | "High";

export interface Organization {
  id: string;
  name: string;
}

export interface Site {
  id: string;
  organization_id: string;
  name: string;
  location: string;
  status: "Normal" | "Elevated" | "Severe";
  temperature: number;
  humidity: number;
  solar: SolarExposure;
  weather_online: boolean;
  weather_last_update: string; // HH:MM, shown when the feed is offline
}

export interface Worker {
  id: string;
  site_id: string;
  name: string;
  role: string;
  task: string;
  baseline_heart_rate: number;
  ppe_level: PpeLevel;
  status: "Working" | "On break" | "Cooling down" | "Off shift";
}

export interface SensorReading {
  id: string;
  worker_id: string;
  temperature: number;
  humidity: number;
  wbgt: number;
  heart_rate: number | null; // null = wearable not reporting
  activity_level: ActivityLevel;
  exposure_minutes: number;
  shade_available: ShadeAvailability;
  solar: SolarExposure;
  ppe_level: PpeLevel;
  timestamp: string; // ISO
}

export interface RiskFactor {
  key: string;
  label: string;
  value: string;
  points: number;
  max: number;
  elevated: boolean;
  missing?: boolean;
}

export interface RiskAssessment {
  id: string;
  worker_id: string;
  score: number;
  risk_level: RiskLevel;
  factors: RiskFactor[];
  timestamp: string;
}

export type AlertStatus = "active" | "confirmed" | "escalated" | "dismissed" | "resolved";

export interface Alert {
  id: string;
  worker_id: string;
  risk_assessment_id: string;
  severity: RiskLevel;
  message: string;
  status: AlertStatus;
  created_at: string;
  recommended: string[];
  snapshot: { temperature: number; humidity: number; exposure: number; task: string; score: number };
}

export type InterventionType =
  | "Cooling break"
  | "Hydration"
  | "Move to shade"
  | "Work rotation"
  | "Escalated to site medic";

export interface Intervention {
  id: string;
  alert_id: string;
  type: InterventionType[];
  confirmed_by: string;
  confirmed_at: string;
  notes: string;
}

export interface SafetyLogEntry {
  id: string;
  worker_id: string;
  worker_name: string;
  site_id: string;
  task: string;
  risk_level: RiskLevel;
  score: number;
  intervention: string;
  resolution: "Resolved" | "Monitoring" | "Escalated" | "Dismissed";
  supervisor: string;
  notes?: string;
  timestamp: string; // ISO
}
