-- HeatGuard AI — PostgreSQL / Supabase schema.
-- The MVP demo runs on an in-browser store (src/lib/store.tsx) with the same shapes;
-- these tables are the production target for that store.

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
  status text not null default 'Normal'
);

create table worker (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references site(id) on delete cascade,
  name text not null,                 -- display name only; no HR data
  role text,
  baseline_heart_rate int,
  ppe_level text check (ppe_level in ('Low', 'Medium', 'High')),
  status text not null default 'Working',
  wearable_consent_at timestamptz     -- null = no wearable data processed
);

create table sensor_reading (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references worker(id) on delete cascade,
  temperature numeric not null,
  humidity numeric not null,
  wbgt numeric,
  heart_rate int,                     -- nullable: missing data is stored as missing
  activity_level text check (activity_level in ('Low', 'Moderate', 'Heavy')),
  exposure_minutes int,
  shade_available text check (shade_available in ('Good', 'Limited', 'None')),
  timestamp timestamptz not null default now()
);
create index on sensor_reading (worker_id, timestamp desc);

create table risk_assessment (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references worker(id) on delete cascade,
  score int not null check (score between 0 and 100),
  risk_level risk_level not null,
  factors jsonb not null,             -- per-factor points, for explainability
  model_version text not null default 'demo-rules-v1',
  timestamp timestamptz not null default now()
);

create table alert (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references worker(id) on delete cascade,
  risk_assessment_id uuid references risk_assessment(id),
  severity risk_level not null,
  message text not null,
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

-- Append-only audit trail.
create table safety_log (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references worker(id) on delete set null,
  risk_level risk_level not null,
  intervention text not null,
  resolution text not null check (resolution in ('Resolved', 'Monitoring', 'Escalated', 'Dismissed')),
  supervisor text not null,
  notes text,
  timestamp timestamptz not null default now()
);
revoke update, delete on safety_log from authenticated, anon;
