// Domain model — mirrors supabase/schema.sql so the demo store can be swapped for Postgres.
//
// SiteSafe SI is site-first: risk is assessed per task, from measurable environmental
// conditions (zone) and recorded operational inputs (task). No physiological, wearable
// or medical data exists anywhere in this model.

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type Intensity = "Low" | "Moderate" | "Heavy";
export type PpeCategory = "Light" | "Standard" | "Heavy";
export type ShadeAvailability = "Good" | "Limited" | "None";
export type CoolingAvailability = "Available" | "Limited" | "None";
export type SolarExposure = "Low" | "Moderate" | "High";
export type ZoneSetting = "Outdoor" | "Indoor" | "Covered";

/** Where a value comes from — shown next to it in the UI. */
export type DataSource =
  | "Environmental sensor"
  | "Calculated"
  | "Supervisor input"
  | "Site/task tracking"
  | "Site configuration"
  | "Demo scenario time";

export interface Organization {
  id: string;
  name: string;
}

export interface Site {
  id: string;
  organization_id: string;
  name: string;
  location: string;
  coordinates: string;
  weather_station: string;
  status: "Normal" | "Elevated" | "Severe";
  temperature: number;
  humidity: number;
  wind_kmh: number;
  solar: SolarExposure;
  weather_online: boolean;
  weather_last_update: string; // HH:MM, shown when the feed is offline
}

/** A monitored area of a site with its own environmental sensor. */
export interface Zone {
  id: string;
  site_id: string;
  name: string;
  setting: ZoneSetting;
  sensor_id: string;
  temperature: number;
  humidity: number;
  wind_kmh: number;
  solar: SolarExposure;
  updated_at: string; // ISO
}

/** A work assignment: one team doing one task in one zone. The unit of risk. */
export interface Task {
  id: string;
  site_id: string;
  zone_id: string;
  name: string;
  team: string;
  intensity: Intensity;
  ppe: PpeCategory;
  exposure_minutes: number;
  shift_hours: number;
  scenario_hour: number; // demo time of day, e.g. 14.5 = 14:30
  shade: ShadeAvailability;
  cooling: CoolingAvailability;
  status: "Active" | "Monitoring" | "Intervention in place" | "Paused";
  updated_at: string; // ISO
}

/** Kept for assignment and accountability only — no personal health data. */
export interface Worker {
  id: string;
  site_id: string;
  name: string;
  role: string;
  team: string;
  task_id: string;
}

export interface RiskFactor {
  key: string;
  label: string;
  value: string;
  points: number;
  max: number;
  elevated: boolean;
  source: DataSource;
}

export interface Conditions {
  temperature: number;
  humidity: number;
  wbgt: number;
}

export type AlertStatus = "active" | "confirmed" | "escalated" | "dismissed" | "resolved";

export type InterventionType =
  | "Hydration"
  | "Cooling/rest break"
  | "Move activity to shade"
  | "Work rotation"
  | "Pause task"
  | "Escalated to site safety manager";

export interface Alert {
  id: string;
  task_id: string;
  zone_id: string;
  risk_assessment_id: string;
  severity: RiskLevel;
  message: string;
  status: AlertStatus;
  created_at: string;
  recommended: InterventionType[];
  trigger: string[];
  snapshot: Conditions & { wind_kmh: number; solar: SolarExposure; intensity: Intensity; exposure: number; task: string; zone: string; team: string; score: number };
}

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
  site_id: string;
  zone_id: string;
  zone: string;
  task_id: string;
  task: string;
  team: string;
  conditions: Conditions;
  risk_level: RiskLevel;
  score: number;
  trigger: string[];
  recommended: InterventionType[];
  intervention: string; // actions selected by the supervisor
  resolution: "Resolved" | "Monitoring" | "Escalated" | "Dismissed";
  supervisor: string;
  notes?: string;
  timestamp: string; // ISO
}
