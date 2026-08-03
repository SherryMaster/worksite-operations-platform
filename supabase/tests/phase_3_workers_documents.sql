\set ON_ERROR_STOP on

begin;
set local session_replication_role = replica;

insert into public.application_users (id, clerk_user_id, role, is_active)
values
  ('30000000-0000-0000-0000-000000000001', 'user_phase3_ceo', 'CEO', true),
  ('30000000-0000-0000-0000-000000000002', 'user_phase3_foreman', 'FOREMAN', true);
insert into public.trades (id, name, created_by, updated_by) values ('32000000-0000-0000-0000-000000000001', 'Phase 3 Electrician', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');
insert into public.skill_levels (id, name, created_by, updated_by) values ('33000000-0000-0000-0000-000000000001', 'Phase 3 Skilled', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');
insert into public.document_types (id, name, system_code, expects_document_number, created_by, updated_by)
values ('34000000-0000-0000-0000-000000000001', 'Passport', 'PASSPORT', true, '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001')
on conflict (system_code) where system_code is not null do update set expects_document_number = true;

set local session_replication_role = origin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_phase3_ceo","role":"authenticated"}', true);

do $$
declare
  passport_id uuid;
  worker_result jsonb;
  saved_worker_id uuid;
begin
  select id into passport_id from public.document_types where system_code = 'PASSPORT';
  worker_result := public.save_worker_record(
    '', 'Phase Three Worker', '+60123456789', '', 'Pakistan',
    '32000000-0000-0000-0000-000000000001',
    '33000000-0000-0000-0000-000000000001',
    1500, 0, '',
    jsonb_build_array(jsonb_build_object(
      'clientKey', 'passport', 'id', null, 'documentTypeId', passport_id,
      'documentNumber', ' P3-passport-001 ', 'issueDate', '2026-01-01',
      'expiryDate', '2031-01-01', 'metadata', jsonb_build_object('issuingCountry', 'Pakistan')
    )), false
  );
  saved_worker_id := (worker_result->>'workerId')::uuid;

  if not exists (select 1 from public.worker_employment_periods where worker_employment_periods.worker_id = saved_worker_id and status = 'ACTIVE' and starts_on = (now() at time zone 'Asia/Kuala_Lumpur')::date) then raise exception 'Worker must default to active on the Malaysia business date'; end if;
  if exists (select 1 from public.worker_project_assignments where worker_project_assignments.worker_id = saved_worker_id and ends_on is null) then raise exception 'New worker must await assignment'; end if;
  if not exists (select 1 from public.worker_documents where worker_documents.worker_id = saved_worker_id and object_path is null and metadata->>'issuingCountry' = 'Pakistan') then raise exception 'Metadata-only identity document must be saved'; end if;

  begin
    perform public.save_worker_record('', 'Missing identity', '+60120000000', '', 'Malaysia', '32000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 1000, 0, '', '[]'::jsonb, false);
    raise exception 'Missing identity should fail';
  exception when others then
    if sqlerrm = 'Missing identity should fail' then raise; end if;
  end;

  begin
    perform public.save_worker_record('', 'Duplicate identity', '+60120000001', '', 'Malaysia', '32000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', 1000, 0, '', jsonb_build_array(jsonb_build_object('clientKey','passport','documentTypeId',passport_id,'documentNumber','p3 PASSPORT 001','issueDate','2026-01-01','expiryDate','2031-01-01','metadata','{}'::jsonb)), false);
    raise exception 'Normalized duplicate should fail';
  exception when others then
    if sqlerrm = 'Normalized duplicate should fail' then raise; end if;
  end;
end
$$;

do $$
declare passport_id uuid; saved_worker_id uuid; document_id uuid;
begin
  select id into passport_id from public.document_types where system_code = 'PASSPORT';
  select id into saved_worker_id from public.workers where legal_name = 'Phase Three Worker';
  select id into document_id from public.worker_documents where worker_documents.worker_id = saved_worker_id and status = 'ACTIVE';

  begin
    update public.worker_documents
    set bucket_id = 'worker-documents',
        changed_by = '30000000-0000-0000-0000-000000000001'
    where id = document_id;
    raise exception 'Partial file metadata should fail';
  exception when check_violation then null; end;

  perform public.attach_worker_file(document_id, saved_worker_id, 'DOCUMENT', document_id::text, 'worker-documents', saved_worker_id::text || '/one.pdf', 'one.pdf', 'application/pdf', 10);
  perform public.attach_worker_file(gen_random_uuid(), saved_worker_id, 'DOCUMENT', document_id::text, 'worker-documents', saved_worker_id::text || '/two.pdf', 'two.pdf', 'application/pdf', 11);
  if (select count(*) from public.worker_documents where worker_documents.worker_id = saved_worker_id and status = 'REPLACED') <> 1 then raise exception 'Replacing a file must preserve history'; end if;
  if (select count(*) from public.worker_documents where worker_documents.worker_id = saved_worker_id and status = 'ACTIVE') <> 1 then raise exception 'Non-repeatable type must have one active version'; end if;
  select id into document_id from public.worker_documents where worker_documents.worker_id = saved_worker_id and status = 'ACTIVE';
  perform public.remove_worker_document(document_id, false);
  if not exists (select 1 from public.worker_documents where worker_documents.worker_id = worker_id and status = 'ACTIVE' and object_path is null) then raise exception 'Removing a file must retain metadata'; end if;
end
$$;

-- Foreman remains read-only for canonical documents.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_phase3_foreman","role":"authenticated"}', true);
do $$ begin
  begin
    update public.worker_documents set document_number = 'FORBIDDEN';
    if found then raise exception 'Foreman document write should fail'; end if;
  exception when insufficient_privilege then null; end;
end $$;

rollback;
