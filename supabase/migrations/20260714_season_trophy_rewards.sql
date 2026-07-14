-- Season trophies belong only to archived champions.
-- The current leader remains provisional until ranking_season_results is closed.

drop function if exists public.get_athlete_season_trophies(uuid);

create function public.get_athlete_season_trophies(p_user_id uuid)
returns table (
  season_label text,
  season_start date,
  final_rank integer,
  points integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    season.label,
    season.season_start,
    result.final_rank,
    result.points
  from public.ranking_season_results result
  join public.ranking_seasons season on season.id = result.season_id
  where result.user_id = p_user_id
    and result.final_rank = 1
    and 'champion' = any(result.badges)
    and auth.uid() is not null
  order by season.season_start desc;
$$;

revoke execute on function public.get_athlete_season_trophies(uuid) from anon, public;
grant execute on function public.get_athlete_season_trophies(uuid) to authenticated;
