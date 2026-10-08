/**
 * Deterministic demo dataset. No randomness — the investor demo behaves identically
 * every time. Timestamps are expressed relative to "now" at seed time so the data
 * always looks current.
 *
 * Only data a real deployment could measure, calculate or have entered by an
 * authorised site user: zone sensors, weather, site configuration and task records.
 */
import { assessTask, estimateWbgt, recommendedActions, topDrivers, type RiskResult } from "./risk-engine";
import type {
  Alert,
  CoolingAvailability,
  Intensity,
  InterventionType,
  Organization,
  PpeCategory,
  SafetyLogEntry,
  ShadeAvailability,
  Site,
  SolarExposure,
  Task,
  Worker,
  Zone,
  ZoneSetting,
} from "./types";

export const ORG: Organization = { id: "org_iberia", name: "Iberia Build Group" };
export const SUPERVISOR = "Alex Morgan";
export const HERO_TASK_ID = "t_mad_roof";
export const DEMO_HOUR = 14.5; // scripted demo time of day (14:30)

export const SITES: Site[] = [
  {
    id: "madrid",
    organization_id: ORG.id,
    name: "Madrid Central",
    location: "Madrid Construction Site · Calle de Alcalá",
    coordinates: "40.4237° N, 3.6826° W",
    weather_station: "MAD-WS-01",
    status: "Elevated",
    temperature: 35,
    humidity: 68,
    wind_kmh: 8,
    solar: "High",
    weather_online: true,
    weather_last_update: "",
  },
  {
    id: "barcelona",
    organization_id: ORG.id,
    name: "Barcelona North",
    location: "Sant Andreu, Barcelona",
    coordinates: "41.4357° N, 2.1901° E",
    weather_station: "BCN-WS-02",
    status: "Normal",
    temperature: 32,
    humidity: 62,
    wind_kmh: 14,
    solar: "Moderate",
    weather_online: true,
    weather_last_update: "",
  },
  {
    id: "valencia",
    organization_id: ORG.id,
    name: "Valencia Project",
    location: "Port district, Valencia",
    coordinates: "39.4590° N, 0.3266° W",
    weather_station: "VLC-WS-01",
    status: "Normal",
    temperature: 29,
    humidity: 58,
    wind_kmh: 12,
    solar: "Moderate",
    weather_online: false,
    weather_last_update: "09:40",
  },
];

// prettier-ignore
const ZONE_ROWS: [site: string, key: string, name: string, setting: ZoneSetting, temp: number, hum: number, wind: number, solar: SolarExposure][] = [
  ["madrid", "roof", "Roof Zone", "Outdoor", 35, 68, 8, "High"],
  ["madrid", "concrete", "Concrete Zone", "Outdoor", 34, 64, 8, "High"],
  ["madrid", "facade", "Facade & Scaffold Zone", "Outdoor", 32, 60, 16, "Moderate"],
  ["madrid", "ground", "Ground Works", "Outdoor", 33, 55, 10, "High"],
  ["madrid", "interior", "Interior Levels 1–3", "Indoor", 28, 52, 2, "Low"],
  ["madrid", "laydown", "Laydown Yard", "Covered", 31, 56, 12, "Low"],
  ["barcelona", "deck", "Structure Deck", "Outdoor", 32, 62, 14, "Moderate"],
  ["barcelona", "facade", "Facade North", "Outdoor", 31, 60, 18, "Moderate"],
  ["barcelona", "core", "Interior Core", "Indoor", 27, 52, 2, "Low"],
  ["barcelona", "gate", "Logistics Gate", "Covered", 29, 58, 10, "Low"],
  ["valencia", "quay", "Quay Works", "Outdoor", 29, 58, 12, "Moderate"],
  ["valencia", "roof", "Warehouse Roof", "Outdoor", 29, 58, 12, "Moderate"],
  ["valencia", "shell", "Warehouse Shell", "Indoor", 26, 50, 2, "Low"],
  ["valencia", "compound", "Site Compound", "Covered", 27, 52, 10, "Low"],
];

