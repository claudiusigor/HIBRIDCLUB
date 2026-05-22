alter table public.profiles
  add column if not exists first_name text,
  add column if not exists has_completed_setup boolean not null default false,
  add column if not exists profile_completed_at timestamptz;

update public.profiles
set
  first_name = split_part(trim(coalesce(display_name, '')), ' ', 1),
  has_completed_setup = case
    when trim(coalesce(display_name, '')) <> '' then true
    else false
  end,
  profile_completed_at = case
    when trim(coalesce(display_name, '')) <> '' and profile_completed_at is null then now()
    else profile_completed_at
  end
where
  coalesce(first_name, '') = ''
  or has_completed_setup = false
  or profile_completed_at is null;
