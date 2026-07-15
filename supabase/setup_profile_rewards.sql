-- Hybrid Club profile personalization, public Ranking showcase and exclusive frames.
-- Run this entire script once in the Supabase SQL Editor.

begin;

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists has_completed_setup boolean not null default false,
  add column if not exists profile_completed_at timestamptz,
  add column if not exists bio text,
  add column if not exists training_focus text,
  add column if not exists primary_goal text,
  add column if not exists avatar_frame text not null default 'minimal';

update public.profiles
set
  first_name = case
    when trim(coalesce(first_name, '')) = '' then split_part(trim(coalesce(display_name, '')), ' ', 1)
    else first_name
  end,
  has_completed_setup = case
    when trim(coalesce(display_name, '')) <> '' then true
    else has_completed_setup
  end,
  profile_completed_at = case
    when trim(coalesce(display_name, '')) <> '' and profile_completed_at is null then now()
    else profile_completed_at
  end,
  bio = case when bio is null then null else left(bio, 120) end,
  training_focus = case
    when training_focus in ('hybrid', 'strength', 'running') then training_focus
    else null
  end,
  primary_goal = case
    when primary_goal in ('performance', 'consistency', 'fat_loss', 'strength', 'endurance') then primary_goal
    else null
  end,
  avatar_frame = case
    when avatar_frame in (
      'minimal', 'blue', 'glass',
      'rhythm', 'prism', 'pulse', 'elite', 'podium', 'gold'
    ) then avatar_frame
    else 'minimal'
  end;

alter table public.profiles
  drop constraint if exists profiles_bio_length_check,
  drop constraint if exists profiles_training_focus_check,
  drop constraint if exists profiles_primary_goal_check,
  drop constraint if exists profiles_avatar_frame_check;

alter table public.profiles
  add constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 120),
  add constraint profiles_training_focus_check
    check (training_focus is null or training_focus in ('hybrid', 'strength', 'running')),
  add constraint profiles_primary_goal_check
    check (primary_goal is null or primary_goal in ('performance', 'consistency', 'fat_loss', 'strength', 'endurance')),
  add constraint profiles_avatar_frame_check
    check (avatar_frame in (
      'minimal', 'blue', 'glass',
      'rhythm', 'prism', 'pulse', 'elite', 'podium', 'gold'
    )),
  alter column avatar_frame set default 'minimal',
  alter column avatar_frame set not null;

-- Server-side guard: premium frames cannot be selected before earning their badge.
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

  if to_regclass('public.ranking_season_results') is not null then
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
  end if;

  if not has_reward and to_regprocedure('public.get_ranking_period_snapshot(date)') is not null then
    execute $query$
      select exists (
        select 1
        from public.get_ranking_period_snapshot(
          date_trunc('month', timezone('America/Sao_Paulo', now()))::date
        ) snapshot
        where snapshot.user_id = $1
          and (
            ($2 = 'consistency_10' and snapshot.month_days >= 10)
            or ($2 = 'hybrid_complete' and snapshot.workout_variety >= 4)
            or ($2 = 'streak_7' and snapshot.streak >= 7)
          )
      )
    $query$
    into has_reward
    using new.id, required_badge;
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

-- Authenticated Ranking profile showcase. Private account fields stay private.
drop function if exists public.get_ranking_profile_showcase();

create function public.get_ranking_profile_showcase()
returns table (
  user_id uuid,
  bio text,
  primary_goal text,
  avatar_frame text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  return query
  select
    profile.id as user_id,
    left(nullif(trim(profile.bio), ''), 120) as bio,
    case
      when profile.primary_goal in ('performance', 'consistency', 'fat_loss', 'strength', 'endurance')
        then profile.primary_goal
      else null
    end as primary_goal,
    case
      when profile.avatar_frame in (
        'minimal', 'blue', 'glass',
        'rhythm', 'prism', 'pulse', 'elite', 'podium', 'gold'
      ) then profile.avatar_frame
      else 'minimal'
    end as avatar_frame
  from public.profiles profile
  where exists (
    select 1
    from public.daily_logs log
    where log.user_id = profile.id
      and log.date >= date_trunc('month', timezone('America/Sao_Paulo', now()))::date
      and log.date < (date_trunc('month', timezone('America/Sao_Paulo', now())) + interval '1 month')::date
  );
end;
$$;

revoke execute on function public.get_ranking_profile_showcase() from anon, public;
grant execute on function public.get_ranking_profile_showcase() to authenticated;

commit;