// prettier-ignore
const TASK_ROWS: [site: string, key: string, name: string, team: string, zone: string, intensity: Intensity, ppe: PpeCategory, exposure: number, shade: ShadeAvailability, cooling: CoolingAvailability, status: Task["status"], updatedMinAgo: number][] = [
  ["madrid", "roof", "Roof installation", "Roof Crew A", "roof", "Heavy", "Standard", 82, "Limited", "Available", "Active", 0],
  ["madrid", "pour", "Concrete pouring", "Concrete Crew", "concrete", "Heavy", "Standard", 74, "Good", "Available", "Active", 1],
  ["madrid", "rebar", "Rebar fixing", "Steel Fixers", "concrete", "Moderate", "Standard", 70, "Good", "Available", "Monitoring", 2],
  ["madrid", "scaffold", "Scaffolding", "Scaffold Team", "facade", "Moderate", "Standard", 40, "Good", "Available", "Active", 1],
  ["madrid", "excavation", "Excavation support", "Groundworks Team", "ground", "Low", "Light", 48, "Limited", "Limited", "Active", 3],
  ["madrid", "fitout", "Interior fit-out", "Fit-out Team", "interior", "Moderate", "Light", 45, "Good", "Available", "Active", 2],
  ["madrid", "mep", "Electrical & MEP", "MEP Team", "interior", "Moderate", "Standard", 35, "Good", "Available", "Active", 4],
  ["madrid", "logistics", "Material handling", "Logistics Team", "laydown", "Moderate", "Light", 40, "Good", "Available", "Active", 2],
  ["barcelona", "deckpour", "Concrete deck pour", "Deck Crew", "deck", "Heavy", "Standard", 50, "Limited", "Available", "Active", 2],
  ["barcelona", "formwork", "Formwork", "Carpentry Crew", "deck", "Moderate", "Standard", 45, "Limited", "Available", "Active", 3],
  ["barcelona", "panels", "Facade panel installation", "Facade Crew", "facade", "Moderate", "Standard", 35, "Good", "Available", "Active", 1],
  ["barcelona", "fitout", "Interior fit-out", "Fit-out Team", "core", "Moderate", "Light", 40, "Good", "Available", "Active", 4],
  ["barcelona", "deliveries", "Deliveries", "Logistics Team", "gate", "Low", "Light", 30, "Good", "Available", "Active", 5],
  ["valencia", "piling", "Piling support", "Piling Crew", "quay", "Moderate", "Standard", 40, "Limited", "Available", "Active", 6],
  ["valencia", "roofing", "Roof sheeting", "Roofing Crew", "roof", "Moderate", "Standard", 35, "None", "Limited", "Active", 6],
  ["valencia", "steel", "Steel erection", "Steel Crew", "shell", "Moderate", "Standard", 30, "Good", "Available", "Active", 6],
  ["valencia", "compound", "Site logistics", "Logistics Team", "compound", "Low", "Light", 25, "Good", "Available", "Active", 6],
];

// prettier-ignore
const MADRID_WORKERS: [name: string, role: string, task: string][] = [
  ["Carlos M.", "General labourer", "roof"], ["Lucía G.", "Roofer", "roof"], ["Raúl N.", "Roofer", "roof"], ["Pablo S.", "Roofer", "roof"],
  ["Daniel R.", "Concrete finisher", "pour"], ["Miguel A.", "Concrete finisher", "pour"], ["Elena F.", "Carpenter", "pour"], ["Diego H.", "Pump operator", "pour"],
  ["Javier P.", "Steel fixer", "rebar"], ["Laura V.", "Welder", "rebar"], ["Rubén G.", "Banksman", "rebar"],
  ["Sofia L.", "Scaffolder", "scaffold"], ["Iván R.", "Scaffolder", "scaffold"], ["Alba J.", "Scaffolder", "scaffold"],
  ["Andrés V.", "Plant operator", "excavation"], ["Teresa M.", "Groundworker", "excavation"],
  ["Nuria D.", "Drywaller", "fitout"], ["Sergio E.", "Painter", "fitout"], ["Clara P.", "Tiler", "fitout"],
  ["Marco T.", "Electrician", "mep"], ["Óscar L.", "Electrician", "mep"], ["Hugo B.", "Plumber", "mep"],
  ["Marta S.", "Storekeeper", "logistics"], ["Irene C.", "Material handler", "logistics"],
];

const FIRST = ["Jordi", "Montse", "Pau", "Laia", "Xavier", "Núria", "Arnau", "Carla", "Oriol", "Mireia", "Enric", "Gemma", "Vicent", "Amparo", "Rafael", "Inés", "Tomás", "Rocío", "Adrián", "Beatriz", "Emilio", "Silvia", "Gonzalo", "Pilar", "Felipe", "Noelia", "Ignacio", "Lorena", "Joaquín", "Celia", "Mateo", "Ana", "Bruno", "Eva", "Álvaro", "Rosa", "Jaime", "Patricia", "Samuel", "Lidia", "Victor", "Sara", "Ramón", "Julia", "Gabriel", "Olga", "Manuel", "Irene", "Fernando"];
const INITIALS = "ABCDEFGHJKLMNOPRSTV";
const ROLE_FOR: Record<string, string> = {
  deckpour: "Concrete finisher",
  formwork: "Carpenter",
  panels: "Facade installer",
  fitout: "Fit-out operative",
  deliveries: "Material handler",
  piling: "Piling operative",
  roofing: "Roofer",
  steel: "Steel erector",
  compound: "Storekeeper",
};
const WORKER_COUNT: Record<string, number> = { barcelona: 18, valencia: 31 };

