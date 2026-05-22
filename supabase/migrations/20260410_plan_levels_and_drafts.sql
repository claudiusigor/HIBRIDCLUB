create extension if not exists pgcrypto;

create table if not exists public.user_plan_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.user_plan_drafts enable row level security;
alter table public.user_plan_versions enable row level security;

drop policy if exists "user_plan_drafts_select_own" on public.user_plan_drafts;
create policy "user_plan_drafts_select_own"
  on public.user_plan_drafts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_plan_drafts_insert_own" on public.user_plan_drafts;
create policy "user_plan_drafts_insert_own"
  on public.user_plan_drafts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_plan_drafts_update_own" on public.user_plan_drafts;
create policy "user_plan_drafts_update_own"
  on public.user_plan_drafts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_plan_versions_select_own" on public.user_plan_versions;
create policy "user_plan_versions_select_own"
  on public.user_plan_versions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_plan_versions_insert_own" on public.user_plan_versions;
create policy "user_plan_versions_insert_own"
  on public.user_plan_versions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

