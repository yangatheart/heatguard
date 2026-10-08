-- SiteSafe SI — PostgreSQL / Supabase schema.
-- The MVP demo runs on an in-browser store (src/lib/store.tsx) with the same shapes;
-- these tables are the production target for that store.
--
-- Site-first model: Site → Zone → Task → Team. Only data that can be measured
-- (environmental sensors, weather APIs), calculated (WBGT, risk), or entered by an
-- authorised site user (task, intensity, PPE, shade, cooling). No physiological,
-- wearable or medical data is stored anywhere.

create extension if not exists "pgcrypto";

create type risk_level as enum ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
create type alert_status as enum ('active', 'confirmed', 'escalated', 'dismissed', 'resolved');

create table organization (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table site (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organization(id) on delete cascade,
  name text not null,
  location text,
  coordinates point,                  -- GPS where available
  weather_station text,
  status text not null default 'Normal'
);

create table zone (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references site(id) on delete cascade,
  name text not null,
  setting text not null check (setting in ('Outdoor', 'Indoor', 'Covered')),
  sensor_id text                      -- environmental sensor associated with the zone
);

-- Automatically measured / accessed environmental data.
create table environmental_reading (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zone(id) on delete cascade,
  source text not null check (source in ('sensor', 'weather_api')),
  temperature numeric not null,       -- °C
  humidity numeric not null,          -- %
  wind_kmh numeric,
  solar text check (solar in ('Low', 'Moderate', 'High')),
  wbgt numeric,                       -- calculated, or from a compatible source
  timestamp timestamptz not null default now()
);
create index on environmental_reading (zone_id, timestamp desc);

-- Operational inputs recorded by supervisors / site configuration.
create table work_task (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zone(id) on delete cascade,
  name text not null,
  team text not null,
  intensity text not null check (intensity in ('Low', 'Moderate', 'Heavy')),
  ppe_category text not null check (ppe_category in ('Light', 'Standard', 'Heavy')),
  exposure_minutes int not null default 0,
  shift_hours numeric,
  shade text check (shade in ('Good', 'Limited', 'None')),
  cooling text check (cooling in ('Available', 'Limited', 'None')),
  status text not null default 'Active'
);

-- Assignment and accountability only — no health data.
create table worker (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references site(id) on delete cascade,
  task_id uuid references work_task(id) on delete set null,
  name text not null,
  role text,
  team text
);

create table risk_assessment (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references work_task(id) on delete cascade,
  environmental_reading_id uuid references environmental_reading(id),
  score int not null check (score between 0 and 100),
  risk_level risk_level not null,
  factors jsonb not null,             -- per-factor points and data source, for explainability
  model_version text not null default 'demo-rules-v2',
  timestamp timestamptz not null default now()
);

create table alert (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references work_task(id) on delete cascade,
  risk_assessment_id uuid references risk_assessment(id),
  severity risk_level not null,
  message text not null,
  trigger text[] not null default '{}',
  recommended text[] not null default '{}',
  status alert_status not null default 'active',
  created_at timestamptz not null default now()
);
create index on alert (status, created_at desc);

create table intervention (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references alert(id) on delete cascade,
  type text[] not null,
  confirmed_by text not null,
  confirmed_at timestamptz not null default now(),
  notes text
);

-- Append-only audit trail. No medical or physiological information.
create table safety_log (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references site(id),
  zone_id uuid references zone(id) on delete set null,
  task_id uuid references work_task(id) on delete set null,
  team text,
  temperature numeric,
  humidity numeric,
  wbgt numeric,
  risk_level risk_level not null,
  score int,
  trigger text[] not null default '{}',
  recommended_intervention text[] not null default '{}',
  intervention_selected text not null,
  resolution text not null check (resolution in ('Resolved', 'Monitoring', 'Escalated', 'Dismissed')),
  supervisor text not null,
  notes text,
  timestamp timestamptz not null default now()
);
revoke update, delete on safety_log from authenticated, anon;
