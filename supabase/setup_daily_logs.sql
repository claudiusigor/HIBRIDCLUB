create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  sessions jsonb not null default '{}'::jsonb,
  water integer not null default 0,
  calories integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_logs enable row level security;

drop policy if exists "daily_logs_select_own" on public.daily_logs;
create policy "daily_logs_select_own"
  on public.daily_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "daily_logs_insert_own" on public.daily_logs;
create policy "daily_logs_insert_own"
  on public.daily_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "daily_logs_update_own" on public.daily_logs;
create policy "daily_logs_update_own"
  on public.daily_logs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists daily_logs_user_id_date_idx on public.daily_logs (user_id, date desc);
