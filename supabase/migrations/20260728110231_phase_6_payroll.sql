create type public.payroll_run_status as enum (
  'DRAFT',
  'NEEDS_REVIEW',
  'APPROVED'
);

create type public.payroll_earning_category as enum (
  'NORMAL',
  'OVERTIME',
  'SUNDAY',
  'PUBLIC_HOLIDAY'
);

create type public.payroll_adjustment_kind as enum ('ADDITION', 'DEDUCTION');
create type public.payroll_adjustment_source as enum ('MANUAL', 'CORRECTION');
create type public.payroll_adjustment_status as enum (
  'PENDING',
  'APPLIED',
  'SETTLED'
);
create type public.payroll_payment_status as enum ('UNPAID', 'PAID');
create type public.payroll_payment_method as enum ('CASH', 'BANK_TRANSFER');
create type public.payroll_exception_type as enum (
  'INCOMPLETE_ATTENDANCE',
  'OPEN_OR_INVALID_BREAK',
  'MISSING_RATE',
  'ATTENDANCE_LEAVE_CONFLICT',
  'NEGATIVE_NET_PAY',
  'CALCULATION_FAILURE'
);

create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  payroll_month date not null unique
    check (payroll_month = date_trunc('month', payroll_month)::date),
  period_start date not null,
  period_end date not null,
  status public.payroll_run_status not null default 'DRAFT',
  calculation_revision integer not null default 0
    check (calculation_revision >= 0),
  worker_count integer not null default 0 check (worker_count >= 0),
  gross_earnings_sen bigint not null default 0
    check (gross_earnings_sen >= 0),
  additions_sen bigint not null default 0 check (additions_sen >= 0),
  deductions_sen bigint not null default 0 check (deductions_sen >= 0),
  food_deductions_sen bigint not null default 0
    check (food_deductions_sen >= 0),
  net_payroll_sen bigint not null default 0,
  blocking_exception_count integer not null default 0
    check (blocking_exception_count >= 0),
  generated_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  generated_at timestamptz not null default now(),
  approved_by uuid references public.application_users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_start = payroll_month),
  check (
    period_end =
      (payroll_month + interval '1 month - 1 day')::date
  ),
  check (
    (
      status in ('DRAFT', 'NEEDS_REVIEW')
      and (
        (approved_by is null and approved_at is null)
        or (approved_by is not null and approved_at is not null)
      )
    )
    or (
      status = 'APPROVED'
      and approved_by is not null
      and approved_at is not null
    )
  )
);

create table public.payroll_workers (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs (id)
    on delete cascade,
  worker_id uuid not null references public.workers (id),
  primary_project_id uuid references public.projects (id),
  worker_name text not null,
  normal_minutes integer not null default 0 check (normal_minutes >= 0),
  overtime_minutes integer not null default 0 check (overtime_minutes >= 0),
  sunday_minutes integer not null default 0 check (sunday_minutes >= 0),
  public_holiday_minutes integer not null default 0
    check (public_holiday_minutes >= 0),
  gross_earnings_sen bigint not null default 0
    check (gross_earnings_sen >= 0),
  additions_sen bigint not null default 0 check (additions_sen >= 0),
  deductions_sen bigint not null default 0 check (deductions_sen >= 0),
  food_deduction_sen bigint not null default 0
    check (food_deduction_sen >= 0),
  net_pay_sen bigint not null default 0,
  payment_status public.payroll_payment_status not null default 'UNPAID',
  calculation_revision integer not null default 0
    check (calculation_revision >= 0),
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_run_id, worker_id)
);

create table public.payroll_earning_buckets (
  id uuid primary key default gen_random_uuid(),
  payroll_worker_id uuid not null references public.payroll_workers (id)
    on delete cascade,
  project_id uuid not null references public.projects (id),
  rate_period_id uuid not null references public.worker_rate_periods (id),
  category public.payroll_earning_category not null,
  minutes integer not null check (minutes > 0),
  hourly_rate_sen integer not null check (hourly_rate_sen > 0),
  multiplier_basis_points integer not null
    check (multiplier_basis_points in (100, 150, 200, 300)),
  amount_sen bigint not null check (amount_sen >= 0),
  created_at timestamptz not null default now(),
  unique (
    payroll_worker_id,
    project_id,
    rate_period_id,
    category
  )
);

create table public.payroll_source_days (
  id uuid primary key default gen_random_uuid(),
  payroll_worker_id uuid not null references public.payroll_workers (id)
    on delete cascade,
  project_id uuid not null references public.projects (id),
  work_date date not null,
  day_type public.attendance_day_type not null,
  normal_minutes integer not null default 0 check (normal_minutes >= 0),
  overtime_minutes integer not null default 0 check (overtime_minutes >= 0),
  sunday_minutes integer not null default 0 check (sunday_minutes >= 0),
  public_holiday_minutes integer not null default 0
    check (public_holiday_minutes >= 0),
  approved_leave boolean not null default false,
  leave_type_name text,
  created_at timestamptz not null default now(),
  unique (payroll_worker_id, project_id, work_date),
  check (
    (approved_leave and leave_type_name is not null)
    or (not approved_leave and leave_type_name is null)
  )
);

create table public.payroll_exceptions (
  id uuid primary key default gen_random_uuid(),
  payroll_worker_id uuid not null references public.payroll_workers (id)
    on delete cascade,
  project_id uuid references public.projects (id),
  work_date date,
  exception_type public.payroll_exception_type not null,
  message text not null check (char_length(btrim(message)) between 2 and 500),
  blocking boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  payroll_month date not null
    check (payroll_month = date_trunc('month', payroll_month)::date),
  kind public.payroll_adjustment_kind not null,
  amount_sen integer not null check (amount_sen > 0),
  source public.payroll_adjustment_source not null default 'MANUAL',
  status public.payroll_adjustment_status not null default 'PENDING',
  reason text not null check (char_length(btrim(reason)) between 2 and 500),
  source_payroll_worker_id uuid references public.payroll_workers (id),
  target_payroll_worker_id uuid references public.payroll_workers (id)
    on delete set null,
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'SETTLED' and settled_at is not null)
    or (status <> 'SETTLED' and settled_at is null)
  ),
  check (
    (source = 'MANUAL' and source_payroll_worker_id is null)
    or (source = 'CORRECTION' and source_payroll_worker_id is not null)
  )
);

create unique index payroll_correction_adjustment_source_unique
on public.payroll_adjustments (source_payroll_worker_id)
where source = 'CORRECTION' and status <> 'SETTLED';

create table public.payroll_approval_revisions (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs (id),
  revision integer not null check (revision > 0),
  snapshot jsonb not null,
  approved_by uuid not null references public.application_users (id),
  approved_at timestamptz not null default now(),
  unique (payroll_run_id, revision)
);

create table public.payroll_statements (
  id uuid primary key default gen_random_uuid(),
  payroll_worker_id uuid not null references public.payroll_workers (id),
  approval_revision_id uuid not null
    references public.payroll_approval_revisions (id),
  statement_number text not null unique,
  snapshot jsonb not null,
  generated_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  generated_at timestamptz not null default now(),
  unique (payroll_worker_id, approval_revision_id)
);

create table public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  payroll_worker_id uuid not null unique
    references public.payroll_workers (id),
  approval_revision_id uuid not null
    references public.payroll_approval_revisions (id),
  amount_sen bigint not null check (amount_sen >= 0),
  payment_date date not null,
  method public.payroll_payment_method not null,
  reference text check (
    reference is null or char_length(btrim(reference)) <= 120
  ),
  notes text check (notes is null or char_length(btrim(notes)) <= 1000),
  paid_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  paid_at timestamptz not null default now()
);

