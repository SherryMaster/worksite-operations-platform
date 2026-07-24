create or replace function public.assign_foreman(
  project_id uuid,
  foreman_user_id uuid,
  starts_on date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_assignment public.foreman_project_assignments;
  assignment_id uuid;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can assign Foremen';
  end if;

  if starts_on > private.current_business_date() then
    raise exception 'Future Foreman assignments are not supported';
  end if;

  select *
  into current_assignment
  from public.foreman_project_assignments
  where foreman_project_assignments.project_id = assign_foreman.project_id
    and ends_on is null
  for update;

  if current_assignment.foreman_user_id = assign_foreman.foreman_user_id then
    raise exception 'This Foreman is already assigned to the project';
  end if;

  if current_assignment.id is not null then
    if starts_on < current_assignment.starts_on then
      raise exception 'Replacement date cannot predate the current assignment';
    end if;

    update public.foreman_project_assignments
    set
      ends_on = assign_foreman.starts_on,
      ended_by = private.current_application_user_id()
    where id = current_assignment.id;
  end if;

  insert into public.foreman_project_assignments (
    project_id,
    foreman_user_id,
    starts_on,
    created_by
  )
  values (
    assign_foreman.project_id,
    assign_foreman.foreman_user_id,
    assign_foreman.starts_on,
    private.current_application_user_id()
  )
  returning id into assignment_id;

  return assignment_id;
end;
$$;

revoke all on function public.assign_foreman(uuid, uuid, date) from public;
grant execute on function public.assign_foreman(uuid, uuid, date)
to authenticated;
