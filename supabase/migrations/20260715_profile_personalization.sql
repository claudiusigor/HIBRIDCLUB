alter table public.profiles
  add column if not exists bio text,
  add column if not exists training_focus text,
  add column if not exists primary_goal text,
  add column if not exists avatar_frame text not null default 'minimal';

alter table public.profiles
  drop constraint if exists profiles_bio_length_check,
  drop constraint if exists profiles_training_focus_check,
  drop constraint if exists profiles_primary_goal_check,
  drop constraint if exists profiles_avatar_frame_check;

update public.profiles
set
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
    when avatar_frame in ('minimal', 'blue', 'glass', 'rhythm', 'prism', 'pulse', 'elite', 'podium', 'gold') then avatar_frame
    else 'minimal'
  end;

alter table public.profiles
  add constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 120),
  add constraint profiles_training_focus_check
    check (training_focus is null or training_focus in ('hybrid', 'strength', 'running')),
  add constraint profiles_primary_goal_check
    check (primary_goal is null or primary_goal in ('performance', 'consistency', 'fat_loss', 'strength', 'endurance')),
  add constraint profiles_avatar_frame_check
    check (avatar_frame in ('minimal', 'blue', 'glass', 'rhythm', 'prism', 'pulse', 'elite', 'podium', 'gold'));

alter table public.profiles
  alter column avatar_frame set default 'minimal',
  alter column avatar_frame set not null;
