-- HIBRIDCLUB - Arena da Temporada
-- Adiciona temporadas mensais, historico permanente e snapshots diarios de
-- posicao. A RPC atual continua sendo a unica fonte publica do ranking.

create extension if not exists pgcrypto;

create table if not exists public.ranking_scoring_rules (
  rule_key text primary key,
  training_day_points integer not null check (training_day_points > 0),
  active_streak_day_points integer not null check (active_streak_day_points > 0),
  workout_variety_points integer not null check (workout_variety_points > 0),
  updated_at timestamptz not null default now()
);

insert into public.ranking_scoring_rules (
  rule_key, training_day_points, active_streak_day_points, workout_variety_points
)
values ('official', 100, 25, 10)
on conflict (rule_key) do nothing;

create table if not exists public.ranking_seasons (
  id uuid primary key default gen_random_uuid(),
  season_start date not null unique,
  season_end date not null,
  label text not null,
  created_at timestamptz not null default now(),
  check (season_start = date_trunc('month', season_start)::date),
  check (season_end >= season_start),
  check (season_end = (season_start + interval '1 month - 1 day')::date)
);

create table if not exists public.ranking_season_results (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.ranking_seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  final_rank integer not null check (final_rank > 0),
  points integer not null default 0 check (points >= 0),
  month_days integer not null default 0 check (month_days >= 0),
  streak integer not null default 0 check (streak >= 0),
  workout_variety integer not null default 0 check (workout_variety >= 0),
  division text not null,
  title text,
  badges text[] not null default '{}',
  archived_at timestamptz not null default now(),
  unique (season_id, user_id)
);

create table if not exists public.ranking_position_snapshots (
  season_id uuid not null references public.ranking_seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  snapshot_date date not null default current_date,
  rank integer not null check (rank > 0),
  points integer not null default 0 check (points >= 0),
  created_at timestamptz not null default now(),
  primary key (season_id, user_id, snapshot_date)
);

create index if not exists ranking_results_user_idx
  on public.ranking_season_results (user_id, archived_at desc);

create index if not exists ranking_snapshots_user_date_idx
  on public.ranking_position_snapshots (user_id, snapshot_date desc);

alter table public.ranking_scoring_rules enable row level security;
alter table public.ranking_seasons enable row level security;
alter table public.ranking_season_results enable row level security;
alter table public.ranking_position_snapshots enable row level security;

-- Nenhuma leitura direta e liberada. As RPCs SECURITY DEFINER devolvem apenas
-- dados agregados do ranking e o historico do proprio atleta.
revoke all on public.ranking_scoring_rules from anon, authenticated;
revoke all on public.ranking_seasons from anon, authenticated;
revoke all on public.ranking_season_results from anon, authenticated;
revoke all on public.ranking_position_snapshots from anon, authenticated;

