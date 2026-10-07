/**
 * Deterministic demo dataset. No randomness — the investor demo behaves identically
 * every time. Timestamps are expressed relative to "now" at seed time so the data
 * always looks current.
 */
import { assessRisk, estimateWbgt, recommendedActions } from "./risk-engine";
import type {
  ActivityLevel,
  Alert,
  Organization,
  PpeLevel,
  SafetyLogEntry,
  SensorReading,
  ShadeAvailability,
  Site,
  SolarExposure,
  Worker,
} from "./types";

export const ORG: Organization = { id: "org_iberia", name: "Iberia Build Group" };
export const SUPERVISOR = "Alex Morgan";
export const HERO_WORKER_ID = "w_mad_01";

interface Zone {
  temperature: number;
  humidity: number;
  solar: SolarExposure;
}

export const SITES: Site[] = [
  {
    id: "madrid",
    organization_id: ORG.id,
    name: "Madrid Central",
    location: "Madrid Construction Site · Calle de Alcalá",
    status: "Elevated",
    temperature: 35,
    humidity: 68,
    solar: "High",
    weather_online: true,
    weather_last_update: "",
  },
  {
    id: "barcelona",
    organization_id: ORG.id,
    name: "Barcelona North",
    location: "Sant Andreu, Barcelona",
    status: "Normal",
    temperature: 32,
    humidity: 62,
    solar: "Moderate",
    weather_online: true,
    weather_last_update: "",
  },
  {
    id: "valencia",
    organization_id: ORG.id,
    name: "Valencia Project",
    location: "Port district, Valencia",
    status: "Normal",
    temperature: 29,
    humidity: 58,
    solar: "Moderate",
    weather_online: false,
    weather_last_update: "09:40",
  },
];

/** Cooling area conditions used to reassess a worker after a confirmed recovery break. */
export const COOLING_AREA: Zone = { temperature: 26, humidity: 50, solar: "Low" };

const ZONES: Record<string, Record<"outdoor" | "partial" | "interior", Zone>> = {
  madrid: {
    outdoor: { temperature: 35, humidity: 68, solar: "High" },
    partial: { temperature: 32, humidity: 60, solar: "Moderate" },
    interior: { temperature: 28, humidity: 52, solar: "Low" },
  },
  barcelona: {
    outdoor: { temperature: 32, humidity: 62, solar: "Moderate" },
    partial: { temperature: 30, humidity: 58, solar: "Moderate" },
    interior: { temperature: 27, humidity: 52, solar: "Low" },
  },
  valencia: {
    outdoor: { temperature: 29, humidity: 58, solar: "Moderate" },
    partial: { temperature: 28, humidity: 55, solar: "Low" },
    interior: { temperature: 26, humidity: 50, solar: "Low" },
  },
};

type Row = [
  name: string,
  task: string,
  role: string,
  zone: "outdoor" | "partial" | "interior",
  baseline: number,
  hr: number | null,
  activity: ActivityLevel,
  exposure: number,
  ppe: PpeLevel,
  shade: ShadeAvailability,
  status: Worker["status"],
  updatedMinAgo: number,
];

