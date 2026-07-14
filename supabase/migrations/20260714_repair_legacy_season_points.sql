-- HIBRIDCLUB - reparo dos pontos historicos da Arena
-- Temporadas antigas foram arquivadas depois que o ranking passou a exigir
-- daily_logs.sessions preenchido. Antes disso, o ranking mensal contava o row
-- diario de daily_logs como sinal de treino. Esta migracao reconstrui apenas
-- temporadas encerradas usando esse criterio legado, sem afetar a temporada
-- atual nem a regra nova daqui para frente.

drop function if exists public.get_ranking_period_legacy_repair_snapshot(date);
create function public.get_ranking_period_legacy_repair_snapshot(p_period date)
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
      (date_trunc('month', p_period) + interval '1 month - 1 day')::date as ends_on
  ),
  training_days as (
    select dl.user_id, dl.date::date as d, coalesce(dl.sessions, '{}'::jsonb) as sessions
    from public.daily_logs dl
    cross join bounds b
    where dl.date <= b.ends_on
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
          when ir.run_end >= b.ends_on - 1 then ir.run_len
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

revoke execute on function public.get_ranking_period_legacy_repair_snapshot(date) from anon, public;

insert into public.ranking_seasons (season_start, season_end, label)
select distinct
  date_trunc('month', dl.date)::date,
  (date_trunc('month', dl.date) + interval '1 month - 1 day')::date,
  initcap(to_char(dl.date, 'TMMonth YYYY'))
from public.daily_logs dl
where dl.date < date_trunc('month', timezone('America/Sao_Paulo', now()))::date
on conflict (season_start) do nothing;

with affected_seasons as (
  select distinct rs.id, rs.season_start
  from public.ranking_seasons rs
  join public.ranking_season_results result on result.season_id = rs.id
  join lateral public.get_ranking_period_legacy_repair_snapshot(rs.season_start) repaired
    on repaired.user_id = result.user_id
  where rs.season_end < timezone('America/Sao_Paulo', now())::date
    and repaired.month_days > 0
    and result.points < repaired.points
),
patched as (
  update public.ranking_season_results result
  set
    final_rank = repaired.rank,
    points = repaired.points,
    month_days = repaired.month_days,
    streak = repaired.streak,
    workout_variety = repaired.workout_variety,
    division = case
      when repaired.rank = 1
        or ceil((repaired.rank::numeric / greatest(repaired.total_athletes, 1)) * 100) <= 5 then 'Elite'
      when repaired.rank <= 3
        or ceil((repaired.rank::numeric / greatest(repaired.total_athletes, 1)) * 100) <= 20 then 'Pro'
      when ceil((repaired.rank::numeric / greatest(repaired.total_athletes, 1)) * 100) <= 50 then 'Competidor'
      else 'Desafiante'
    end,
    title = case
      when repaired.rank = 1 then 'Campeao da temporada'
      when repaired.rank <= 3 then 'Finalista'
      when repaired.rank <= 10 then 'Elite do mes'
      when repaired.streak >= 14 then 'Atleta consistente'
      when repaired.workout_variety >= 4 then 'Hibrido completo'
      else null
    end,
    badges = array_remove(array[
      case when repaired.month_days >= 10 then 'consistency_10' end,
      case when repaired.streak >= 7 then 'streak_7' end,
      case when repaired.workout_variety >= 4 then 'hybrid_complete' end,
      case when repaired.rank <= 10 then 'top_10' end,
      case when repaired.rank <= 3 then 'podium' end,
      case when repaired.rank = 1 then 'champion' end
    ], null)
  from (
    select season_to_patch.id as season_id, repaired.*
    from affected_seasons season_to_patch
    cross join lateral public.get_ranking_period_legacy_repair_snapshot(season_to_patch.season_start) repaired
  ) repaired
  where result.season_id = repaired.season_id
    and result.user_id = repaired.user_id
    and (
      result.final_rank <> repaired.rank
      or result.points <> repaired.points
      or result.month_days <> repaired.month_days
      or result.streak <> repaired.streak
      or result.workout_variety <> repaired.workout_variety
    )
  returning result.id
)
select
  'legacy_season_points_repaired'::text as status,
  count(*)::integer as repaired_rows
from patched;

insert into public.ranking_season_results (
  season_id, user_id, final_rank, points, month_days, streak,
  workout_variety, division, title, badges
)
select
  rs.id,
  repaired.user_id,
  repaired.rank,
  repaired.points,
  repaired.month_days,
  repaired.streak,
  repaired.workout_variety,
  case
    when repaired.rank = 1
      or ceil((repaired.rank::numeric / greatest(repaired.total_athletes, 1)) * 100) <= 5 then 'Elite'
    when repaired.rank <= 3
      or ceil((repaired.rank::numeric / greatest(repaired.total_athletes, 1)) * 100) <= 20 then 'Pro'
    when ceil((repaired.rank::numeric / greatest(repaired.total_athletes, 1)) * 100) <= 50 then 'Competidor'
    else 'Desafiante'
  end,
  case
    when repaired.rank = 1 then 'Campeao da temporada'
    when repaired.rank <= 3 then 'Finalista'
    when repaired.rank <= 10 then 'Elite do mes'
    when repaired.streak >= 14 then 'Atleta consistente'
    when repaired.workout_variety >= 4 then 'Hibrido completo'
    else null
  end,
  array_remove(array[
    case when repaired.month_days >= 10 then 'consistency_10' end,
    case when repaired.streak >= 7 then 'streak_7' end,
    case when repaired.workout_variety >= 4 then 'hybrid_complete' end,
    case when repaired.rank <= 10 then 'top_10' end,
    case when repaired.rank <= 3 then 'podium' end,
    case when repaired.rank = 1 then 'champion' end
  ], null)
from public.ranking_seasons rs
cross join lateral public.get_ranking_period_legacy_repair_snapshot(rs.season_start) repaired
where rs.season_end < timezone('America/Sao_Paulo', now())::date
  and repaired.month_days > 0
  and not exists (
    select 1
    from public.ranking_season_results existing
    where existing.season_id = rs.id
      and existing.user_id = repaired.user_id
  )
on conflict on constraint ranking_season_results_season_id_user_id_key do nothing;

drop function if exists public.get_ranking_legacy_repair_audit(uuid);
create function public.get_ranking_legacy_repair_audit(p_viewer_id uuid default null)
returns table (
  season_label text,
  season_start date,
  current_points integer,
  repaired_points integer,
  current_month_days integer,
  repaired_month_days integer,
  current_rank integer,
  repaired_rank integer
)
language sql
security definer
set search_path = public
as $$
  select
    rs.label,
    rs.season_start,
    result.points,
    repaired.points,
    result.month_days,
    repaired.month_days,
    result.final_rank,
    repaired.rank
  from public.ranking_season_results result
  join public.ranking_seasons rs on rs.id = result.season_id
  join lateral public.get_ranking_period_legacy_repair_snapshot(rs.season_start) repaired
    on repaired.user_id = result.user_id
  where result.user_id = coalesce(p_viewer_id, auth.uid())
    and result.user_id = auth.uid()
  order by rs.season_start desc
  limit 12;
$$;

revoke execute on function public.get_ranking_legacy_repair_audit(uuid) from anon, public;
grant execute on function public.get_ranking_legacy_repair_audit(uuid) to authenticated;