-- Remove primeiro as funcoes dependentes para que o script possa ser executado
-- novamente com seguranca depois de uma aplicacao parcial no SQL Editor.
drop function if exists public.get_monthly_ranking(uuid);
drop function if exists public.get_ranking_season_history(uuid);
drop function if exists public.get_ranking_rules();
drop function if exists public.get_ranking_period_snapshot(date);
create function public.get_ranking_period_snapshot(p_period date)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  month_days integer,
  streak integer,
  workout_variety integer,
  points integer,
  rank integer,
  total_athletes integer
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select
      date_trunc('month', p_period)::date as starts_on,
      (date_trunc('month', p_period) + interval '1 month - 1 day')::date as ends_on,
      timezone('America/Sao_Paulo', now())::date as today
  ),
  training_days as (
    select dl.user_id, dl.date::date as d, dl.sessions
    from public.daily_logs dl
    cross join bounds b
    where dl.date <= least(b.ends_on, b.today)
      and exists (
        select 1
        from jsonb_object_keys(coalesce(dl.sessions, '{}'::jsonb)) as session_key(key)
      )
    group by dl.user_id, dl.date, dl.sessions
  ),
  month_days as (
    select td.user_id, count(*)::int as month_days, min(td.d) as first_month_day
    from training_days td
    cross join bounds b
    where td.d between b.starts_on and b.ends_on
    group by td.user_id
  ),
  month_variety as (
    select td.user_id, count(distinct session_key.key)::int as workout_variety
    from training_days td
    cross join bounds b
    cross join lateral jsonb_object_keys(td.sessions) as session_key(key)
    where td.d between b.starts_on and b.ends_on
    group by td.user_id
  ),
  island_groups as (
    select
      td.user_id,
      td.d,
      td.d - (row_number() over (partition by td.user_id order by td.d))::int as grp
    from training_days td
  ),
  island_runs as (
    select ig.user_id, ig.grp, count(*)::int as run_len, max(ig.d) as run_end
    from island_groups ig
    group by ig.user_id, ig.grp
  ),
  streaks as (
    select
      ir.user_id,
      coalesce(max(
        case
          when ir.run_end >= least(b.ends_on, b.today) - 1 then ir.run_len
          else 0
        end
      ), 0)::int as streak
    from island_runs ir
    cross join bounds b
    group by ir.user_id
  ),
  user_base as (
    select p.id as user_id
    from public.profiles p
    cross join bounds b
    where p.created_at::date <= b.ends_on
  ),
  scored as (
    select
      ub.user_id,
      coalesce(p.display_name, split_part(u.email, '@', 1), 'Atleta') as display_name,
      coalesce(p.avatar_url, u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') as avatar_url,
      coalesce(md.month_days, 0)::int as month_days,
      coalesce(st.streak, 0)::int as streak,
      coalesce(mv.workout_variety, 0)::int as workout_variety,
      (
        coalesce(md.month_days, 0) * rules.training_day_points
        + coalesce(st.streak, 0) * rules.active_streak_day_points
        + coalesce(mv.workout_variety, 0) * rules.workout_variety_points
      )::int as points,
      coalesce(md.first_month_day, date '9999-12-31') as first_month_day
    from user_base ub
    cross join public.ranking_scoring_rules rules
    left join month_days md on md.user_id = ub.user_id
    left join month_variety mv on mv.user_id = ub.user_id
    left join streaks st on st.user_id = ub.user_id
    left join public.profiles p on p.id = ub.user_id
    left join auth.users u on u.id = ub.user_id
    where rules.rule_key = 'official'
  ),
  ranked as (
    select
      sc.*,
      row_number() over (
        order by sc.points desc, sc.month_days desc, sc.streak desc, sc.first_month_day asc
      )::int as position,
      count(*) over ()::int as athlete_count
    from scored sc
  )
  select
    r.user_id,
    r.display_name,
    r.avatar_url,
    r.month_days,
    r.streak,
    r.workout_variety,
    r.points,
    r.position as rank,
    r.athlete_count as total_athletes
  from ranked r
  order by r.position;
$$;

revoke execute on function public.get_ranking_period_snapshot(date) from anon, public;

drop function if exists public.get_monthly_ranking(uuid);
create function public.get_monthly_ranking(p_viewer_id uuid default null)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  month_days integer,
  streak integer,
  workout_variety integer,
  points integer,
  rank integer,
  is_viewer boolean,
  previous_rank integer,
  division text,
  percentile integer,
  title text,
  badges text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := timezone('America/Sao_Paulo', now())::date;
  v_current_start date := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;
  v_current_season_id uuid;
begin
  insert into public.ranking_seasons (season_start, season_end, label)
  values (
    v_current_start,
    (v_current_start + interval '1 month - 1 day')::date,
    initcap(to_char(v_current_start, 'TMMonth YYYY'))
  )
  on conflict (season_start) do update set label = excluded.label
  returning id into v_current_season_id;

  insert into public.ranking_seasons (season_start, season_end, label)
  select distinct
    date_trunc('month', dl.date)::date,
    (date_trunc('month', dl.date) + interval '1 month - 1 day')::date,
    initcap(to_char(dl.date, 'TMMonth YYYY'))
  from public.daily_logs dl
  where dl.date < v_current_start
  on conflict (season_start) do nothing;

  insert into public.ranking_season_results (
    season_id, user_id, final_rank, points, month_days, streak,
    workout_variety, division, title, badges
  )
  select
    rs.id,
    snap.user_id,
    snap.rank,
    snap.points,
    snap.month_days,
    snap.streak,
    snap.workout_variety,
    case
      when snap.rank = 1
        or ceil((snap.rank::numeric / greatest(snap.total_athletes, 1)) * 100) <= 5 then 'Elite'
      when snap.rank <= 3
        or ceil((snap.rank::numeric / greatest(snap.total_athletes, 1)) * 100) <= 20 then 'Pro'
      when ceil((snap.rank::numeric / greatest(snap.total_athletes, 1)) * 100) <= 50 then 'Competidor'
      else 'Desafiante'
    end,
    case
      when snap.rank = 1 then 'Campeão da temporada'
      when snap.rank <= 3 then 'Finalista'
      when snap.rank <= 10 then 'Elite do mês'
      when snap.streak >= 14 then 'Atleta consistente'
      when snap.workout_variety >= 4 then 'Híbrido completo'
      else null
    end,
    array_remove(array[
      case when snap.month_days >= 10 then 'consistency_10' end,
      case when snap.streak >= 7 then 'streak_7' end,
      case when snap.workout_variety >= 4 then 'hybrid_complete' end,
      case when snap.rank <= 10 then 'top_10' end,
      case when snap.rank <= 3 then 'podium' end,
      case when snap.rank = 1 then 'champion' end
    ], null)
  from public.ranking_seasons rs
  cross join lateral public.get_ranking_period_snapshot(rs.season_start) snap
  where rs.season_end < v_today
    and not exists (
      select 1
      from public.ranking_season_results existing
      where existing.season_id = rs.id
    )
  on conflict on constraint ranking_season_results_season_id_user_id_key do nothing;

  insert into public.ranking_position_snapshots (season_id, user_id, snapshot_date, rank, points)
  select v_current_season_id, snap.user_id, v_today, snap.rank, snap.points
  from public.get_ranking_period_snapshot(v_current_start) snap
  on conflict on constraint ranking_position_snapshots_pkey
  do update set rank = excluded.rank, points = excluded.points;

  return query
  select
    snap.user_id,
    snap.display_name,
    snap.avatar_url,
    snap.month_days,
    snap.streak,
    snap.workout_variety,
    snap.points,
    snap.rank,
    (snap.user_id = p_viewer_id) as is_viewer,
    previous.position as previous_rank,
    case
      when snap.rank = 1
        or ceil((snap.rank::numeric / greatest(snap.total_athletes, 1)) * 100) <= 5 then 'Elite'
      when snap.rank <= 3
        or ceil((snap.rank::numeric / greatest(snap.total_athletes, 1)) * 100) <= 20 then 'Pro'
      when ceil((snap.rank::numeric / greatest(snap.total_athletes, 1)) * 100) <= 50 then 'Competidor'
      else 'Desafiante'
    end as division,
    ceil((snap.rank::numeric / greatest(snap.total_athletes, 1)) * 100)::int as percentile,
    case
      when snap.rank = 1 then 'Campeão da temporada'
      when snap.rank <= 3 then 'Finalista'
      when snap.rank <= 10 then 'Elite do mês'
      when snap.streak >= 14 then 'Atleta consistente'
      when snap.workout_variety >= 4 then 'Híbrido completo'
      else null
    end as title,
    array_remove(array[
      case when snap.month_days >= 10 then 'consistency_10' end,
      case when snap.streak >= 7 then 'streak_7' end,
      case when snap.workout_variety >= 4 then 'hybrid_complete' end,
      case when snap.rank <= 10 then 'top_10' end,
      case when snap.rank <= 3 then 'podium' end,
      case when snap.rank = 1 then 'champion' end
    ], null) as badges
  from public.get_ranking_period_snapshot(v_current_start) snap
  left join lateral (
    select rps.rank as position
    from public.ranking_position_snapshots rps
    where rps.season_id = v_current_season_id
      and rps.user_id = snap.user_id
      and rps.snapshot_date < v_today
    order by rps.snapshot_date desc
    limit 1
  ) previous on true
  order by snap.rank;
end;
$$;

revoke execute on function public.get_monthly_ranking(uuid) from anon, public;
grant execute on function public.get_monthly_ranking(uuid) to authenticated;

drop function if exists public.get_ranking_season_history(uuid);
create function public.get_ranking_season_history(p_viewer_id uuid default null)
returns table (
  season_label text,
  season_start date,
  final_rank integer,
  points integer,
  division text,
  title text,
  badges text[]
)
language sql
security definer
set search_path = public
as $$
  select
    rs.label,
    rs.season_start,
    result.final_rank,
    result.points,
    result.division,
    result.title,
    result.badges
  from public.ranking_season_results result
  join public.ranking_seasons rs on rs.id = result.season_id
  where result.user_id = coalesce(p_viewer_id, auth.uid())
    and result.user_id = auth.uid()
  order by rs.season_start desc
  limit 12;
$$;

revoke execute on function public.get_ranking_season_history(uuid) from anon, public;
grant execute on function public.get_ranking_season_history(uuid) to authenticated;

drop function if exists public.get_ranking_rules();
create function public.get_ranking_rules()
returns table (
  training_day_points integer,
  active_streak_day_points integer,
  workout_variety_points integer
)
language sql
security definer
set search_path = public
as $$
  select
    rules.training_day_points,
    rules.active_streak_day_points,
    rules.workout_variety_points
  from public.ranking_scoring_rules rules
  where rules.rule_key = 'official';
$$;

revoke execute on function public.get_ranking_rules() from anon, public;
grant execute on function public.get_ranking_rules() to authenticated;

-- Falha imediatamente se a fonte oficial de pontuacao estiver ausente ou
-- duplicada. A ultima consulta deixa um comprovante visivel no SQL Editor.
do $$
declare
  v_rule_count integer;
begin
  select count(*) into v_rule_count
  from public.ranking_scoring_rules
  where rule_key = 'official'
    and training_day_points > 0
    and active_streak_day_points > 0
    and workout_variety_points > 0;

  if v_rule_count <> 1 then
    raise exception 'Ranking Arena: regra oficial de pontuacao invalida';
  end if;
end;
$$;

select
  'ranking_arena_ready'::text as status,
  training_day_points,
  active_streak_day_points,
  workout_variety_points,
  timezone('America/Sao_Paulo', now())::date as verified_on
from public.ranking_scoring_rules
where rule_key = 'official';