// prettier-ignore
const MADRID: Row[] = [
  ["Carlos M.", "Heavy manual work", "General labourer", "outdoor", 92, 128, "Heavy", 82, "High", "Limited", "Working", 0],
  ["Daniel R.", "Concrete work", "Concrete finisher", "outdoor", 90, 119, "Moderate", 74, "Medium", "Good", "Working", 1],
  ["Lucía G.", "Roof work", "Roofer", "outdoor", 88, 112, "Moderate", 58, "Low", "None", "Cooling down", 1],
  ["Javier P.", "Rebar installation", "Steel fixer", "outdoor", 86, null, "Heavy", 70, "Medium", "Limited", "On break", 4],
  ["Sofia L.", "Site inspection", "Site engineer", "outdoor", 88, 104, "Low", 61, "Low", "Good", "Working", 2],
  ["Pablo S.", "Scaffolding", "Scaffolder", "outdoor", 88, 100, "Moderate", 40, "Low", "Good", "Working", 1],
  ["Andrés V.", "Excavation support", "Plant operator", "outdoor", 84, 92, "Low", 48, "Low", "Limited", "Working", 2],
  ["Elena F.", "Formwork", "Carpenter", "partial", 86, 104, "Moderate", 55, "Medium", "Limited", "Working", 1],
  ["Miguel A.", "Concrete work", "Concrete finisher", "partial", 90, 108, "Moderate", 62, "Medium", "Good", "Working", 3],
  ["Raúl N.", "Heavy manual work", "General labourer", "partial", 88, 102, "Heavy", 38, "Low", "Good", "Working", 2],
  ["Marco T.", "Electrical work", "Electrician", "interior", 86, 91, "Moderate", 35, "Medium", "Good", "Working", 2],
  ["Irene C.", "Site inspection", "Safety officer", "interior", 82, 86, "Low", 30, "Low", "Good", "Working", 1],
  ["Hugo B.", "Plumbing", "Plumber", "interior", 84, 92, "Moderate", 42, "Low", "Good", "Working", 3],
  ["Nuria D.", "Drywall installation", "Drywaller", "interior", 80, 90, "Moderate", 50, "Low", "Good", "Working", 2],
  ["Óscar L.", "Electrical work", "Electrician", "interior", 85, 88, "Low", 25, "Medium", "Good", "Working", 4],
  ["Teresa M.", "Logistics", "Material handler", "interior", 83, 94, "Moderate", 40, "Low", "Good", "Working", 1],
  ["Iván R.", "HVAC installation", "HVAC technician", "interior", 87, 95, "Moderate", 45, "Medium", "Good", "Working", 2],
  ["Clara P.", "Site inspection", "Quality inspector", "interior", 79, 84, "Low", 20, "Low", "Good", "Working", 5],
  ["Sergio E.", "Painting", "Painter", "interior", 82, 90, "Low", 55, "Medium", "Good", "Working", 3],
  ["Alba J.", "Tiling", "Tiler", "interior", 81, 89, "Moderate", 30, "Low", "Good", "Working", 2],
  ["Rubén G.", "Crane signalling", "Banksman", "interior", 84, 90, "Low", 40, "Low", "Good", "Working", 1],
  ["Marta S.", "Logistics", "Storekeeper", "interior", 80, 85, "Low", 15, "Low", "Good", "Working", 6],
  ["Diego H.", "Carpentry", "Carpenter", "interior", 86, 96, "Moderate", 28, "Low", "Good", "On break", 2],
  ["Laura V.", "Welding", "Welder", "interior", 85, 93, "Moderate", 33, "Medium", "Good", "Working", 3],
];

const FIRST = ["Jordi", "Montse", "Pau", "Laia", "Xavier", "Núria", "Arnau", "Carla", "Oriol", "Mireia", "Enric", "Gemma", "Vicent", "Amparo", "Rafael", "Inés", "Tomás", "Rocío", "Adrián", "Beatriz", "Emilio", "Silvia", "Gonzalo", "Pilar", "Felipe", "Noelia", "Ignacio", "Lorena", "Joaquín", "Celia", "Mateo", "Ana", "Bruno", "Eva", "Álvaro", "Rosa", "Jaime", "Patricia", "Samuel", "Lidia", "Victor", "Sara", "Ramón", "Julia", "Gabriel", "Olga", "Manuel", "Irene", "Fernando"];
const INITIALS = "ABCDEFGHJKLMNOPRSTV";
const TASKS: [string, string, ActivityLevel][] = [
  ["Concrete work", "Concrete finisher", "Moderate"],
  ["Electrical work", "Electrician", "Moderate"],
  ["Site inspection", "Site engineer", "Low"],
  ["Roof work", "Roofer", "Moderate"],
  ["Heavy manual work", "General labourer", "Heavy"],
  ["Scaffolding", "Scaffolder", "Moderate"],
  ["Plumbing", "Plumber", "Low"],
  ["Logistics", "Material handler", "Low"],
];

