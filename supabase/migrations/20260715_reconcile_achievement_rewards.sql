-- Reconciles archived achievements and keeps public showcases and frame rewards
-- aligned with the final metrics stored for each season.

begin;

create or replace function public.derive_ranking_badges(
  p_final_rank integer,
  p_month_days integer,
  p_streak integer,
  p_workout_variety integer
)
returns text[]
language sql
immutable
set search_path = public
as $$
  select array_remove(array[
    case when greatest(coalesce(p_month_days, 0), 0) >= 10 then 'consistency_10' end,
    case when greatest(coalesce(p_streak, 0), 0) >= 7 then 'streak_7' end,
    case when greatest(coalesce(p_workout_variety, 0), 0) >= 4 then 'hybrid_complete' end,
    case when coalesce(p_final_rank, 0) between 1 and 10 then 'top_10' end,
    case when coalesce(p_final_rank, 0) between 1 and 3 then 'podium' end,
    case when coalesce(p_final_rank, 0) = 1 then 'champion' end
  ]::text[], null);
$$;

revoke all on function public.derive_ranking_badges(integer, integer, integer, integer)
  from public, anon, authenticated;

update public.ranking_season_results result
set badges = public.derive_ranking_badges(
  result.final_rank,
  result.month_days,
  result.streak,
  result.workout_variety
)
where result.badges is distinct from public.derive_ranking_badges(
  result.final_rank,
  result.month_days,
  result.streak,
  result.workout_variety
);

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
    cross join lateral unnest(public.derive_ranking_badges(
      result.final_rank,
      result.month_days,
      result.streak,
      result.workout_variety
    )) as earned(badge_key)
    where result.user_id = p_user_id
      and auth.uid() is not null
  ),
  current_badges as (
    select
      earned.badge_key,
      coalesce(
        season.label,
        initcap(to_char(date_trunc('month', timezone('America/Sao_Paulo', now())), 'TMMonth YYYY'))
      ) as season_label,
      date_trunc('month', timezone('America/Sao_Paulo', now()))::date as season_start
    from public.get_ranking_period_snapshot(
      date_trunc('month', timezone('America/Sao_Paulo', now()))::date
    ) snapshot
    left join public.ranking_seasons season
      on season.season_start = date_trunc('month', timezone('America/Sao_Paulo', now()))::date
    cross join lateral unnest(array_remove(array[
      case when snapshot.month_days >= 10 then 'consistency_10' end,
      case when snapshot.streak >= 7 then 'streak_7' end,
      case when snapshot.workout_variety >= 4 then 'hybrid_complete' end
    ]::text[], null)) as earned(badge_key)
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

create or replace function public.enforce_avatar_frame_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  required_badge text;
  has_reward boolean := false;
begin
  if tg_op = 'UPDATE' and new.avatar_frame is not distinct from old.avatar_frame then
    return new;
  end if;

  required_badge := case new.avatar_frame
    when 'rhythm' then 'consistency_10'
    when 'prism' then 'hybrid_complete'
    when 'pulse' then 'streak_7'
    when 'elite' then 'top_10'
    when 'podium' then 'podium'
    when 'gold' then 'champion'
    else null
  end;

  if required_badge is null then
    return new;
  end if;

  select exists (
    select 1
    from public.ranking_season_results result
    where result.user_id = new.id
      and required_badge = any(public.derive_ranking_badges(
        result.final_rank,
        result.month_days,
        result.streak,
        result.workout_variety
      ))
  )
  into has_reward;

  if not has_reward then
    select exists (
      select 1
      from public.get_ranking_period_snapshot(
        date_trunc('month', timezone('America/Sao_Paulo', now()))::date
      ) snapshot
      where snapshot.user_id = new.id
        and (
          (required_badge = 'consistency_10' and snapshot.month_days >= 10)
          or (required_badge = 'hybrid_complete' and snapshot.workout_variety >= 4)
          or (required_badge = 'streak_7' and snapshot.streak >= 7)
        )
    )
    into has_reward;
  end if;

  if not has_reward then
    raise exception 'A moldura % exige a conquista %.', new.avatar_frame, required_badge
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_avatar_frame_reward() from public, anon, authenticated;

drop trigger if exists profiles_avatar_frame_reward_guard on public.profiles;
create trigger profiles_avatar_frame_reward_guard
before insert or update of avatar_frame on public.profiles
for each row execute function public.enforce_avatar_frame_reward();

commit;
