-- HIBRIDCLUB - Ranking mensal por pontos
-- Regra oficial:
--   100 pontos por dia treinado no mes
--    25 pontos por dia de sequencia ativa
--    10 pontos por ficha diferente executada no mes
--
-- So contam dias com sessoes salvas em daily_logs.sessions. Registros apenas
-- de agua/calorias nao entram no ranking.

drop function if exists public.get_monthly_ranking(uuid);

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
  is_viewer boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with training_days as (
    select dl.user_id, dl.date::date as d, dl.sessions
    from public.daily_logs dl
    where exists (
      select 1
      from jsonb_object_keys(dl.sessions) as session_key(key)
    )
    group by dl.user_id, dl.date, dl.sessions
  ),
  month_days as (
    select td.user_id,
           count(*)::int as month_days,
           min(td.d) as first_month_day
    from training_days td
    where extract(year from td.d) = extract(year from now())
      and extract(month from td.d) = extract(month from now())
    group by td.user_id
  ),
  month_variety as (
    select td.user_id,
           count(distinct session_key.key)::int as workout_variety
    from training_days td
    cross join lateral jsonb_object_keys(td.sessions) as session_key(key)
    where extract(year from td.d) = extract(year from now())
      and extract(month from td.d) = extract(month from now())
    group by td.user_id
  ),
  island_groups as (
    select td.user_id,
           td.d,
           td.d - (row_number() over (partition by td.user_id order by td.d))::int as grp
    from training_days td
  ),
  island_runs as (
    select ig.user_id, ig.grp,
           count(*)::int as run_len,
           max(ig.d) as run_end
    from island_groups ig
    group by ig.user_id, ig.grp
  ),
  streaks as (
    select ir.user_id,
           coalesce(max(case when ir.run_end >= current_date - 1 then ir.run_len else 0 end), 0)::int as streak
    from island_runs ir
    group by ir.user_id
  ),
  user_base as (
    select p.id as user_id
    from public.profiles p
  ),
  scored as (
    select
      ub.user_id,
      coalesce(p.display_name, split_part(u.email, '@', 1), 'Atleta') as display_name,
      coalesce(
        p.avatar_url,
        u.raw_user_meta_data ->> 'avatar_url',
        u.raw_user_meta_data ->> 'picture'
      ) as avatar_url,
      coalesce(md.month_days, 0) as month_days,
      coalesce(s.streak, 0) as streak,
      coalesce(mv.workout_variety, 0) as workout_variety,
      (
        coalesce(md.month_days, 0) * 100
        + coalesce(s.streak, 0) * 25
        + coalesce(mv.workout_variety, 0) * 10
      )::int as points,
      coalesce(md.first_month_day, date '9999-12-31') as first_month_day
    from user_base ub
    left join month_days md on md.user_id = ub.user_id
    left join month_variety mv on mv.user_id = ub.user_id
    left join streaks s on s.user_id = ub.user_id
    left join public.profiles p on p.id = ub.user_id
    left join auth.users u on u.id = ub.user_id
  ),
  ranked as (
    select
      sc.user_id,
      sc.display_name,
      sc.avatar_url,
      sc.month_days,
      sc.streak,
      sc.workout_variety,
      sc.points,
      row_number() over (
        order by
          sc.points desc,
          sc.month_days desc,
          sc.streak desc,
          sc.first_month_day asc
      )::int as rank
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
    r.rank,
    (r.user_id = p_viewer_id) as is_viewer
  from ranked r
  order by r.rank;
end;
$$;

revoke execute on function public.get_monthly_ranking(uuid) from anon, public;
grant execute on function public.get_monthly_ranking(uuid) to authenticated;
