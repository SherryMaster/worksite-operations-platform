create or replace function private.prevent_archived_worker_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_worker_id uuid;
begin
  target_worker_id := case
    when tg_table_name = 'workers' then coalesce(new.id, old.id)
    else coalesce(new.worker_id, old.worker_id)
  end;

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

create trigger workers_prevent_archived_change
before update or delete on public.workers
for each row execute function private.prevent_archived_worker_changes();

create trigger worker_classification_prevent_archived_change
before insert or update or delete on public.worker_classification_periods
for each row execute function private.prevent_archived_worker_changes();

create trigger worker_employment_prevent_archived_change
before insert or update or delete on public.worker_employment_periods
for each row execute function private.prevent_archived_worker_changes();

create trigger worker_assignment_prevent_archived_change
before insert or update or delete on public.worker_project_assignments
for each row execute function private.prevent_archived_worker_changes();

create trigger worker_rate_prevent_archived_change
before insert or update or delete on public.worker_rate_periods
for each row execute function private.prevent_archived_worker_changes();

create trigger worker_food_deduction_prevent_archived_change
before insert or update or delete on public.worker_food_deduction_periods
for each row execute function private.prevent_archived_worker_changes();

create trigger worker_documents_prevent_archived_change
before insert or update or delete on public.worker_documents
for each row execute function private.prevent_archived_worker_changes();

drop policy "Authorized users can read worker assignments"
on public.worker_project_assignments;

create policy "Authorized users can read worker assignments"
on public.worker_project_assignments
for select
to authenticated
using (
  private.is_current_ceo()
  or (
    private.can_read_worker(worker_id)
    and project_id = private.current_foreman_project_id()
  )
);

create or replace function private.close_project_worker_assignments()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status is distinct from new.status
    and new.status in ('COMPLETED', 'CANCELLED', 'ARCHIVED') then
    update public.worker_project_assignments
    set
      ends_on = private.current_business_date(),
      ended_by = private.current_application_user_id()
    where project_id = new.id
      and ends_on is null;
  end if;
  return new;
end;
$$;

create trigger projects_close_worker_assignments
after update of status on public.projects
for each row execute function private.close_project_worker_assignments();
