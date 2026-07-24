create type public.attendance_day_type as enum (
  'NORMAL',
  'SUNDAY',
  'PUBLIC_HOLIDAY'
);

create type public.attendance_record_status as enum ('ACTIVE', 'VOID');

create type public.attendance_sync_status as enum (
  'SYNCED',
  'FAILED',
  'CONFLICT'
);

create table public.project_days (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  work_date date not null,
  day_type public.attendance_day_type not null,
  source public.audit_source not null default 'ONLINE',
  correction_note text check (
    correction_note is null or char_length(btrim(correction_note)) <= 500
  ),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  updated_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, work_date)
);

create table public.attendance_sessions (
  id uuid primary key,
  worker_id uuid not null references public.workers (id),
  project_id uuid not null references public.projects (id),
  work_date date not null,
  entered_at timestamptz not null,
  exited_at timestamptz,
  record_status public.attendance_record_status not null default 'ACTIVE',
  source public.audit_source not null default 'ONLINE',
  correction_note text check (
    correction_note is null or char_length(btrim(correction_note)) <= 500
  ),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  updated_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (exited_at is null or exited_at > entered_at),
  check (
    (entered_at at time zone 'Asia/Kuala_Lumpur')::date = work_date
  )
);

create table public.break_intervals (
  id uuid primary key,
  attendance_session_id uuid not null references public.attendance_sessions (id),
  started_at timestamptz not null,
  ended_at timestamptz,
  record_status public.attendance_record_status not null default 'ACTIVE',
  source public.audit_source not null default 'ONLINE',
  correction_note text check (
    correction_note is null or char_length(btrim(correction_note)) <= 500
  ),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  updated_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);

create table public.attendance_sync_actions (
  client_action_id uuid primary key,
  actor_user_id uuid not null default private.current_application_user_id()
    references public.application_users (id),
  project_id uuid not null references public.projects (id),
  action_type text not null check (
    action_type in (
      'SET_DAY_TYPE',
      'ENTER',
      'EXIT',
      'START_BREAK',
      'END_BREAK',
      'CORRECT_DAY'
    )
  ),
  request_data jsonb not null,
  status public.attendance_sync_status not null,
  result_data jsonb not null,
  processed_at timestamptz not null default now()
);

create index project_days_date_idx
on public.project_days (work_date desc, project_id);

create index attendance_sessions_project_date_idx
on public.attendance_sessions (project_id, work_date desc);

create index attendance_sessions_worker_date_idx
on public.attendance_sessions (worker_id, work_date desc);

create index break_intervals_session_idx
on public.break_intervals (attendance_session_id, started_at);

create index attendance_sync_actions_project_idx
on public.attendance_sync_actions (project_id, processed_at desc);

alter table public.attendance_sessions
add constraint attendance_sessions_no_overlap
exclude using gist (
  worker_id with =,
  project_id with =,
  tstzrange(
    entered_at,
    coalesce(exited_at, 'infinity'::timestamptz),
    '[)'
  ) with &&
)
where (record_status = 'ACTIVE');

alter table public.break_intervals
add constraint break_intervals_no_overlap
exclude using gist (
  attendance_session_id with =,
  tstzrange(
    started_at,
    coalesce(ended_at, 'infinity'::timestamptz),
    '[)'
  ) with &&
)
where (record_status = 'ACTIVE');

create or replace function private.can_manage_attendance_project(
  target_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_ceo()
    or private.current_foreman_project_id() = target_project_id;
$$;

create or replace function private.can_record_worker_attendance(
  target_worker_id uuid,
  target_project_id uuid,
  target_work_date date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.worker_project_assignments
    join public.worker_employment_periods
      on worker_employment_periods.worker_id =
        worker_project_assignments.worker_id
    where worker_project_assignments.worker_id = target_worker_id
      and worker_project_assignments.project_id = target_project_id
      and worker_project_assignments.starts_on <= target_work_date
      and (
        worker_project_assignments.ends_on is null
        or worker_project_assignments.ends_on > target_work_date
      )
      and worker_employment_periods.status = 'ACTIVE'
      and worker_employment_periods.starts_on <= target_work_date
      and (
        worker_employment_periods.ends_on is null
        or worker_employment_periods.ends_on > target_work_date
      )
  );
$$;

revoke all on function private.can_manage_attendance_project(uuid) from public;
revoke all on function private.can_record_worker_attendance(uuid, uuid, date)
  from public;
grant execute on function private.can_manage_attendance_project(uuid)
  to authenticated;
grant execute on function private.can_record_worker_attendance(uuid, uuid, date)
  to authenticated;

create or replace function private.write_attendance_audit_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous jsonb;
  current_value jsonb;
  record_id text;
  audit_source public.audit_source;
  module_name text;
begin
  previous := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  current_value := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  record_id := coalesce(current_value ->> 'id', previous ->> 'id');
  audit_source := coalesce(
    (current_value ->> 'source')::public.audit_source,
    (previous ->> 'source')::public.audit_source,
    'ONLINE'::public.audit_source
  );
  module_name := case
    when tg_table_name = 'project_days' then 'attendance_day_types'
    else 'attendance'
  end;

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
    module_name || '.' || lower(tg_op),
    module_name,
    tg_table_name,
    record_id,
    audit_source,
    previous,
    current_value
  );

  return coalesce(new, old);
