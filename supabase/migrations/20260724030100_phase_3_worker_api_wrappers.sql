create or replace function public.create_worker_record(
  p_legal_name text,
  p_phone_number text,
  p_alternate_phone text,
  p_address text,
  p_nationality text,
  p_cnic_number text,
  p_passport_number text,
  p_work_permit_number text,
  p_work_permit_issue_date text,
  p_work_permit_expiry_date text,
  p_notes text,
  p_employment_status public.worker_employment_status,
  p_employment_starts_on text,
  p_trade_id uuid,
  p_skill_level_id uuid,
  p_hourly_rate_sen integer,
  p_rate_starts_on text,
  p_food_deduction_sen integer,
  p_project_id text,
  p_assignment_starts_on text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select public.create_worker(
    p_legal_name,
    p_phone_number,
    p_alternate_phone,
    p_address,
    p_nationality,
    p_cnic_number,
    p_passport_number,
    p_work_permit_number,
    nullif(p_work_permit_issue_date, '')::date,
    nullif(p_work_permit_expiry_date, '')::date,
    p_notes,
    p_employment_status,
    p_employment_starts_on::date,
    p_trade_id,
    p_skill_level_id,
    p_hourly_rate_sen,
    p_rate_starts_on::date,
    p_food_deduction_sen,
    nullif(p_project_id, '')::uuid,
    p_assignment_starts_on::date
  );
$$;

create or replace function public.edit_worker_profile(
  p_worker_id uuid,
  p_legal_name text,
  p_phone_number text,
  p_alternate_phone text,
  p_address text,
  p_nationality text,
  p_cnic_number text,
  p_passport_number text,
  p_work_permit_number text,
  p_work_permit_issue_date text,
  p_work_permit_expiry_date text,
  p_notes text,
  p_trade_id uuid,
  p_skill_level_id uuid,
  p_food_deduction_sen integer
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select public.update_worker_profile(
    p_worker_id,
    p_legal_name,
    p_phone_number,
    p_alternate_phone,
    p_address,
    p_nationality,
    p_cnic_number,
    p_passport_number,
    p_work_permit_number,
    nullif(p_work_permit_issue_date, '')::date,
    nullif(p_work_permit_expiry_date, '')::date,
    p_notes,
    p_trade_id,
    p_skill_level_id,
    p_food_deduction_sen
  );
$$;

create or replace function public.move_worker(
  p_worker_id uuid,
  p_project_id text,
  p_starts_on text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select public.transfer_worker(
    p_worker_id,
    nullif(p_project_id, '')::uuid,
    p_starts_on::date
  );
$$;

grant execute on function public.create_worker_record(
  text, text, text, text, text, text, text, text, text, text, text,
  public.worker_employment_status, text, uuid, uuid, integer, text, integer,
  text, text
) to authenticated;
grant execute on function public.edit_worker_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  uuid, uuid, integer
) to authenticated;
grant execute on function public.move_worker(uuid, text, text)
to authenticated;
