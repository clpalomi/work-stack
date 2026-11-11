-- Run once in Supabase Dashboard → SQL Editor before using task start times.
-- Local wall-clock time, paired with the existing date column. No timezone conversion.
-- NULL preserves entries whose historical start time is unknown.
alter table public.work_log
  add column if not exists start_time time without time zone;

-- Keep existing RLS policies: this column uses the same row-level access rules.
-- Timed entries must fit within 24 hours (they may cross midnight).
-- Run this block only once; the named constraint is checked for repeatability.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.work_log'::regclass
      and conname = 'work_log_timed_duration'
  ) then
    alter table public.work_log add constraint work_log_timed_duration
      check (start_time is null or (minutes > 0 and minutes <= 1440));
  end if;
end $$;
