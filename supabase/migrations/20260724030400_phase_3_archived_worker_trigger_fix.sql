create or replace function private.prevent_archived_worker_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_worker_id uuid;
begin
  if tg_table_name = 'workers' then
    target_worker_id := coalesce(new.id, old.id);
  else
    target_worker_id := coalesce(new.worker_id, old.worker_id);
  end if;

  if exists (
    select 1
    from public.worker_employment_periods
    where worker_id = target_worker_id
      and ends_on is null
      and status = 'ARCHIVED'
  ) then
    raise exception 'Archived workers are read-only';
  end if;

  return coalesce(new, old);
end;
$$;
