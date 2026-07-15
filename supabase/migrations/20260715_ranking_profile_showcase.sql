-- Public profile details shown only inside the authenticated Ranking.
-- Email, training focus and account metadata remain private.

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
      when profile.avatar_frame in ('minimal', 'blue', 'glass', 'rhythm', 'prism', 'pulse', 'elite', 'podium', 'gold') then profile.avatar_frame
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