/** Deterministic bulk rows for the secondary sites. */
function bulkRows(count: number, offset: number, moderateEvery: number): Row[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + offset;
    const [task, role, activity] = TASKS[n % TASKS.length];
    const moderate = i % moderateEvery === 0;
    const baseline = 80 + (n % 9);
    return [
      `${FIRST[n % FIRST.length]} ${INITIALS[(n * 7) % INITIALS.length]}.`,
      task,
      role,
      moderate ? "outdoor" : n % 3 === 0 ? "partial" : "interior",
      baseline,
      n % 17 === 5 ? null : baseline + (moderate ? 14 : 4 + (n % 6)),
      activity,
      moderate ? 55 + (n % 15) : 15 + ((n * 11) % 40),
      (["Low", "Medium"] as PpeLevel[])[n % 2],
      moderate ? "Limited" : "Good",
      n % 11 === 0 ? "On break" : "Working",
      1 + (n % 6),
    ] as Row;
  });
}

const ROWS: Record<string, Row[]> = {
  madrid: MADRID,
  barcelona: bulkRows(18, 0, 3),
  valencia: bulkRows(31, 18, 10),
};

const minutesAgo = (now: number, m: number) => new Date(now - m * 60_000).toISOString();
const atToday = (now: number, daysAgo: number, hh: number, mm: number, fallbackMinAgo: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hh, mm, 0, 0);
  // Demo run before the scripted time of day: keep "today" events in the past.
  return d.getTime() < now ? d.toISOString() : minutesAgo(now, fallbackMinAgo);
};

export interface DemoSeed {
  sites: Site[];
  workers: Worker[];
  readings: Record<string, SensorReading>;
  alerts: Alert[];
  log: SafetyLogEntry[];
}

