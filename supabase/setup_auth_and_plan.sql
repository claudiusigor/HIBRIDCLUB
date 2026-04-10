create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  plan_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  template_id uuid references public.plan_templates (id) on delete set null,
  plan_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.plan_templates enable row level security;
alter table public.user_plans enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "templates_read_authenticated" on public.plan_templates;
create policy "templates_read_authenticated"
  on public.plan_templates
  for select
  to authenticated
  using (true);

drop policy if exists "user_plans_select_own" on public.user_plans;
create policy "user_plans_select_own"
  on public.user_plans
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_plans_insert_own" on public.user_plans;
create policy "user_plans_insert_own"
  on public.user_plans
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_plans_update_own" on public.user_plans;
create policy "user_plans_update_own"
  on public.user_plans
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
