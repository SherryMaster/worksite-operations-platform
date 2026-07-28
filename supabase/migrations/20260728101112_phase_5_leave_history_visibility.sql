drop policy
  "Everyone can read active leave types and CEO can read all"
on public.leave_types;

create policy
  "Users read active and historically accessible leave types"
on public.leave_types
for select
to authenticated
using (
  is_active
  or private.is_current_ceo()
  or exists (
    select 1
    from public.leave_requests
    where leave_requests.leave_type_id = leave_types.id
      and private.can_access_leave_project(leave_requests.project_id)
  )
);

create or replace function private.write_leave_audit_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous jsonb;
  current_value jsonb;
  record_id text;
  request_worker_id uuid;
  request_project_id uuid;
begin
  previous := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  current_value := case when tg_op = 'DELETE' then null else to_jsonb(new) end;

  if tg_table_name = 'leave_request_documents' then
    select worker_id, project_id
    into request_worker_id, request_project_id
    from public.leave_requests
    where id = new.leave_request_id;

    previous := null;
    current_value := jsonb_build_object(
      'id', new.id,
      'leave_request_id', new.leave_request_id,
      'worker_id', request_worker_id,
      'project_id', request_project_id,
      'mime_type', new.mime_type,
      'size_bytes', new.size_bytes
    );
  end if;

  record_id := coalesce(current_value ->> 'id', previous ->> 'id');
  insert into public.audit_entries (
    actor_user_id,
    action,
    module,
    entity_type,
    entity_id,
    source,
    before_data,
    after_data
  )
  values (
    private.current_application_user_id(),
    'leave.' || lower(tg_op),
    'leave',
    tg_table_name,
    record_id,
    'ONLINE',
    previous,
    current_value
  );

  return coalesce(new, old);
end;
$$;
