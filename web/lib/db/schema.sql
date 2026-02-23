-- Vercel Postgres schema (run in Vercel Dashboard or Neon SQL)
-- Use POSTGRES_URL; user_id is from Supabase Auth (app enforces ownership)

create extension if not exists "uuid-ossp";

create table if not exists uploads (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  file_name text not null,
  file_type text not null check (file_type in ('csv', 'pdf')),
  storage_path text not null,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists financial_datasets (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  upload_id uuid references uploads(id) on delete set null,
  name text,
  revenue numeric,
  ebitda numeric,
  debt numeric,
  cash numeric,
  equity numeric,
  working_capital numeric,
  raw_metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stress_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  dataset_id uuid references financial_datasets(id) on delete set null,
  scenario_name text not null,
  scenario_params jsonb default '{}',
  results jsonb not null default '{}',
  fragility_score numeric,
  created_at timestamptz not null default now()
);

-- Phase 3: 10-K disclosure / sentiment analysis
create table if not exists disclosure_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  upload_id uuid references uploads(id) on delete set null,
  file_name text,
  disclosure_risk_score numeric,
  sentiment_score numeric,
  results jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_uploads_user_id on uploads(user_id);
create index if not exists idx_financial_datasets_user_id on financial_datasets(user_id);
create index if not exists idx_stress_runs_user_id on stress_runs(user_id);
create index if not exists idx_disclosure_analyses_user_id on disclosure_analyses(user_id);