create index payroll_runs_status_month_idx
on public.payroll_runs (status, payroll_month desc);
create index payroll_runs_generated_by_idx
on public.payroll_runs (generated_by);
create index payroll_runs_approved_by_idx
on public.payroll_runs (approved_by);
create index payroll_workers_run_project_idx
on public.payroll_workers (payroll_run_id, primary_project_id, worker_name);
create index payroll_workers_worker_idx
on public.payroll_workers (worker_id, payroll_run_id);
create index payroll_workers_primary_project_idx
on public.payroll_workers (primary_project_id);
create index payroll_buckets_worker_idx
on public.payroll_earning_buckets (payroll_worker_id, category);
create index payroll_buckets_project_idx
on public.payroll_earning_buckets (project_id, payroll_worker_id);
create index payroll_buckets_rate_period_idx
on public.payroll_earning_buckets (rate_period_id);
create index payroll_source_days_worker_date_idx
on public.payroll_source_days (payroll_worker_id, work_date);
create index payroll_source_days_project_date_idx
on public.payroll_source_days (project_id, work_date);
create index payroll_exceptions_worker_idx
on public.payroll_exceptions (payroll_worker_id, blocking);
create index payroll_exceptions_project_idx
on public.payroll_exceptions (project_id);
create index payroll_adjustments_month_worker_idx
on public.payroll_adjustments (payroll_month, worker_id, status);
create index payroll_adjustments_worker_idx
on public.payroll_adjustments (worker_id);
create index payroll_adjustments_created_by_idx
on public.payroll_adjustments (created_by);
create index payroll_adjustments_target_idx
on public.payroll_adjustments (target_payroll_worker_id)
where target_payroll_worker_id is not null;
create index payroll_revisions_run_idx
on public.payroll_approval_revisions (payroll_run_id, revision desc);
create index payroll_revisions_approved_by_idx
on public.payroll_approval_revisions (approved_by);
create index payroll_statements_worker_idx
on public.payroll_statements (payroll_worker_id, generated_at desc);
create index payroll_statements_revision_idx
on public.payroll_statements (approval_revision_id);
create index payroll_statements_generated_by_idx
on public.payroll_statements (generated_by);
create index payroll_payments_revision_idx
on public.payroll_payments (approval_revision_id);
create index payroll_payments_paid_by_idx
on public.payroll_payments (paid_by);

create or replace function private.payroll_overlap_seconds(
  left_start timestamptz,
  left_end timestamptz,
  right_start timestamptz,
  right_end timestamptz
)
returns bigint
language sql
immutable
strict
set search_path = ''
as $$
  select greatest(
    0,
    floor(
      extract(
        epoch from least(left_end, right_end) - greatest(left_start, right_start)
      )
    )
  )::bigint;
$$;