const minutesAgo = (now: number, m: number) => new Date(now - m * 60_000).toISOString();
const atToday = (now: number, daysAgo: number, hh: number, mm: number, fallbackMinAgo: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hh, mm, 0, 0);
  // Demo run before the scripted time of day: keep "today" events in the past.
  return d.getTime() < now ? d.toISOString() : minutesAgo(now, fallbackMinAgo);
};

/** Alert raised for a task at HIGH or CRITICAL. Shared by the seed and the live store. */
export function buildAlert(task: Task, zone: Zone, r: RiskResult, createdAt: string, id: string): Alert {
  return {
    id,
    task_id: task.id,
    zone_id: zone.id,
    risk_assessment_id: `ra_${task.id}_${new Date(createdAt).getTime()}`,
    severity: r.level,
    message: `${r.level === "CRITICAL" ? "Critical" : "High"} heat risk — ${zone.name}`,
    status: "active",
    created_at: createdAt,
    recommended: recommendedActions(r.level, r.factors),
    trigger: topDrivers(r).map((f) => f.label),
    snapshot: {
      temperature: zone.temperature,
      humidity: zone.humidity,
      wbgt: r.wbgt,
      wind_kmh: zone.wind_kmh,
      solar: zone.solar,
      intensity: task.intensity,
      exposure: task.exposure_minutes,
      task: task.name,
      zone: zone.name,
      team: task.team,
      score: r.score,
    },
  };
}

export interface DemoSeed {
  sites: Site[];
  zones: Zone[];
  tasks: Task[];
  workers: Worker[];
  alerts: Alert[];
  log: SafetyLogEntry[];
}

