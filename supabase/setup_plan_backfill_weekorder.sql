update public.user_plans
set
  plan_data = jsonb_set(
    jsonb_set(
      plan_data,
      '{weekOrder}',
      coalesce(
        plan_data -> 'weekOrder',
        '{"SEG":"A","TER":"B","QUA":"C","QUI":"D","SEX":"E","SAB":"F","DOM":null}'::jsonb
      ),
      true
    ),
    '{general,sessionsPerWeekTarget}',
    to_jsonb(
      coalesce(
        (plan_data #>> '{general,sessionsPerWeekTarget}')::int,
        5
      )
    ),
    true
  ),
  updated_at = now()
where plan_data is not null;

update public.user_plan_drafts
set
  plan_data = jsonb_set(
    jsonb_set(
      plan_data,
      '{weekOrder}',
      coalesce(
        plan_data -> 'weekOrder',
        '{"SEG":"A","TER":"B","QUA":"C","QUI":"D","SEX":"E","SAB":"F","DOM":null}'::jsonb
      ),
      true
    ),
    '{general,sessionsPerWeekTarget}',
    to_jsonb(
      coalesce(
        (plan_data #>> '{general,sessionsPerWeekTarget}')::int,
        5
      )
    ),
    true
  ),
  updated_at = now()
where plan_data is not null;