export function buildSeed(now = Date.now()): DemoSeed {
  const workers: Worker[] = [];
  const readings: Record<string, SensorReading> = {};

  for (const site of SITES) {
    ROWS[site.id].forEach((r, i) => {
      const [name, task, role, zoneKey, baseline, hr, activity, exposure, ppe, shade, status, ago] = r;
      const id = `w_${site.id.slice(0, 3)}_${String(i + 1).padStart(2, "0")}`;
      const zone = ZONES[site.id][zoneKey];
      workers.push({ id, site_id: site.id, name, role, task, baseline_heart_rate: baseline, ppe_level: ppe, status });
      readings[id] = {
        id: `r_${id}`,
        worker_id: id,
        temperature: zone.temperature,
        humidity: zone.humidity,
        wbgt: estimateWbgt(zone.temperature, zone.humidity),
        heart_rate: hr,
        activity_level: activity,
        exposure_minutes: exposure,
        shade_available: shade,
        solar: zone.solar,
        ppe_level: ppe,
        timestamp: minutesAgo(now, ago),
      };
    });
  }

  const byName = (n: string) => workers.find((w) => w.name === n)!;
  const activeAlert = (w: Worker, minAgo: number): Alert => {
    const rd = readings[w.id];
    const res = assessRisk({ ...rd, baseline_heart_rate: w.baseline_heart_rate });
    return {
      id: `al_${w.id}_seed`,
      worker_id: w.id,
      risk_assessment_id: `ra_${w.id}_seed`,
      severity: res.level,
      message: `${res.level === "CRITICAL" ? "Critical" : "High"} heat risk detected`,
      status: "active",
      created_at: minutesAgo(now, minAgo),
      recommended: recommendedActions(res.level, res.factors),
      snapshot: { temperature: rd.temperature, humidity: rd.humidity, exposure: rd.exposure_minutes, task: w.task, score: res.score },
    };
  };

  // Historical record: 16 confirmed interventions this week, 15 resolved.
  // Hours concentrate in 12:00–15:00 to reflect afternoon peak heat.
  // prettier-ignore
  const HISTORY: [daysAgo: number, hh: number, mm: number, worker: string, site: string, task: string, level: "HIGH" | "CRITICAL", score: number, intervention: string, resolution: SafetyLogEntry["resolution"]][] = [
    [0, 11, 20, "Javier P.", "madrid", "Rebar installation", "HIGH", 65, "Cooling break + hydration · heart-rate sensor offline, assessed on environment + activity", "Monitoring"],
    [0, 11, 5, "Lucía G.", "madrid", "Roof work", "HIGH", 69, "Cooling break + move to shade", "Resolved"],
    [0, 10, 18, "Daniel R.", "madrid", "Concrete work", "HIGH", 66, "Work rotation", "Resolved"],
    [1, 14, 42, "Carlos M.", "madrid", "Heavy manual work", "HIGH", 72, "Cooling break + hydration", "Resolved"],
    [1, 13, 15, "Pablo S.", "madrid", "Scaffolding", "HIGH", 58, "Hydration + move to shade", "Resolved"],
    [1, 12, 30, "Jordi A.", "barcelona", "Concrete work", "HIGH", 57, "Cooling break", "Resolved"],
    [2, 15, 5, "Raúl N.", "madrid", "Heavy manual work", "CRITICAL", 78, "Cooling break + hydration + work rotation", "Resolved"],
    [2, 13, 50, "Lucía G.", "madrid", "Roof work", "HIGH", 63, "Move to shade + hydration", "Resolved"],
    [2, 12, 10, "Laia K.", "barcelona", "Roof work", "HIGH", 56, "Cooling break", "Resolved"],
    [3, 14, 20, "Elena F.", "madrid", "Formwork", "HIGH", 59, "Hydration", "Resolved"],
    [3, 13, 5, "Daniel R.", "madrid", "Concrete work", "HIGH", 61, "Work rotation", "Resolved"],
    [4, 14, 55, "Carlos M.", "madrid", "Heavy manual work", "HIGH", 70, "Cooling break + hydration", "Resolved"],
    [4, 12, 40, "Oriol S.", "barcelona", "Heavy manual work", "HIGH", 60, "Cooling break + work rotation", "Resolved"],
    [5, 13, 35, "Miguel A.", "madrid", "Concrete work", "HIGH", 57, "Hydration + move to shade", "Resolved"],
    [5, 11, 45, "Andrés V.", "madrid", "Excavation support", "HIGH", 56, "Cooling break", "Resolved"],
    [6, 14, 10, "Raúl N.", "madrid", "Heavy manual work", "HIGH", 64, "Cooling break + hydration", "Resolved"],
  ];

  const log: SafetyLogEntry[] = HISTORY.map(([d, hh, mm, name, site, task, level, score, intervention, resolution], i) => {
    const w = workers.find((x) => x.name === name);
    return {
      id: `log_seed_${i}`,
      worker_id: w?.id ?? `w_hist_${i}`,
      worker_name: name,
      site_id: site,
      task,
      risk_level: level,
      score,
      intervention,
      resolution,
      supervisor: site === "madrid" ? SUPERVISOR : "Marta Ruiz",
      timestamp: atToday(now, d, hh, mm, 12 + Math.min(i, 2) * 15),
    };
  });

  const historicalAlerts: Alert[] = log.map((e) => ({
    id: `al_${e.id}`,
    worker_id: e.worker_id,
    risk_assessment_id: `ra_${e.id}`,
    severity: e.risk_level,
    message: `${e.risk_level === "CRITICAL" ? "Critical" : "High"} heat risk detected`,
    status: e.resolution === "Resolved" ? "resolved" : "confirmed",
    created_at: new Date(new Date(e.timestamp).getTime() - 3 * 60_000).toISOString(),
    recommended: [],
    snapshot: { temperature: 0, humidity: 0, exposure: 0, task: e.task, score: e.score },
  }));

  const alerts = [activeAlert(byName("Carlos M."), 0), activeAlert(byName("Daniel R."), 1), ...historicalAlerts];

  return { sites: SITES.map((s) => ({ ...s })), workers, readings, alerts, log };
}