export function buildSeed(now = Date.now()): DemoSeed {
  const zid = (site: string, key: string) => `z_${site.slice(0, 3)}_${key}`;
  const tid = (site: string, key: string) => `t_${site.slice(0, 3)}_${key}`;

  const zones: Zone[] = ZONE_ROWS.map(([site, key, name, setting, temperature, humidity, wind_kmh, solar], i) => ({
    id: zid(site, key),
    site_id: site,
    name,
    setting,
    sensor_id: `${site.slice(0, 3).toUpperCase()}-ENV-${String(i + 1).padStart(2, "0")}`,
    temperature,
    humidity,
    wind_kmh,
    solar,
    updated_at: minutesAgo(now, 1),
  }));

  const tasks: Task[] = TASK_ROWS.map(([site, key, name, team, zone, intensity, ppe, exposure, shade, cooling, status, ago]) => ({
    id: tid(site, key),
    site_id: site,
    zone_id: zid(site, zone),
    name,
    team,
    intensity,
    ppe,
    exposure_minutes: exposure,
    shift_hours: 8,
    scenario_hour: DEMO_HOUR,
    shade,
    cooling,
    status,
    updated_at: minutesAgo(now, ago),
  }));

  const workers: Worker[] = MADRID_WORKERS.map(([name, role, task], i) => ({
    id: `w_mad_${String(i + 1).padStart(2, "0")}`,
    site_id: "madrid",
    name,
    role,
    team: tasks.find((t) => t.id === tid("madrid", task))!.team,
    task_id: tid("madrid", task),
  }));
  let n = 0;
  for (const site of ["barcelona", "valencia"]) {
    const siteTasks = tasks.filter((t) => t.site_id === site);
    for (let i = 0; i < WORKER_COUNT[site]; i++, n++) {
      const t = siteTasks[i % siteTasks.length];
      workers.push({
        id: `w_${site.slice(0, 3)}_${String(i + 1).padStart(2, "0")}`,
        site_id: site,
        name: `${FIRST[n % FIRST.length]} ${INITIALS[(n * 7) % INITIALS.length]}.`,
        role: ROLE_FOR[t.id.split("_")[2]] ?? "Site operative",
        team: t.team,
        task_id: t.id,
      });
    }
  }

  const zoneOf = (t: Task) => zones.find((z) => z.id === t.zone_id)!;
  const task = (id: string) => tasks.find((t) => t.id === id)!;

  // Historical record: Madrid has 6 confirmed interventions this week.
  // Hours concentrate in 12:00–15:00 to reflect afternoon peak heat.
  // prettier-ignore
  const HISTORY: [daysAgo: number, hh: number, mm: number, task: string, temp: number, hum: number, level: "HIGH" | "CRITICAL", score: number, trigger: string[], intervention: InterventionType[], resolution: SafetyLogEntry["resolution"], notes?: string][] = [
    [0, 11, 20, "t_mad_rebar", 33, 62, "HIGH", 58, ["Exposure duration", "WBGT", "Temperature"], ["Hydration", "Cooling/rest break"], "Monitoring", "Crew rotated to the shaded rebar bench; recheck at 13:00."],
    [1, 14, 42, "t_mad_roof", 35, 66, "HIGH", 71, ["Temperature", "Work intensity", "WBGT"], ["Cooling/rest break", "Hydration", "Work rotation"], "Resolved"],
    [2, 15, 5, "t_mad_roof", 37, 64, "CRITICAL", 76, ["Temperature", "WBGT", "Work intensity"], ["Pause task", "Cooling/rest break", "Hydration"], "Resolved", "Roof work paused until 16:30."],
    [3, 13, 15, "t_mad_pour", 34, 63, "HIGH", 62, ["Work intensity", "WBGT", "Temperature"], ["Work rotation", "Hydration"], "Resolved"],
    [4, 14, 55, "t_mad_pour", 34, 61, "HIGH", 60, ["Work intensity", "Exposure duration", "Temperature"], ["Cooling/rest break", "Move activity to shade"], "Resolved"],
    [5, 13, 35, "t_mad_scaffold", 33, 60, "HIGH", 56, ["Temperature", "Exposure duration", "Solar exposure"], ["Hydration", "Move activity to shade"], "Resolved"],
    [1, 12, 30, "t_bar_deckpour", 33, 62, "HIGH", 57, ["Work intensity", "Temperature", "Shade availability"], ["Cooling/rest break"], "Resolved"],
    [2, 12, 10, "t_bar_formwork", 33, 61, "HIGH", 56, ["Temperature", "Exposure duration", "Shade availability"], ["Hydration", "Move activity to shade"], "Resolved"],
    [3, 14, 20, "t_val_roofing", 32, 58, "HIGH", 56, ["Shade availability", "Temperature", "Work intensity"], ["Cooling/rest break", "Move activity to shade"], "Resolved"],
    [4, 12, 40, "t_bar_deckpour", 34, 60, "HIGH", 60, ["Work intensity", "Temperature", "WBGT"], ["Cooling/rest break", "Work rotation"], "Resolved"],
    [6, 14, 10, "t_bar_panels", 32, 60, "HIGH", 55, ["Temperature", "Exposure duration", "Solar exposure"], ["Hydration"], "Resolved"],
  ];

  const log: SafetyLogEntry[] = HISTORY.map(([d, hh, mm, taskId, temp, hum, level, score, trigger, intervention, resolution, notes], i) => {
    const t = task(taskId);
    const z = zoneOf(t);
    const heavy = t.intensity === "Heavy";
    return {
      id: `log_seed_${i}`,
      site_id: t.site_id,
      zone_id: z.id,
      zone: z.name,
      task_id: t.id,
      task: t.name,
      team: t.team,
      conditions: { temperature: temp, humidity: hum, wbgt: estimateWbgt(temp, hum) },
      risk_level: level,
      score,
      trigger,
      recommended: ["Hydration", "Cooling/rest break", "Move activity to shade", ...(heavy || level === "CRITICAL" ? (["Work rotation"] as const) : []), ...(level === "CRITICAL" ? (["Pause task"] as const) : [])],
      intervention: intervention.join(" + "),
      resolution,
      supervisor: t.site_id === "madrid" ? SUPERVISOR : "Marta Ruiz",
      notes,
      timestamp: atToday(now, d, hh, mm, 12 + Math.min(i, 2) * 15),
    };
  });

  const historicalAlerts: Alert[] = log.map((e) => ({
    id: `al_${e.id}`,
    task_id: e.task_id,
    zone_id: e.zone_id,
    risk_assessment_id: `ra_${e.id}`,
    severity: e.risk_level,
    message: `${e.risk_level === "CRITICAL" ? "Critical" : "High"} heat risk — ${e.zone}`,
    status: e.resolution === "Resolved" ? "resolved" : "confirmed",
    created_at: new Date(new Date(e.timestamp).getTime() - 3 * 60_000).toISOString(),
    recommended: e.recommended,
    trigger: e.trigger,
    snapshot: { ...e.conditions, wind_kmh: 0, solar: "High", intensity: "Moderate", exposure: 0, task: e.task, zone: e.zone, team: e.team, score: e.score },
  }));

  const activeAlert = (taskId: string, minAgo: number) => {
    const t = task(taskId);
    const z = zoneOf(t);
    return buildAlert(t, z, assessTask(t, z), minutesAgo(now, minAgo), `al_${taskId}_seed`);
  };

  const alerts = [activeAlert("t_mad_roof", 0), activeAlert("t_mad_pour", 1), ...historicalAlerts];

  return { sites: SITES.map((s) => ({ ...s })), zones, tasks, workers, alerts, log };
}