create or replace function private.calculate_payroll_worker(
  target_worker_id uuid,
  target_period_start date,
  target_period_end date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
  worker_name_value text;
  primary_project uuid;
  food_amount integer := 0;
  additions_total bigint := 0;
  deductions_total bigint := 0;
  gross_total bigint := 0;
  net_total bigint := 0;
  buckets jsonb := '[]'::jsonb;
  source_days jsonb := '[]'::jsonb;
  exceptions jsonb := '[]'::jsonb;
begin
  select legal_name into worker_name_value
  from public.workers
  where id = target_worker_id;

  if worker_name_value is null then
    raise exception 'Worker does not exist';
  end if;

  with session_quality as (
    select
      attendance_sessions.id,
      attendance_sessions.project_id,
      attendance_sessions.work_date,
      attendance_sessions.entered_at,
      attendance_sessions.exited_at,
      coalesce(
        project_days.day_type,
        case
          when extract(
            isodow from attendance_sessions.work_date
          ) = 7 then 'SUNDAY'::public.attendance_day_type
          else 'NORMAL'::public.attendance_day_type
        end
      ) as day_type,
      attendance_sessions.exited_at is not null
        and not exists (
          select 1
          from public.break_intervals
          where break_intervals.attendance_session_id =
              attendance_sessions.id
            and break_intervals.record_status = 'ACTIVE'
            and (
              break_intervals.ended_at is null
              or break_intervals.started_at <=
                attendance_sessions.entered_at
              or break_intervals.ended_at >
                attendance_sessions.exited_at
            )
        ) as is_valid
    from public.attendance_sessions
    left join public.project_days
      on project_days.project_id = attendance_sessions.project_id
      and project_days.work_date = attendance_sessions.work_date
    where attendance_sessions.worker_id = target_worker_id
      and attendance_sessions.work_date between
        target_period_start and target_period_end
      and attendance_sessions.record_status = 'ACTIVE'
  ),
  session_seconds as (
    select
      session_quality.*,
      (
        session_quality.work_date::timestamp
          + time '17:00'
      ) at time zone 'Asia/Kuala_Lumpur' as cutoff_at,
      coalesce((
        select sum(
          private.payroll_overlap_seconds(
            break_intervals.started_at,
            break_intervals.ended_at,
            session_quality.entered_at,
            least(
              session_quality.exited_at,
              (
                session_quality.work_date::timestamp
                  + time '17:00'
              ) at time zone 'Asia/Kuala_Lumpur'
            )
          )
        )
        from public.break_intervals
        where break_intervals.attendance_session_id = session_quality.id
          and break_intervals.record_status = 'ACTIVE'
          and break_intervals.ended_at is not null
      ), 0) as normal_break_seconds,
      coalesce((
        select sum(
          private.payroll_overlap_seconds(
            break_intervals.started_at,
            break_intervals.ended_at,
            greatest(
              session_quality.entered_at,
              (
                session_quality.work_date::timestamp
                  + time '17:00'
              ) at time zone 'Asia/Kuala_Lumpur'
            ),
            session_quality.exited_at
          )
        )
        from public.break_intervals
        where break_intervals.attendance_session_id = session_quality.id
          and break_intervals.record_status = 'ACTIVE'
          and break_intervals.ended_at is not null
      ), 0) as overtime_break_seconds,
      coalesce((
        select sum(
          private.payroll_overlap_seconds(
            break_intervals.started_at,
            break_intervals.ended_at,
            session_quality.entered_at,
            session_quality.exited_at
          )
        )
        from public.break_intervals
        where break_intervals.attendance_session_id = session_quality.id
          and break_intervals.record_status = 'ACTIVE'
          and break_intervals.ended_at is not null
      ), 0) as total_break_seconds
    from session_quality
    where session_quality.is_valid
  ),
  category_seconds as (
    select
      project_id,
      work_date,
      day_type,
      'NORMAL'::public.payroll_earning_category as category,
      greatest(
        0,
        private.payroll_overlap_seconds(
          entered_at,
          exited_at,
          entered_at,
          least(exited_at, cutoff_at)
        ) - normal_break_seconds
      ) as seconds
    from session_seconds
    where day_type = 'NORMAL'
    union all
    select
      project_id,
      work_date,
      day_type,
      'OVERTIME'::public.payroll_earning_category,
      greatest(
        0,
        private.payroll_overlap_seconds(
          entered_at,
          exited_at,
          greatest(entered_at, cutoff_at),
          exited_at
        ) - overtime_break_seconds
      )
    from session_seconds
    where day_type = 'NORMAL'
    union all
    select
      project_id,
      work_date,
      day_type,
      'SUNDAY'::public.payroll_earning_category,
      greatest(
        0,
        floor(extract(epoch from exited_at - entered_at))::bigint
          - total_break_seconds
      )
    from session_seconds
    where day_type = 'SUNDAY'
    union all
    select
      project_id,
      work_date,
      day_type,
      'PUBLIC_HOLIDAY'::public.payroll_earning_category,
      greatest(
        0,
        floor(extract(epoch from exited_at - entered_at))::bigint
          - total_break_seconds
      )
    from session_seconds
    where day_type = 'PUBLIC_HOLIDAY'
  ),
  daily_minutes as (
    select
      project_id,
      work_date,
      day_type,
      category,
      floor(sum(seconds) / 60.0)::integer as minutes
    from category_seconds
    group by project_id, work_date, day_type, category
    having floor(sum(seconds) / 60.0)::integer > 0
  ),
  rated_minutes as (
    select
      daily_minutes.*,
      rates.id as rate_period_id,
      rates.hourly_rate_sen,
      case daily_minutes.category
        when 'NORMAL' then 100
        when 'OVERTIME' then 150
        when 'SUNDAY' then 200
        when 'PUBLIC_HOLIDAY' then 300
      end as multiplier_basis_points
    from daily_minutes
    left join lateral (
      select worker_rate_periods.id, worker_rate_periods.hourly_rate_sen
      from public.worker_rate_periods
      where worker_rate_periods.worker_id = target_worker_id
        and worker_rate_periods.starts_on <= daily_minutes.work_date
        and (
          worker_rate_periods.ends_on is null
          or worker_rate_periods.ends_on > daily_minutes.work_date
        )
      order by worker_rate_periods.starts_on desc
      limit 1
    ) rates on true
  ),
  grouped_buckets as (
    select
      project_id,
      rate_period_id,
      category,
      hourly_rate_sen,
      multiplier_basis_points,
      sum(minutes)::integer as minutes,
      round(
        sum(minutes)::numeric
          * hourly_rate_sen::numeric
          * multiplier_basis_points::numeric
          / 6000
      )::bigint as amount_sen
    from rated_minutes
    where rate_period_id is not null
    group by
      project_id,
      rate_period_id,
      category,
      hourly_rate_sen,
      multiplier_basis_points
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'project_id', project_id,
        'rate_period_id', rate_period_id,
        'category', category,
        'minutes', minutes,
        'hourly_rate_sen', hourly_rate_sen,
        'multiplier_basis_points', multiplier_basis_points,
        'amount_sen', amount_sen
      )
      order by project_id, rate_period_id, category
    ),
    '[]'::jsonb
  )
  into buckets
  from grouped_buckets;

  with session_quality as (
    select
      attendance_sessions.id,
      attendance_sessions.project_id,
      attendance_sessions.work_date,
      attendance_sessions.entered_at,
      attendance_sessions.exited_at,
      coalesce(
        project_days.day_type,
        case
          when extract(isodow from attendance_sessions.work_date) = 7
            then 'SUNDAY'::public.attendance_day_type
          else 'NORMAL'::public.attendance_day_type
        end
      ) as day_type,
      attendance_sessions.exited_at is not null
        and not exists (
          select 1
          from public.break_intervals
          where break_intervals.attendance_session_id =
              attendance_sessions.id
            and break_intervals.record_status = 'ACTIVE'
            and (
              break_intervals.ended_at is null
              or break_intervals.started_at <=
                attendance_sessions.entered_at
              or break_intervals.ended_at >
                attendance_sessions.exited_at
            )
        ) as is_valid
    from public.attendance_sessions
    left join public.project_days
      on project_days.project_id = attendance_sessions.project_id
      and project_days.work_date = attendance_sessions.work_date
    where attendance_sessions.worker_id = target_worker_id
      and attendance_sessions.work_date between
        target_period_start and target_period_end
      and attendance_sessions.record_status = 'ACTIVE'
  ),
  session_seconds as (
    select
      session_quality.*,
      (
        session_quality.work_date::timestamp + time '17:00'
      ) at time zone 'Asia/Kuala_Lumpur' as cutoff_at,
      coalesce((
        select sum(
          private.payroll_overlap_seconds(
            break_intervals.started_at,
            break_intervals.ended_at,
            session_quality.entered_at,
            least(
              session_quality.exited_at,
              (
                session_quality.work_date::timestamp + time '17:00'
              ) at time zone 'Asia/Kuala_Lumpur'
            )
          )
        )
        from public.break_intervals
        where break_intervals.attendance_session_id = session_quality.id
          and break_intervals.record_status = 'ACTIVE'
          and break_intervals.ended_at is not null
      ), 0) as normal_break_seconds,
      coalesce((
        select sum(
          private.payroll_overlap_seconds(
            break_intervals.started_at,
            break_intervals.ended_at,
            greatest(
              session_quality.entered_at,
              (
                session_quality.work_date::timestamp + time '17:00'
              ) at time zone 'Asia/Kuala_Lumpur'
            ),
            session_quality.exited_at
          )
        )
        from public.break_intervals
        where break_intervals.attendance_session_id = session_quality.id
          and break_intervals.record_status = 'ACTIVE'
          and break_intervals.ended_at is not null
      ), 0) as overtime_break_seconds,
      coalesce((
        select sum(
          private.payroll_overlap_seconds(
            break_intervals.started_at,
            break_intervals.ended_at,
            session_quality.entered_at,
            session_quality.exited_at
          )
        )
        from public.break_intervals
        where break_intervals.attendance_session_id = session_quality.id
          and break_intervals.record_status = 'ACTIVE'
          and break_intervals.ended_at is not null
      ), 0) as total_break_seconds
    from session_quality
    where session_quality.is_valid
  ),
  category_seconds as (
    select
      project_id,
      work_date,
      day_type,
      'NORMAL'::public.payroll_earning_category as category,
      greatest(
        0,
        private.payroll_overlap_seconds(
          entered_at,
          exited_at,
          entered_at,
          least(exited_at, cutoff_at)
        ) - normal_break_seconds
      ) as seconds
    from session_seconds
    where day_type = 'NORMAL'
    union all
    select
      project_id,
      work_date,
      day_type,
      'OVERTIME'::public.payroll_earning_category,
      greatest(
        0,
        private.payroll_overlap_seconds(
          entered_at,
          exited_at,
          greatest(entered_at, cutoff_at),
          exited_at
        ) - overtime_break_seconds
      )
    from session_seconds
    where day_type = 'NORMAL'
    union all
    select
      project_id,
      work_date,
      day_type,
      'SUNDAY'::public.payroll_earning_category,
      greatest(
        0,
        floor(extract(epoch from exited_at - entered_at))::bigint
          - total_break_seconds
      )
    from session_seconds
    where day_type = 'SUNDAY'
    union all
    select
      project_id,
      work_date,
      day_type,
      'PUBLIC_HOLIDAY'::public.payroll_earning_category,
      greatest(
        0,
        floor(extract(epoch from exited_at - entered_at))::bigint
          - total_break_seconds
      )
    from session_seconds
    where day_type = 'PUBLIC_HOLIDAY'
  ),
  daily_minutes as (
    select
      project_id,
      work_date,
      day_type,
      category,
      floor(sum(seconds) / 60.0)::integer as minutes
    from category_seconds
    group by project_id, work_date, day_type, category
  ),
  daily_pivot as (
    select
      project_id,
      work_date,
      day_type,
      coalesce(sum(minutes) filter (where category = 'NORMAL'), 0)::integer
        as normal_minutes,
      coalesce(sum(minutes) filter (where category = 'OVERTIME'), 0)::integer
        as overtime_minutes,
      coalesce(sum(minutes) filter (where category = 'SUNDAY'), 0)::integer
        as sunday_minutes,
      coalesce(
        sum(minutes) filter (where category = 'PUBLIC_HOLIDAY'),
        0
      )::integer as public_holiday_minutes
    from daily_minutes
    group by project_id, work_date, day_type
  ),
  attendance_days as (
    select
      attendance_sessions.project_id,
      attendance_sessions.work_date,
      coalesce(
        project_days.day_type,
        case
          when extract(isodow from attendance_sessions.work_date) = 7
            then 'SUNDAY'::public.attendance_day_type
          else 'NORMAL'::public.attendance_day_type
        end
      ) as day_type
    from public.attendance_sessions
    left join public.project_days
      on project_days.project_id = attendance_sessions.project_id
      and project_days.work_date = attendance_sessions.work_date
    where attendance_sessions.worker_id = target_worker_id
      and attendance_sessions.work_date between
        target_period_start and target_period_end
      and attendance_sessions.record_status = 'ACTIVE'
    group by
      attendance_sessions.project_id,
      attendance_sessions.work_date,
      project_days.day_type
  ),
  leave_days as (
    select
      approved_leave_days.project_id,
      approved_leave_days.leave_date as work_date,
      case
        when extract(isodow from approved_leave_days.leave_date) = 7
          then 'SUNDAY'::public.attendance_day_type
        else 'NORMAL'::public.attendance_day_type
      end as day_type,
      leave_types.name as leave_type_name
    from public.approved_leave_days
    join public.leave_types on leave_types.id =
      approved_leave_days.leave_type_id
    where approved_leave_days.worker_id = target_worker_id
      and approved_leave_days.leave_date between
        target_period_start and target_period_end
  ),
  payable_days as (
    select
      attendance_days.project_id,
      attendance_days.work_date,
      attendance_days.day_type,
      coalesce(daily_pivot.normal_minutes, 0) as normal_minutes,
      coalesce(daily_pivot.overtime_minutes, 0) as overtime_minutes,
      coalesce(daily_pivot.sunday_minutes, 0) as sunday_minutes,
      coalesce(daily_pivot.public_holiday_minutes, 0)
        as public_holiday_minutes
    from attendance_days
    left join daily_pivot
      on daily_pivot.project_id = attendance_days.project_id
      and daily_pivot.work_date = attendance_days.work_date
  ),
  combined_days as (
    select
      payable_days.project_id,
      payable_days.work_date,
      payable_days.day_type,
      payable_days.normal_minutes,
      payable_days.overtime_minutes,
      payable_days.sunday_minutes,
      payable_days.public_holiday_minutes,
      leave_days.leave_type_name
    from payable_days
    left join leave_days
      on leave_days.project_id = payable_days.project_id
      and leave_days.work_date = payable_days.work_date
    union
    select
      leave_days.project_id,
      leave_days.work_date,
      leave_days.day_type,
      0,
      0,
      0,
      0,
      leave_days.leave_type_name
    from leave_days
    where not exists (
      select 1 from payable_days
      where payable_days.project_id = leave_days.project_id
        and payable_days.work_date = leave_days.work_date
    )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'project_id', project_id,
        'work_date', work_date,
        'day_type', day_type,
        'normal_minutes', normal_minutes,
        'overtime_minutes', overtime_minutes,
        'sunday_minutes', sunday_minutes,
        'public_holiday_minutes', public_holiday_minutes,
        'approved_leave', leave_type_name is not null,
        'leave_type_name', leave_type_name
      )
      order by work_date, project_id
    ),
    '[]'::jsonb
  )
  into source_days
  from combined_days;

  with incomplete as (
    select
      attendance_sessions.project_id,
      attendance_sessions.work_date,
      'INCOMPLETE_ATTENDANCE'::public.payroll_exception_type
        as exception_type,
      'An attendance entrance has no exit time.'::text as message
    from public.attendance_sessions
    where attendance_sessions.worker_id = target_worker_id
      and attendance_sessions.work_date between
        target_period_start and target_period_end
      and attendance_sessions.record_status = 'ACTIVE'
      and attendance_sessions.exited_at is null
  ),
  invalid_breaks as (
    select distinct
      attendance_sessions.project_id,
      attendance_sessions.work_date,
      'OPEN_OR_INVALID_BREAK'::public.payroll_exception_type,
      'An unpaid break is open or falls outside its work session.'::text
    from public.attendance_sessions
    join public.break_intervals
      on break_intervals.attendance_session_id = attendance_sessions.id
      and break_intervals.record_status = 'ACTIVE'
    where attendance_sessions.worker_id = target_worker_id
      and attendance_sessions.work_date between
        target_period_start and target_period_end
      and (
        break_intervals.ended_at is null
        or break_intervals.started_at <= attendance_sessions.entered_at
        or (
          attendance_sessions.exited_at is not null
          and break_intervals.ended_at > attendance_sessions.exited_at
        )
      )
  ),
  missing_rates as (
    select distinct
      (item ->> 'project_id')::uuid as project_id,
      (item ->> 'work_date')::date as work_date,
      'MISSING_RATE'::public.payroll_exception_type,
      'Worked time has no effective hourly rate.'::text
    from jsonb_array_elements(source_days) item
    where (
      coalesce((item ->> 'normal_minutes')::integer, 0)
      + coalesce((item ->> 'overtime_minutes')::integer, 0)
      + coalesce((item ->> 'sunday_minutes')::integer, 0)
      + coalesce((item ->> 'public_holiday_minutes')::integer, 0)
    ) > 0
      and not exists (
        select 1
        from public.worker_rate_periods
        where worker_rate_periods.worker_id = target_worker_id
          and worker_rate_periods.starts_on <=
            (item ->> 'work_date')::date
          and (
            worker_rate_periods.ends_on is null
            or worker_rate_periods.ends_on >
              (item ->> 'work_date')::date
          )
      )
  ),
  leave_conflicts as (
    select distinct
      attendance_sessions.project_id,
      attendance_sessions.work_date,
      'ATTENDANCE_LEAVE_CONFLICT'::public.payroll_exception_type,
      'Approved full-day leave and attendance exist on the same date.'::text
    from public.attendance_sessions
    join public.approved_leave_days
      on approved_leave_days.worker_id = attendance_sessions.worker_id
      and approved_leave_days.project_id = attendance_sessions.project_id
      and approved_leave_days.leave_date = attendance_sessions.work_date
    where attendance_sessions.worker_id = target_worker_id
      and attendance_sessions.work_date between
        target_period_start and target_period_end
      and attendance_sessions.record_status = 'ACTIVE'
  ),
  combined as (
    select * from incomplete
    union all
    select * from invalid_breaks
    union all
    select * from missing_rates
    union all
    select * from leave_conflicts
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'project_id', project_id,
        'work_date', work_date,
        'exception_type', exception_type,
        'message', message,
        'blocking', true
      )
      order by work_date, exception_type
    ),
    '[]'::jsonb
  )
  into exceptions
  from combined;

  select coalesce(sum((item ->> 'amount_sen')::bigint), 0)
  into gross_total
  from jsonb_array_elements(buckets) item;

  select
    coalesce(sum(
      case when kind = 'ADDITION' then amount_sen else 0 end
    ), 0),
    coalesce(sum(
      case when kind = 'DEDUCTION' then amount_sen else 0 end
    ), 0)
  into additions_total, deductions_total
  from public.payroll_adjustments
  where worker_id = target_worker_id
    and payroll_month = target_period_start
    and status in ('PENDING', 'APPLIED');

  select monthly_amount_sen into food_amount
  from public.worker_food_deduction_periods
  where worker_id = target_worker_id
    and starts_on <= target_period_end
    and (ends_on is null or ends_on > target_period_start)
  order by starts_on desc
  limit 1;
  food_amount := coalesce(food_amount, 0);

  net_total :=
    gross_total + additions_total - deductions_total - food_amount;

  if net_total < 0 then
    exceptions := exceptions || jsonb_build_array(
      jsonb_build_object(
        'project_id', null,
        'work_date', null,
        'exception_type', 'NEGATIVE_NET_PAY',
        'message',
          'Deductions exceed earnings and additions. Net pay cannot be negative.',
        'blocking', true
      )
    );
  end if;

  select (item ->> 'project_id')::uuid
  into primary_project
  from jsonb_array_elements(source_days) item
  order by (item ->> 'work_date')::date desc
  limit 1;

  if primary_project is null then
    select worker_project_assignments.project_id
    into primary_project
    from public.worker_project_assignments
    where worker_project_assignments.worker_id = target_worker_id
      and worker_project_assignments.starts_on <= target_period_end
      and (
        worker_project_assignments.ends_on is null
        or worker_project_assignments.ends_on > target_period_start
      )
    order by worker_project_assignments.starts_on desc
    limit 1;
  end if;

  result := jsonb_build_object(
    'worker_id', target_worker_id,
    'worker_name', worker_name_value,
    'primary_project_id', primary_project,
    'normal_minutes', coalesce((
      select sum((item ->> 'minutes')::integer)
      from jsonb_array_elements(buckets) item
      where item ->> 'category' = 'NORMAL'
    ), 0),
    'overtime_minutes', coalesce((
      select sum((item ->> 'minutes')::integer)
      from jsonb_array_elements(buckets) item
      where item ->> 'category' = 'OVERTIME'
    ), 0),
    'sunday_minutes', coalesce((
      select sum((item ->> 'minutes')::integer)
      from jsonb_array_elements(buckets) item
      where item ->> 'category' = 'SUNDAY'
    ), 0),
    'public_holiday_minutes', coalesce((
      select sum((item ->> 'minutes')::integer)
      from jsonb_array_elements(buckets) item
      where item ->> 'category' = 'PUBLIC_HOLIDAY'
    ), 0),
    'gross_earnings_sen', gross_total,
    'additions_sen', additions_total,
    'deductions_sen', deductions_total,
    'food_deduction_sen', food_amount,
    'net_pay_sen', net_total,
    'buckets', buckets,
    'source_days', source_days,
    'exceptions', exceptions
  );

  return result;
