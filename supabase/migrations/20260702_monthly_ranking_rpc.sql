-- HIBRIDCLUB · Ranking mensal de acessos
-- Adiciona a coluna de avatar (future-proof para fotos de perfil enviadas pelos
-- usuários) e a RPC que agrega o ranking mensal sem vazar logs individuais.
--
-- Segurança: a função é SECURITY DEFINER — bypassa o RLS apenas para devolver
-- dados agregados (nome, dias no mês, streak, avatar_url). Nunca expõe rows
-- individuais de daily_logs. O tradeoff aceito: outros usuários passam a ver
-- sua frequência de treino (o número de dias), não quais dias nem o conteúdo.
--
-- NOTA: TODA referência de coluna é qualificada com o alias da tabela
-- (dl.user_id, dd.user_id, ...). Em PL/pgSQL, os parâmetros de saída do
-- RETURNS TABLE ficam visíveis no corpo da função; referenciar "user_id"
-- sem qualificar colide com o parâmetro de saída e gera "column reference
-- is ambiguous" (erro 42702).

-- 1. Coluna de avatar nas profiles (nullable; preenchida no futuro pelo upload de foto)
alter table public.profiles
  add column if not exists avatar_url text;

-- As policies existentes de profiles (profiles_select_own / profiles_update_own)
-- já cobrem a nova coluna, pois são column-agnostic (auth.uid() = id).

-- 2. Função de ranking mensal
--    Métrica: dias treinados no mês corrente (rows distintos de daily_logs por user).
--    Desempate: streak atual desc, depois quem começou a treinar antes no mês (proxy
--    de "quem chegou primeiro àquela contagem").
create or replace function public.get_monthly_ranking(p_viewer_id uuid default null)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  month_days integer,
  streak integer,
  rank integer,
  is_viewer boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with distinct_days as (
    -- um row por usuário por dia treinado (mesmo com várias sessões no mesmo dia)
    select dl.user_id, dl.date::date as d
    from public.daily_logs dl
    group by dl.user_id, dl.date
  ),
  month_counts as (
    -- métrica do ranking: dias treinados no mês corrente
    select dd.user_id, count(*)::int as month_days
    from distinct_days dd
    where extract(year from dd.d) = extract(year from now())
      and extract(month from dd.d) = extract(month from now())
    group by dd.user_id
  ),
  island_groups as (
    -- gaps-and-islands: agrupa dias consecutivos por usuário
    select dd.user_id,
           dd.d,
           dd.d - (row_number() over (partition by dd.user_id order by dd.d))::int as grp
    from distinct_days dd
  ),
  island_runs as (
    select ig.user_id, ig.grp,
           count(*)::int as run_len,
           max(ig.d) as run_end
    from island_groups ig
    group by ig.user_id, ig.grp
  ),
  streaks as (
    -- streak atual: só conta a sequência se termina hoje ou ontem (cadeia ativa)
    select ir.user_id,
           coalesce(max(case when ir.run_end >= current_date - 1 then ir.run_len else 0 end), 0)::int as streak
    from island_runs ir
    group by ir.user_id
  ),
  user_base as (
    -- base = TODOS os perfis (inclusive quem ainda não treinou no mês/ever);
    -- LEFT JOIN garante que usuários com 0 daily_logs apareçam com month_days=0
    select p.id as user_id,
           min(dd.d) as first_day
    from public.profiles p
    left join distinct_days dd on dd.user_id = p.id
    group by p.id
  ),
  ranked as (
    select
      ub.user_id,
      coalesce(p.display_name, split_part(u.email, '@', 1), 'Atleta') as display_name,
      p.avatar_url,
      coalesce(mc.month_days, 0) as month_days,
      coalesce(s.streak, 0) as streak,
      row_number() over (
        order by
          coalesce(mc.month_days, 0) desc,
          coalesce(s.streak, 0) desc,
          coalesce(ub.first_day, date '9999-12-31') asc
      )::int as rank
    from user_base ub
    left join month_counts  mc on mc.user_id = ub.user_id
    left join streaks       s  on s.user_id  = ub.user_id
    left join public.profiles p on p.id = ub.user_id
    left join auth.users      u on u.id = ub.user_id
  )
  select
    r.user_id,
    r.display_name,
    r.avatar_url,
    r.month_days,
    r.streak,
    r.rank,
    (r.user_id = p_viewer_id) as is_viewer
  from ranked r
  order by r.rank;
end;
$$;

-- Permissões: só usuários autenticados executam; anon bloqueado.
revoke execute on function public.get_monthly_ranking(uuid) from anon, public;
grant execute on function public.get_monthly_ranking(uuid) to authenticated;
