-- HIBRIDCLUB - hotfix da Arena da Temporada
-- Corrige a ambiguidade entre a coluna de retorno user_id e os alvos de
-- ON CONFLICT dentro da RPC PL/pgSQL. Seguro para executar mais de uma vez.

create or replace function public.get_monthly_ranking(p_viewer_id uuid default null)
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

select
  'ranking_user_id_ambiguity_fixed'::text as status,
  count(*)::integer as athlete_count
from public.get_monthly_ranking(null);