end;
$$;

create trigger project_days_set_updated_at
before update on public.project_days
for each row execute function private.set_updated_at();

create trigger attendance_sessions_set_updated_at
before update on public.attendance_sessions
for each row execute function private.set_updated_at();

create trigger break_intervals_set_updated_at
before update on public.break_intervals
for each row execute function private.set_updated_at();

create trigger project_days_audit
after insert or update on public.project_days
for each row execute function private.write_attendance_audit_entry();

create trigger attendance_sessions_audit
after insert or update on public.attendance_sessions
for each row execute function private.write_attendance_audit_entry();

create trigger break_intervals_audit
after insert or update on public.break_intervals
for each row execute function private.write_attendance_audit_entry();

create or replace function public.apply_attendance_action(
  p_client_action_id uuid,
  p_project_id uuid,
  p_action_type text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  existing_action public.attendance_sync_actions%rowtype;
  action_source public.audit_source;
  action_result jsonb;
  result_status public.attendance_sync_status;
  target_worker_id uuid;
  target_session_id uuid;
  target_break_id uuid;
  target_work_date date;
  event_time timestamptz;
  target_day_type public.attendance_day_type;
  v_correction_note text;
  session_record public.attendance_sessions%rowtype;
  break_record public.break_intervals%rowtype;
  session_payload jsonb;
  break_payload jsonb;
  corrected_session_id uuid;
  corrected_entered_at timestamptz;
  corrected_exited_at timestamptz;
  corrected_break_ended_at timestamptz;
begin
  actor_id := private.current_application_user_id();

  if actor_id is null then
    raise exception 'An active application user is required';
  end if;

  select *
  into existing_action
  from public.attendance_sync_actions
  where client_action_id = p_client_action_id;

  if existing_action.client_action_id is not null then
    if existing_action.actor_user_id <> actor_id then
      return jsonb_build_object(
        'status', 'CONFLICT',
        'message', 'This action identifier belongs to another user.'
      );
    end if;
    return existing_action.result_data;
  end if;

  action_source := case
    when coalesce((p_payload ->> 'capturedOffline')::boolean, false)
      then 'OFFLINE_SYNC'::public.audit_source
    else 'ONLINE'::public.audit_source
  end;

  if not private.can_manage_attendance_project(p_project_id) then
    action_result := jsonb_build_object(
      'status', 'FAILED',
      'message', 'You no longer have permission to manage this project.'
    );
    insert into public.attendance_sync_actions (
      client_action_id,
      actor_user_id,
      project_id,
      action_type,
      request_data,
      status,
      result_data
    )
    values (
      p_client_action_id,
      actor_id,
      p_project_id,
      p_action_type,
      p_payload,
      'FAILED',
      action_result
    );
    return action_result;
  end if;

  begin
    case p_action_type
      when 'SET_DAY_TYPE' then
        target_work_date := (p_payload ->> 'workDate')::date;
        target_day_type := (p_payload ->> 'dayType')::public.attendance_day_type;
        v_correction_note := nullif(btrim(p_payload ->> 'note'), '');

        insert into public.project_days (
          project_id,
          work_date,
          day_type,
          source,
          correction_note,
          created_by,
          updated_by
        )
        values (
          p_project_id,
          target_work_date,
          target_day_type,
          action_source,
          v_correction_note,
          actor_id,
          actor_id
        )
        on conflict (project_id, work_date) do update
        set
          day_type = excluded.day_type,
          source = excluded.source,
          correction_note = excluded.correction_note,
          updated_by = actor_id;

      when 'ENTER' then
        target_worker_id := (p_payload ->> 'workerId')::uuid;
        target_session_id := (p_payload ->> 'sessionId')::uuid;
        target_work_date := (p_payload ->> 'workDate')::date;
        event_time := (p_payload ->> 'occurredAt')::timestamptz;

        if not private.can_record_worker_attendance(
          target_worker_id,
          p_project_id,
          target_work_date
        ) then
          raise exception 'The worker is not active on this project date';
        end if;

        insert into public.attendance_sessions (
          id,
          worker_id,
          project_id,
          work_date,
          entered_at,
          source,
          created_by,
          updated_by
        )
        values (
          target_session_id,
          target_worker_id,
          p_project_id,
          target_work_date,
          event_time,
          action_source,
          actor_id,
          actor_id
        );

      when 'EXIT' then
        target_session_id := (p_payload ->> 'sessionId')::uuid;
        event_time := (p_payload ->> 'occurredAt')::timestamptz;

        select *
        into session_record
        from public.attendance_sessions
        where id = target_session_id
          and project_id = p_project_id
          and record_status = 'ACTIVE'
        for update;

        if session_record.id is null then
          raise exception 'The active work session could not be found';
        end if;
        if session_record.exited_at is not null then
          raise exception 'The worker has already exited this session';
        end if;
        if exists (
          select 1
          from public.break_intervals
          where attendance_session_id = target_session_id
            and record_status = 'ACTIVE'
            and ended_at is null
        ) then
          raise exception 'End the open break before recording an exit';
        end if;

        update public.attendance_sessions
        set
          exited_at = event_time,
          source = action_source,
          updated_by = actor_id
        where id = target_session_id;

      when 'START_BREAK' then
        target_session_id := (p_payload ->> 'sessionId')::uuid;
        target_break_id := (p_payload ->> 'breakId')::uuid;
        event_time := (p_payload ->> 'occurredAt')::timestamptz;

        select *
        into session_record
        from public.attendance_sessions
        where id = target_session_id
          and project_id = p_project_id
          and record_status = 'ACTIVE'
        for update;

        if session_record.id is null
          or session_record.exited_at is not null
          or event_time <= session_record.entered_at then
          raise exception 'A break can only start inside an open work session';
        end if;

        insert into public.break_intervals (
          id,
          attendance_session_id,
          started_at,
          source,
          created_by,
          updated_by
        )
        values (
          target_break_id,
          target_session_id,
          event_time,
          action_source,
          actor_id,
          actor_id
        );

      when 'END_BREAK' then
        target_break_id := (p_payload ->> 'breakId')::uuid;
        event_time := (p_payload ->> 'occurredAt')::timestamptz;

        select break_intervals.*
        into break_record
        from public.break_intervals
        join public.attendance_sessions
          on attendance_sessions.id =
            break_intervals.attendance_session_id
        where break_intervals.id = target_break_id
          and break_intervals.record_status = 'ACTIVE'
          and attendance_sessions.project_id = p_project_id
          and attendance_sessions.record_status = 'ACTIVE'
        for update of break_intervals;

        if break_record.id is null or break_record.ended_at is not null then
          raise exception 'The open break could not be found';
        end if;

        update public.break_intervals
        set
          ended_at = event_time,
          source = action_source,
          updated_by = actor_id
        where id = target_break_id;

      when 'CORRECT_DAY' then
        target_worker_id := (p_payload ->> 'workerId')::uuid;
        target_work_date := (p_payload ->> 'workDate')::date;
        v_correction_note := nullif(btrim(p_payload ->> 'note'), '');

        if v_correction_note is null then
          raise exception 'A correction reason is required';
        end if;
        if jsonb_typeof(p_payload -> 'sessions') <> 'array'
          or jsonb_array_length(p_payload -> 'sessions') > 12 then
          raise exception 'Provide a valid list of up to 12 work sessions';
        end if;
        if not private.can_record_worker_attendance(
          target_worker_id,
          p_project_id,
          target_work_date
        ) then
          raise exception 'The worker is not active on this project date';
        end if;

        update public.attendance_sessions
        set
          record_status = 'VOID',
          source = action_source,
          correction_note = v_correction_note,
          updated_by = actor_id
        where worker_id = target_worker_id
          and project_id = p_project_id
          and work_date = target_work_date
          and record_status = 'ACTIVE';

        for session_payload in
          select value from jsonb_array_elements(p_payload -> 'sessions')
        loop
          corrected_session_id := (session_payload ->> 'id')::uuid;
          corrected_entered_at :=
            (session_payload ->> 'enteredAt')::timestamptz;
          corrected_exited_at := case
            when nullif(session_payload ->> 'exitedAt', '') is null then null
            else (session_payload ->> 'exitedAt')::timestamptz
          end;

          insert into public.attendance_sessions (
            id,
            worker_id,
            project_id,
            work_date,
            entered_at,
            exited_at,
            source,
            correction_note,
            created_by,
            updated_by
          )
          values (
            corrected_session_id,
            target_worker_id,
            p_project_id,
            target_work_date,
            corrected_entered_at,
            corrected_exited_at,
            action_source,
            v_correction_note,
            actor_id,
            actor_id
          );

          if jsonb_typeof(session_payload -> 'breaks') = 'array' then
            for break_payload in
              select value
              from jsonb_array_elements(session_payload -> 'breaks')
            loop
              event_time := (break_payload ->> 'startedAt')::timestamptz;
              corrected_break_ended_at := case
                when nullif(break_payload ->> 'endedAt', '') is null then null
                else (break_payload ->> 'endedAt')::timestamptz
              end;
              if event_time <= corrected_entered_at
                or (
                  corrected_exited_at is not null
                  and event_time >= corrected_exited_at
                )
                or (
                  corrected_exited_at is not null
                  and corrected_break_ended_at is null
                )
                or (
                  corrected_break_ended_at is not null
                  and (
                    corrected_break_ended_at <= event_time
                    or (
                      corrected_exited_at is not null
                      and corrected_break_ended_at > corrected_exited_at
                    )
                  )
                ) then
                raise exception 'Every break must remain inside its work session';
              end if;

              insert into public.break_intervals (
                id,
                attendance_session_id,
                started_at,
                ended_at,
                source,
                correction_note,
                created_by,
                updated_by
              )
              values (
                (break_payload ->> 'id')::uuid,
                corrected_session_id,
                event_time,
                corrected_break_ended_at,
                action_source,
                v_correction_note,
                actor_id,
                actor_id
              );
            end loop;
          end if;
        end loop;

      else
        raise exception 'Unsupported attendance action';
    end case;

    result_status := 'SYNCED';
    action_result := jsonb_build_object(
      'status', 'SYNCED',
      'message', 'Attendance saved successfully.'
    );
  exception
    when exclusion_violation or check_violation or unique_violation then
      result_status := 'CONFLICT';
      action_result := jsonb_build_object(
        'status', 'CONFLICT',
        'message', case
          when p_action_type = 'CORRECT_DAY'
            then 'The corrected times overlap or contain an invalid interval.'
          else 'This action conflicts with the current attendance record.'
        end
      );
    when invalid_text_representation or datetime_field_overflow then
      result_status := 'FAILED';
      action_result := jsonb_build_object(
        'status', 'FAILED',
        'message', 'The attendance action contains an invalid value.'
      );
    when others then
      result_status := 'FAILED';
      action_result := jsonb_build_object(
        'status', 'FAILED',
        'message', sqlerrm
      );
  end;

  insert into public.attendance_sync_actions (
    client_action_id,
    actor_user_id,
    project_id,
    action_type,
    request_data,
    status,
    result_data
  )
  values (
    p_client_action_id,
    actor_id,
    p_project_id,
    p_action_type,
    p_payload,
    result_status,
    action_result
  );

  return action_result;
end;
$$;

revoke all on function public.apply_attendance_action(uuid, uuid, text, jsonb)
  from public;
grant execute on function public.apply_attendance_action(uuid, uuid, text, jsonb)
  to authenticated;

alter table public.project_days enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.break_intervals enable row level security;
alter table public.attendance_sync_actions enable row level security;

grant select on public.project_days to authenticated;
grant select on public.attendance_sessions to authenticated;
grant select on public.break_intervals to authenticated;
grant select on public.attendance_sync_actions to authenticated;

create policy "CEO can read all project days and Foremen read their project days"
on public.project_days
for select
to authenticated
using (private.can_manage_attendance_project(project_id));

create policy "CEO can read all attendance and Foremen read their project"
on public.attendance_sessions
for select
to authenticated
using (private.can_manage_attendance_project(project_id));

create policy "CEO can read all breaks and Foremen read their project breaks"
on public.break_intervals
for select
to authenticated
using (
  exists (
    select 1
    from public.attendance_sessions
    where attendance_sessions.id =
      break_intervals.attendance_session_id
      and private.can_manage_attendance_project(
        attendance_sessions.project_id
      )
  )
);

create policy "Users read their sync results and CEO reads all sync results"
on public.attendance_sync_actions
for select
to authenticated
using (
  private.is_current_ceo()
  or actor_user_id = private.current_application_user_id()
);