end;
$$;

create or replace function private.refresh_payroll_run(target_run_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.payroll_runs%rowtype;
  candidate_worker_ids uuid[] := array[]::uuid[];
  candidate_worker_id uuid;
  calculation jsonb;
  worker_line_id uuid;
begin
  select * into run_row
  from public.payroll_runs
  where id = target_run_id
  for update;

  if run_row.id is null then
    raise exception 'Payroll run does not exist';
  end if;

  select coalesce(array_agg(worker_id order by worker_id), array[]::uuid[])
  into candidate_worker_ids
  from (
    select attendance_sessions.worker_id
    from public.attendance_sessions
    where attendance_sessions.work_date between
        run_row.period_start and run_row.period_end
      and attendance_sessions.record_status = 'ACTIVE'
    union
    select approved_leave_days.worker_id
    from public.approved_leave_days
    where approved_leave_days.leave_date between
        run_row.period_start and run_row.period_end
    union
    select payroll_adjustments.worker_id
    from public.payroll_adjustments
    where payroll_adjustments.payroll_month = run_row.payroll_month
      and payroll_adjustments.status in ('PENDING', 'APPLIED')
  ) candidates;

  delete from public.payroll_earning_buckets
  where payroll_worker_id in (
    select payroll_workers.id
    from public.payroll_workers
    where payroll_workers.payroll_run_id = target_run_id
      and not exists (
        select 1 from public.payroll_payments
        where payroll_payments.payroll_worker_id = payroll_workers.id
      )
  );

  delete from public.payroll_source_days
  where payroll_worker_id in (
    select payroll_workers.id
    from public.payroll_workers
    where payroll_workers.payroll_run_id = target_run_id
      and not exists (
        select 1 from public.payroll_payments
        where payroll_payments.payroll_worker_id = payroll_workers.id
      )
  );

  delete from public.payroll_exceptions
  where payroll_worker_id in (
    select payroll_workers.id
    from public.payroll_workers
    where payroll_workers.payroll_run_id = target_run_id
      and not exists (
        select 1 from public.payroll_payments
        where payroll_payments.payroll_worker_id = payroll_workers.id
      )
  );

  delete from public.payroll_workers
  where payroll_workers.payroll_run_id = target_run_id
    and not (payroll_workers.worker_id = any(candidate_worker_ids))
    and not exists (
      select 1 from public.payroll_payments
      where payroll_payments.payroll_worker_id = payroll_workers.id
    );

  foreach candidate_worker_id in array candidate_worker_ids loop
    select payroll_workers.id into worker_line_id
    from public.payroll_workers
    where payroll_workers.payroll_run_id = target_run_id
      and payroll_workers.worker_id = candidate_worker_id;

    if worker_line_id is not null and exists (
      select 1 from public.payroll_payments
      where payroll_payments.payroll_worker_id = worker_line_id
    ) then
      continue;
    end if;

    calculation := private.calculate_payroll_worker(
      candidate_worker_id,
      run_row.period_start,
      run_row.period_end
    );

    insert into public.payroll_workers (
      payroll_run_id,
      worker_id,
      primary_project_id,
      worker_name,
      normal_minutes,
      overtime_minutes,
      sunday_minutes,
      public_holiday_minutes,
      gross_earnings_sen,
      additions_sen,
      deductions_sen,
      food_deduction_sen,
      net_pay_sen,
      payment_status,
      calculation_revision,
      calculated_at
    )
    values (
      target_run_id,
      candidate_worker_id,
      (calculation ->> 'primary_project_id')::uuid,
      calculation ->> 'worker_name',
      (calculation ->> 'normal_minutes')::integer,
      (calculation ->> 'overtime_minutes')::integer,
      (calculation ->> 'sunday_minutes')::integer,
      (calculation ->> 'public_holiday_minutes')::integer,
      (calculation ->> 'gross_earnings_sen')::bigint,
      (calculation ->> 'additions_sen')::bigint,
      (calculation ->> 'deductions_sen')::bigint,
      (calculation ->> 'food_deduction_sen')::bigint,
      (calculation ->> 'net_pay_sen')::bigint,
      'UNPAID',
      run_row.calculation_revision + 1,
      now()
    )
    on conflict (payroll_run_id, worker_id) do update
    set
      primary_project_id = excluded.primary_project_id,
      worker_name = excluded.worker_name,
      normal_minutes = excluded.normal_minutes,
      overtime_minutes = excluded.overtime_minutes,
      sunday_minutes = excluded.sunday_minutes,
      public_holiday_minutes = excluded.public_holiday_minutes,
      gross_earnings_sen = excluded.gross_earnings_sen,
      additions_sen = excluded.additions_sen,
      deductions_sen = excluded.deductions_sen,
      food_deduction_sen = excluded.food_deduction_sen,
      net_pay_sen = excluded.net_pay_sen,
      calculation_revision = excluded.calculation_revision,
      calculated_at = excluded.calculated_at,
      updated_at = now()
    returning id into worker_line_id;

    insert into public.payroll_earning_buckets (
      payroll_worker_id,
      project_id,
      rate_period_id,
      category,
      minutes,
      hourly_rate_sen,
      multiplier_basis_points,
      amount_sen
    )
    select
      worker_line_id,
      bucket.project_id,
      bucket.rate_period_id,
      bucket.category::public.payroll_earning_category,
      bucket.minutes,
      bucket.hourly_rate_sen,
      bucket.multiplier_basis_points,
      bucket.amount_sen
    from jsonb_to_recordset(calculation -> 'buckets') as bucket(
      project_id uuid,
      rate_period_id uuid,
      category text,
      minutes integer,
      hourly_rate_sen integer,
      multiplier_basis_points integer,
      amount_sen bigint
    );

    insert into public.payroll_source_days (
      payroll_worker_id,
      project_id,
      work_date,
      day_type,
      normal_minutes,
      overtime_minutes,
      sunday_minutes,
      public_holiday_minutes,
      approved_leave,
      leave_type_name
    )
    select
      worker_line_id,
      source_day.project_id,
      source_day.work_date,
      source_day.day_type::public.attendance_day_type,
      source_day.normal_minutes,
      source_day.overtime_minutes,
      source_day.sunday_minutes,
      source_day.public_holiday_minutes,
      source_day.approved_leave,
      source_day.leave_type_name
    from jsonb_to_recordset(calculation -> 'source_days') as source_day(
      project_id uuid,
      work_date date,
      day_type text,
      normal_minutes integer,
      overtime_minutes integer,
      sunday_minutes integer,
      public_holiday_minutes integer,
      approved_leave boolean,
      leave_type_name text
    );

    insert into public.payroll_exceptions (
      payroll_worker_id,
      project_id,
      work_date,
      exception_type,
      message,
      blocking
    )
    select
      worker_line_id,
      exception_row.project_id,
      exception_row.work_date,
      exception_row.exception_type::public.payroll_exception_type,
      exception_row.message,
      exception_row.blocking
    from jsonb_to_recordset(calculation -> 'exceptions') as exception_row(
      project_id uuid,
      work_date date,
      exception_type text,
      message text,
      blocking boolean
    );

    update public.payroll_adjustments
    set
      target_payroll_worker_id = worker_line_id,
      status = 'APPLIED',
      updated_at = now()
    where worker_id = candidate_worker_id
      and payroll_month = run_row.payroll_month
      and status in ('PENDING', 'APPLIED');
  end loop;

  update public.payroll_runs
  set
    calculation_revision = calculation_revision + 1,
    worker_count = totals.worker_count,
    gross_earnings_sen = totals.gross_earnings_sen,
    additions_sen = totals.additions_sen,
    deductions_sen = totals.deductions_sen,
    food_deductions_sen = totals.food_deductions_sen,
    net_payroll_sen = totals.net_payroll_sen,
    blocking_exception_count = totals.blocking_exception_count,
    generated_by = private.current_application_user_id(),
    generated_at = now(),
    updated_at = now()
  from (
    select
      count(*)::integer as worker_count,
      coalesce(sum(payroll_workers.gross_earnings_sen), 0)::bigint
        as gross_earnings_sen,
      coalesce(sum(payroll_workers.additions_sen), 0)::bigint
        as additions_sen,
      coalesce(sum(payroll_workers.deductions_sen), 0)::bigint
        as deductions_sen,
      coalesce(sum(payroll_workers.food_deduction_sen), 0)::bigint
        as food_deductions_sen,
      coalesce(sum(payroll_workers.net_pay_sen), 0)::bigint
        as net_payroll_sen,
      (
        select count(*)::integer
        from public.payroll_exceptions
        join public.payroll_workers exception_workers
          on exception_workers.id =
            payroll_exceptions.payroll_worker_id
        where exception_workers.payroll_run_id = target_run_id
          and payroll_exceptions.blocking
      ) as blocking_exception_count
    from public.payroll_workers
    where payroll_workers.payroll_run_id = target_run_id
  ) totals
  where payroll_runs.id = target_run_id;
end;
$$;

create or replace function private.payroll_worker_snapshot(
  target_payroll_worker_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(payroll_workers)
    || jsonb_build_object(
      'earning_buckets',
      coalesce((
        select jsonb_agg(
          to_jsonb(payroll_earning_buckets)
          order by category, hourly_rate_sen, project_id
        )
        from public.payroll_earning_buckets
        where payroll_earning_buckets.payroll_worker_id =
          payroll_workers.id
      ), '[]'::jsonb),
      'source_days',
      coalesce((
        select jsonb_agg(
          to_jsonb(payroll_source_days)
          order by work_date, project_id
        )
        from public.payroll_source_days
        where payroll_source_days.payroll_worker_id =
          payroll_workers.id
      ), '[]'::jsonb),
      'exceptions',
      coalesce((
        select jsonb_agg(
          to_jsonb(payroll_exceptions)
          order by work_date, exception_type
        )
        from public.payroll_exceptions
        where payroll_exceptions.payroll_worker_id =
          payroll_workers.id
      ), '[]'::jsonb),
      'adjustments',
      coalesce((
        select jsonb_agg(
          to_jsonb(payroll_adjustments)
          order by created_at, id
        )
        from public.payroll_adjustments
        where payroll_adjustments.target_payroll_worker_id =
          payroll_workers.id
      ), '[]'::jsonb)
    )
  from public.payroll_workers
  where payroll_workers.id = target_payroll_worker_id;
$$;

create or replace function public.generate_payroll(p_payroll_month date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_id uuid;
  normalized_month date;
  run_status public.payroll_run_status;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can generate payroll';
  end if;

  normalized_month := date_trunc('month', p_payroll_month)::date;
  if p_payroll_month <> normalized_month then
    raise exception 'Payroll month must be the first calendar day';
  end if;

  insert into public.payroll_runs (
    payroll_month,
    period_start,
    period_end
  )
  values (
    normalized_month,
    normalized_month,
    (normalized_month + interval '1 month - 1 day')::date
  )
  on conflict (payroll_month) do nothing;

  select id, status into run_id, run_status
  from public.payroll_runs
  where payroll_month = normalized_month
  for update;

  if run_status = 'APPROVED' then
    raise exception 'Approved payroll cannot be regenerated unless a source correction returns it to review';
  end if;

  perform private.refresh_payroll_run(run_id);
  return run_id;
end;
$$;

create or replace function public.add_payroll_adjustment(
  p_payroll_run_id uuid,
  p_worker_id uuid,
  p_kind public.payroll_adjustment_kind,
  p_amount_sen integer,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.payroll_runs%rowtype;
  adjustment_id uuid;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can add payroll adjustments';
  end if;
  if p_amount_sen <= 0 then
    raise exception 'Adjustment amount must be greater than zero';
  end if;
  if char_length(btrim(p_reason)) not between 2 and 500 then
    raise exception 'Enter a reason between 2 and 500 characters';
  end if;

  select * into run_row
  from public.payroll_runs
  where id = p_payroll_run_id
  for update;
  if run_row.id is null then
    raise exception 'Payroll run does not exist';
  end if;
  if run_row.status = 'APPROVED' then
    raise exception 'Approved payroll adjustments cannot be changed';
  end if;

  insert into public.payroll_adjustments (
    worker_id,
    payroll_month,
    kind,
    amount_sen,
    source,
    status,
    reason
  )
  values (
    p_worker_id,
    run_row.payroll_month,
    p_kind,
    p_amount_sen,
    'MANUAL',
    'PENDING',
    btrim(p_reason)
  )
  returning id into adjustment_id;

  perform private.refresh_payroll_run(run_row.id);
  return adjustment_id;
end;
$$;

create or replace function public.remove_payroll_adjustment(
  p_adjustment_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  adjustment_row public.payroll_adjustments%rowtype;
  run_id uuid;
  run_status public.payroll_run_status;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can remove payroll adjustments';
  end if;

  select * into adjustment_row
  from public.payroll_adjustments
  where id = p_adjustment_id
  for update;
  if adjustment_row.id is null then
    raise exception 'Payroll adjustment does not exist';
  end if;
  if adjustment_row.source <> 'MANUAL' then
    raise exception 'Generated correction adjustments cannot be removed';
  end if;

  select id, status into run_id, run_status
  from public.payroll_runs
  where payroll_month = adjustment_row.payroll_month
  for update;
  if run_status = 'APPROVED' then
    raise exception 'Approved payroll adjustments cannot be changed';
  end if;

  delete from public.payroll_adjustments
  where id = p_adjustment_id;
  if run_id is not null then
    perform private.refresh_payroll_run(run_id);
  end if;
end;
$$;

create or replace function public.approve_payroll(p_payroll_run_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.payroll_runs%rowtype;
  approval_revision integer;
  approval_revision_id uuid;
  actor_id uuid;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can approve payroll';
  end if;
  actor_id := private.current_application_user_id();

  select * into run_row
  from public.payroll_runs
  where id = p_payroll_run_id
  for update;
  if run_row.id is null then
    raise exception 'Payroll run does not exist';
  end if;
  if run_row.status = 'APPROVED' then
    raise exception 'Payroll is already approved';
  end if;

  perform private.refresh_payroll_run(run_row.id);
  select * into run_row
  from public.payroll_runs
  where id = p_payroll_run_id
  for update;

  if run_row.worker_count = 0 then
    raise exception 'Payroll has no workers to approve';
  end if;
  if run_row.blocking_exception_count > 0 then
    raise exception 'Resolve all blocking payroll exceptions before approval';
  end if;
  if exists (
    select 1 from public.payroll_workers
    where payroll_run_id = run_row.id and net_pay_sen < 0
  ) then
    raise exception 'Negative worker net pay blocks approval';
  end if;

  select coalesce(max(revision), 0) + 1
  into approval_revision
  from public.payroll_approval_revisions
  where payroll_run_id = run_row.id;

  insert into public.payroll_approval_revisions (
    payroll_run_id,
    revision,
    snapshot,
    approved_by
  )
  values (
    run_row.id,
    approval_revision,
    jsonb_build_object(
      'run', to_jsonb(run_row),
      'workers', (
        select jsonb_agg(
          private.payroll_worker_snapshot(payroll_workers.id)
          order by payroll_workers.worker_name
        )
        from public.payroll_workers
        where payroll_workers.payroll_run_id = run_row.id
      )
    ),
    actor_id
  )
  returning id into approval_revision_id;

  update public.payroll_runs
  set
    status = 'APPROVED',
    approved_by = actor_id,
    approved_at = now(),
    updated_at = now()
  where id = run_row.id;

  insert into public.payroll_statements (
    payroll_worker_id,
    approval_revision_id,
    statement_number,
    snapshot,
    generated_by
  )
  select
    payroll_workers.id,
    approval_revision_id,
    format(
      'WOP-%s-R%s-%s',
      to_char(run_row.payroll_month, 'YYYYMM'),
      approval_revision,
      upper(replace(payroll_workers.worker_id::text, '-', ''))
    ),
    private.payroll_worker_snapshot(payroll_workers.id),
    actor_id
  from public.payroll_workers
  where payroll_workers.payroll_run_id = run_row.id
    and not exists (
      select 1 from public.payroll_payments
      where payroll_payments.payroll_worker_id = payroll_workers.id
    );

  return approval_revision_id;
end;
$$;

create or replace function public.record_payroll_payment(
  p_payroll_worker_id uuid,
  p_payment_date date,
  p_method public.payroll_payment_method,
  p_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_row public.payroll_workers%rowtype;
  run_row public.payroll_runs%rowtype;
  revision_id uuid;
  payment_id uuid;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can record payroll payments';
  end if;

  select * into worker_row
  from public.payroll_workers
  where id = p_payroll_worker_id
  for update;
  if worker_row.id is null then
    raise exception 'Worker payroll does not exist';
  end if;

  select * into run_row
  from public.payroll_runs
  where id = worker_row.payroll_run_id
  for update;
  if run_row.status <> 'APPROVED' then
    raise exception 'Only approved payroll can be paid';
  end if;
  if worker_row.net_pay_sen < 0 then
    raise exception 'Negative payroll cannot be paid';
  end if;
  if exists (
    select 1 from public.payroll_payments
    where payroll_worker_id = worker_row.id
  ) then
    raise exception 'This worker payroll is already paid';
  end if;
  if p_payment_date < run_row.period_start then
    raise exception 'Payment date cannot be before the payroll month';
  end if;

  select id into revision_id
  from public.payroll_approval_revisions
  where payroll_run_id = run_row.id
  order by revision desc
  limit 1;
  if revision_id is null then
    raise exception 'Approved payroll snapshot is missing';
  end if;

  insert into public.payroll_payments (
    payroll_worker_id,
    approval_revision_id,
    amount_sen,
    payment_date,
    method,
    reference,
    notes
  )
  values (
    worker_row.id,
    revision_id,
    worker_row.net_pay_sen,
    p_payment_date,
    p_method,
    nullif(btrim(p_reference), ''),
    nullif(btrim(p_notes), '')
  )
  returning id into payment_id;

  update public.payroll_workers
  set payment_status = 'PAID', updated_at = now()
  where id = worker_row.id;

  return payment_id;
end;
$$;

create or replace function private.handle_payroll_source_change(
  target_worker_id uuid,
  affected_starts_on date,
  affected_ends_on date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.payroll_runs%rowtype;
  worker_row public.payroll_workers%rowtype;
  calculation jsonb;
  corrected_net bigint;
  correction_delta bigint;
  correction_kind public.payroll_adjustment_kind;
  correction_amount integer;
  correction_month date;
  existing_adjustment public.payroll_adjustments%rowtype;
  future_run public.payroll_runs%rowtype;
  future_worker_id uuid;
  existing_signed_amount bigint;
begin
  if target_worker_id is null
    or affected_starts_on is null
    or affected_ends_on is null then
    return;
  end if;

  for run_row in
    select *
    from public.payroll_runs
    where period_start <= affected_ends_on
      and period_end >= affected_starts_on
    order by payroll_month, id
    for update
  loop
    select * into worker_row
    from public.payroll_workers
    where payroll_run_id = run_row.id
      and worker_id = target_worker_id;

    if run_row.status = 'DRAFT' then
      perform private.refresh_payroll_run(run_row.id);
      continue;
    end if;

    if worker_row.id is null then
      if run_row.status = 'NEEDS_REVIEW' then
        perform private.refresh_payroll_run(run_row.id);
      end if;
      continue;
    end if;

    if not exists (
      select 1 from public.payroll_payments
      where payroll_worker_id = worker_row.id
    ) then
      update public.payroll_runs
      set status = 'NEEDS_REVIEW', updated_at = now()
      where id = run_row.id;
      perform private.refresh_payroll_run(run_row.id);
      continue;
    end if;

    calculation := private.calculate_payroll_worker(
      target_worker_id,
      run_row.period_start,
      run_row.period_end
    );
    corrected_net := (calculation ->> 'net_pay_sen')::bigint;
    correction_delta := corrected_net - worker_row.net_pay_sen;
    correction_month := (run_row.payroll_month + interval '1 month')::date;

    select * into existing_adjustment
    from public.payroll_adjustments
    where source = 'CORRECTION'
      and source_payroll_worker_id = worker_row.id
      and status <> 'SETTLED'
    for update;

    if existing_adjustment.id is not null
      and existing_adjustment.target_payroll_worker_id is not null
      and exists (
        select 1 from public.payroll_payments
        where payroll_worker_id =
          existing_adjustment.target_payroll_worker_id
      ) then
      existing_signed_amount := case existing_adjustment.kind
        when 'ADDITION' then existing_adjustment.amount_sen
        else -existing_adjustment.amount_sen
      end;
      correction_delta := correction_delta - existing_signed_amount;
      correction_month :=
        (existing_adjustment.payroll_month + interval '1 month')::date;
      update public.payroll_adjustments
      set status = 'SETTLED', settled_at = now(), updated_at = now()
      where id = existing_adjustment.id;
      existing_adjustment.id := null;
    end if;

    if correction_delta = 0 then
      if existing_adjustment.id is not null then
        delete from public.payroll_adjustments
        where id = existing_adjustment.id;
      end if;
      continue;
    end if;

    correction_kind := case
      when correction_delta > 0 then 'ADDITION'
      else 'DEDUCTION'
    end;
    correction_amount := abs(correction_delta)::integer;

    loop
      select * into future_run
      from public.payroll_runs
      where payroll_month = correction_month
      for update;
      exit when future_run.id is null;

      select id into future_worker_id
      from public.payroll_workers
      where payroll_run_id = future_run.id
        and worker_id = target_worker_id;

      if future_run.status <> 'APPROVED'
        or future_worker_id is null
        or not exists (
          select 1 from public.payroll_payments
          where payroll_worker_id = future_worker_id
        ) then
        exit;
      end if;
      correction_month := (correction_month + interval '1 month')::date;
    end loop;

    if existing_adjustment.id is null then
      insert into public.payroll_adjustments (
        worker_id,
        payroll_month,
        kind,
        amount_sen,
        source,
        status,
        reason,
        source_payroll_worker_id
      )
      values (
        target_worker_id,
        correction_month,
        correction_kind,
        correction_amount,
        'CORRECTION',
        'PENDING',
        format(
          'Automatic correction from the %s paid payroll.',
          to_char(run_row.payroll_month, 'FMMonth YYYY')
        ),
        worker_row.id
      );
    else
      update public.payroll_adjustments
      set
        payroll_month = correction_month,
        kind = correction_kind,
        amount_sen = correction_amount,
        reason = format(
          'Automatic correction from the %s paid payroll.',
          to_char(run_row.payroll_month, 'FMMonth YYYY')
        ),
        updated_at = now()
      where id = existing_adjustment.id;
    end if;

    select * into future_run
    from public.payroll_runs
    where payroll_month = correction_month
    for update;
    if future_run.id is not null then
      if future_run.status = 'APPROVED' then
        update public.payroll_runs
        set status = 'NEEDS_REVIEW', updated_at = now()
        where id = future_run.id;
      end if;
      perform private.refresh_payroll_run(future_run.id);
    end if;
  end loop;
end;
$$;

create or replace function private.payroll_source_change_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_session public.attendance_sessions%rowtype;
  source_worker_id uuid;
  source_start date;
  source_end date;
  project_worker record;
begin
  if tg_table_name = 'attendance_sessions' then
    if tg_op <> 'INSERT' then
      perform private.handle_payroll_source_change(
        old.worker_id,
        old.work_date,
        old.work_date
      );
    end if;
    if tg_op <> 'DELETE' then
      perform private.handle_payroll_source_change(
        new.worker_id,
        new.work_date,
        new.work_date
      );
    end if;
  elsif tg_table_name = 'break_intervals' then
    select * into source_session
    from public.attendance_sessions
    where id = coalesce(new.attendance_session_id, old.attendance_session_id);
    perform private.handle_payroll_source_change(
      source_session.worker_id,
      source_session.work_date,
      source_session.work_date
    );
  elsif tg_table_name = 'project_days' then
    for project_worker in
      select distinct attendance_sessions.worker_id
      from public.attendance_sessions
      where attendance_sessions.project_id =
          coalesce(new.project_id, old.project_id)
        and attendance_sessions.work_date =
          coalesce(new.work_date, old.work_date)
        and attendance_sessions.record_status = 'ACTIVE'
    loop
      perform private.handle_payroll_source_change(
        project_worker.worker_id,
        coalesce(new.work_date, old.work_date),
        coalesce(new.work_date, old.work_date)
      );
    end loop;
  elsif tg_table_name in (
    'worker_rate_periods',
    'worker_food_deduction_periods'
  ) then
    if tg_op <> 'INSERT' then
      source_worker_id := old.worker_id;
      source_start := old.starts_on;
      source_end := coalesce(old.ends_on, '9999-12-31'::date);
      perform private.handle_payroll_source_change(
        source_worker_id,
        source_start,
        source_end
      );
    end if;
    if tg_op <> 'DELETE' then
      source_worker_id := new.worker_id;
      source_start := new.starts_on;
      source_end := coalesce(new.ends_on, '9999-12-31'::date);
      perform private.handle_payroll_source_change(
        source_worker_id,
        source_start,
        source_end
      );
    end if;
  elsif tg_table_name = 'leave_requests' then
    if tg_op <> 'INSERT' and old.status = 'APPROVED' then
      perform private.handle_payroll_source_change(
        old.worker_id,
        old.starts_on,
        old.ends_on
      );
    end if;
    if tg_op <> 'DELETE' and new.status = 'APPROVED' then
      perform private.handle_payroll_source_change(
        new.worker_id,
        new.starts_on,
        new.ends_on
      );
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function private.write_payroll_audit_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous jsonb;
  current_value jsonb;
  record_id text;
begin
  previous := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  current_value := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
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
    'payroll.' || lower(tg_op),
    'payroll',
    tg_table_name,
    record_id,
    'ONLINE',
    previous,
    current_value
  );

  return coalesce(new, old);
end;
$$;

create trigger payroll_runs_set_updated_at
before update on public.payroll_runs
for each row execute function private.set_updated_at();

create trigger payroll_workers_set_updated_at
before update on public.payroll_workers
for each row execute function private.set_updated_at();

create trigger payroll_adjustments_set_updated_at
before update on public.payroll_adjustments
for each row execute function private.set_updated_at();

create trigger attendance_sessions_payroll_lifecycle
after insert or update or delete on public.attendance_sessions
for each row execute function private.payroll_source_change_trigger();

create trigger break_intervals_payroll_lifecycle
after insert or update or delete on public.break_intervals
for each row execute function private.payroll_source_change_trigger();

create trigger project_days_payroll_lifecycle
after insert or update or delete on public.project_days
for each row execute function private.payroll_source_change_trigger();

create trigger worker_rates_payroll_lifecycle
after insert or update or delete on public.worker_rate_periods
for each row execute function private.payroll_source_change_trigger();

create trigger worker_food_deductions_payroll_lifecycle
after insert or update or delete on public.worker_food_deduction_periods
for each row execute function private.payroll_source_change_trigger();

create trigger leave_requests_payroll_lifecycle
after insert or update or delete on public.leave_requests
for each row execute function private.payroll_source_change_trigger();

create trigger payroll_runs_audit
after insert or update on public.payroll_runs
for each row execute function private.write_payroll_audit_entry();

create trigger payroll_adjustments_audit
after insert or update or delete on public.payroll_adjustments
for each row execute function private.write_payroll_audit_entry();

create trigger payroll_statements_audit
after insert on public.payroll_statements
for each row execute function private.write_payroll_audit_entry();

create trigger payroll_payments_audit
after insert on public.payroll_payments
for each row execute function private.write_payroll_audit_entry();

alter table public.payroll_runs enable row level security;
alter table public.payroll_workers enable row level security;
alter table public.payroll_earning_buckets enable row level security;
alter table public.payroll_source_days enable row level security;
alter table public.payroll_exceptions enable row level security;
alter table public.payroll_adjustments enable row level security;
alter table public.payroll_approval_revisions enable row level security;
alter table public.payroll_statements enable row level security;
alter table public.payroll_payments enable row level security;

create policy payroll_runs_ceo_select
on public.payroll_runs for select
to authenticated
using ((select private.is_current_ceo()));

create policy payroll_workers_ceo_select
on public.payroll_workers for select
to authenticated
using ((select private.is_current_ceo()));

create policy payroll_buckets_ceo_select
on public.payroll_earning_buckets for select
to authenticated
using ((select private.is_current_ceo()));

create policy payroll_source_days_ceo_select
on public.payroll_source_days for select
to authenticated
using ((select private.is_current_ceo()));

create policy payroll_exceptions_ceo_select
on public.payroll_exceptions for select
to authenticated
using ((select private.is_current_ceo()));

create policy payroll_adjustments_ceo_select
on public.payroll_adjustments for select
to authenticated
using ((select private.is_current_ceo()));

create policy payroll_revisions_ceo_select
on public.payroll_approval_revisions for select
to authenticated
using ((select private.is_current_ceo()));

create policy payroll_statements_ceo_select
on public.payroll_statements for select
to authenticated
using ((select private.is_current_ceo()));

create policy payroll_payments_ceo_select
on public.payroll_payments for select
to authenticated
using ((select private.is_current_ceo()));

grant select on
  public.payroll_runs,
  public.payroll_workers,
  public.payroll_earning_buckets,
  public.payroll_source_days,
  public.payroll_exceptions,
  public.payroll_adjustments,
  public.payroll_approval_revisions,
  public.payroll_statements,
  public.payroll_payments
to authenticated;

revoke all on function public.generate_payroll(date)
from public, anon;
revoke all on function public.add_payroll_adjustment(
  uuid,
  uuid,
  public.payroll_adjustment_kind,
  integer,
  text
) from public, anon;
revoke all on function public.remove_payroll_adjustment(uuid)
from public, anon;
revoke all on function public.approve_payroll(uuid)
from public, anon;
revoke all on function public.record_payroll_payment(
  uuid,
  date,
  public.payroll_payment_method,
  text,
  text
) from public, anon;

grant execute on function public.generate_payroll(date)
to authenticated;
grant execute on function public.add_payroll_adjustment(
  uuid,
  uuid,
  public.payroll_adjustment_kind,
  integer,
  text
) to authenticated;
grant execute on function public.remove_payroll_adjustment(uuid)
to authenticated;
grant execute on function public.approve_payroll(uuid)
to authenticated;
grant execute on function public.record_payroll_payment(
  uuid,
  date,
  public.payroll_payment_method,
  text,
  text
) to authenticated;

revoke all on function private.payroll_overlap_seconds(
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
) from public, anon, authenticated;
revoke all on function private.calculate_payroll_worker(uuid, date, date)
from public, anon, authenticated;
revoke all on function private.refresh_payroll_run(uuid)
from public, anon, authenticated;
revoke all on function private.payroll_worker_snapshot(uuid)
from public, anon, authenticated;
revoke all on function private.handle_payroll_source_change(uuid, date, date)
from public, anon, authenticated;
revoke all on function private.payroll_source_change_trigger()
from public, anon, authenticated;
revoke all on function private.write_payroll_audit_entry()
from public, anon, authenticated;
