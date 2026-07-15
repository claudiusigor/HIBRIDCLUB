-- Public Arena achievement showcase.
-- Exposes only earned badge keys and season labels to authenticated athletes.

drop function if exists public.get_athlete_achievement_showcase(uuid);

create function public.get_athlete_achievement_showcase(p_user_id uuid)
returns table (
  badge_key text,
  times_earned integer,
  latest_season_label text,
  latest_season_start date
)
language sql
stable
security definer
set search_path = public
as $$
  with archived_badges as (
    select
      earned.badge_key,
      season.label as season_label,
      season.season_start
    from public.ranking_season_results result
    join public.ranking_seasons season on season.id = result.season_id
    cross join lateral unnest(array_remove(array[
      case when result.month_days >= 10 then 'consistency_10' end,
      case when result.streak >= 7 then 'streak_7' end,
      case when result.workout_variety >= 4 then 'hybrid_complete' end,
      case when result.final_rank between 1 and 10 then 'top_10' end,
      case when result.final_rank between 1 and 3 then 'podium' end,
      case when result.final_rank = 1 then 'champion' end
    ]::text[], null)) as earned(badge_key)
    where result.user_id = p_user_id
      and auth.uid() is not null
  ),
  current_badges as (
    select
      earned.badge_key,
      coalesce(
        season.label,
        initcap(to_char(date_trunc('month', current_date), 'TMMonth YYYY'))
      ) as season_label,
      date_trunc('month', current_date)::date as season_start
    from public.get_ranking_period_snapshot(date_trunc('month', current_date)::date) snapshot
    left join public.ranking_seasons season
      on season.season_start = date_trunc('month', current_date)::date
    cross join lateral unnest(array_remove(array[
      case when snapshot.month_days >= 10 then 'consistency_10' end,
      case when snapshot.streak >= 7 then 'streak_7' end,
      case when snapshot.workout_variety >= 4 then 'hybrid_complete' end
    ], null)) as earned(badge_key)
    where snapshot.user_id = p_user_id
      and auth.uid() is not null
  ),
  all_badges as (
    select * from archived_badges
    union all
    select * from current_badges
  )
  select
    earned.badge_key,
    count(*)::integer as times_earned,
    (array_agg(earned.season_label order by earned.season_start desc))[1] as latest_season_label,
    max(earned.season_start)::date as latest_season_start
  from all_badges earned
  where p_user_id is not null
  group by earned.badge_key
  order by max(earned.season_start) desc, earned.badge_key;
$$;

revoke execute on function public.get_athlete_achievement_showcase(uuid) from anon, public;
grant execute on function public.get_athlete_achievement_showcase(uuid) to authenticated;
