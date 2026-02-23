-- Capital Markets AI Lab – Phase 1 schema
-- Run in Supabase SQL Editor or via Supabase CLI

-- Enable UUID extension if not already
create extension if not exists "uuid-ossp";

-- Uploads / financial data files (CSV, PDF)
create table public.uploads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('csv', 'pdf')),
  storage_path text not null,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

-- Standardized financial dataset (parsed from CSV or extracted from 10-K)
create table public.financial_datasets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  upload_id uuid references public.uploads(id) on delete set null,
  name text,
  -- Key metrics (nullable until parsed)
  revenue numeric,
  ebitda numeric,
  debt numeric,
  cash numeric,
  equity numeric,
  working_capital numeric,
  -- Raw or structured payload for flexibility
  raw_metadata jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stress test runs (Phase 2 will populate; schema ready)
create table public.stress_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dataset_id uuid references public.financial_datasets(id) on delete set null,
  scenario_name text,
  scenario_params jsonb default '{}',
  results jsonb default '{}',
  fragility_score numeric,
  created_at timestamptz not null default now()
);

-- RLS: users can only see their own data
alter table public.uploads enable row level security;
alter table public.financial_datasets enable row level security;
alter table public.stress_runs enable row level security;

create policy "Users can manage own uploads"
  on public.uploads for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own financial_datasets"
  on public.financial_datasets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own stress_runs"
  on public.stress_runs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Storage bucket for uploads (create in Dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false);
-- create policy "Users can upload own files" on storage.objects for insert with check (bucket_id = 'uploads' and auth.uid()::text = (storage.foldername(name))[1]);
