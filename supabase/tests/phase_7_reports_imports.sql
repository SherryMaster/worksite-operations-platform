\set ON_ERROR_STOP on

begin;

set local session_replication_role = replica;

insert into public.application_users (id, clerk_user_id, role, is_active)
values
  ('70000000-0000-0000-0000-000000000001', 'user_phase7_ceo', 'CEO', true),
  ('70000000-0000-0000-0000-000000000002', 'user_phase7_foreman', 'FOREMAN', true);

insert into public.trades (id, name, created_by, updated_by)
values (
  '71000000-0000-0000-0000-000000000001',
  'Phase 7 Electrician',
  '70000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001'
);

insert into public.skill_levels (id, name, created_by, updated_by)
values (
  '72000000-0000-0000-0000-000000000001',
  'Phase 7 Skilled',
  '70000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001'
);

set local session_replication_role = origin;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase7_ceo","role":"authenticated"}',
  true
);

insert into public.migration_batches (
  id,
  file_name,
  file_checksum,
  payload,
  issues,
  summary
)
values (
  '73000000-0000-0000-0000-000000000001',
  'phase-7-valid.xlsx',
  repeat('a', 64),
  '{
    "projects": [{
      "key": "P7-PROJECT",
      "name": "Phase 7 Imported Project",
      "clientName": "Phase 7 Client",
      "contractorName": "",
      "location": "Kuala Lumpur",
      "startDate": "2099-08-01",
      "endDate": "",
      "status": "ACTIVE"
    }],
    "workers": [{
      "key": "P7-WORKER",
      "legalName": "Phase Seven Imported Worker",
      "phoneNumber": "+60123456789",
      "alternatePhone": "",
      "address": "",
      "nationality": "Pakistan",
      "cnicNumber": "",
      "passportNumber": "P7-PASSPORT",
      "workPermitNumber": "",
      "workPermitIssueDate": "",
      "workPermitExpiryDate": "",
      "employmentStatus": "ACTIVE",
      "employmentStartDate": "2099-08-01",
      "tradeName": "Phase 7 Electrician",
      "skillName": "Phase 7 Skilled",
      "monthlyFoodDeductionSen": 12000
    }],
    "assignments": [{
      "workerKey": "P7-WORKER",
      "projectKey": "P7-PROJECT",
      "effectiveDate": "2099-08-01"
    }],
    "rates": [{
      "workerKey": "P7-WORKER",
      "hourlyRateSen": 1850,
      "effectiveDate": "2099-08-01"
    }],
    "documents": []
  }'::jsonb,
  '[]'::jsonb,
  '{"projects":1,"workers":1,"assignments":1,"rates":1,"documents":0}'::jsonb
);

select public.commit_migration_batch(
  '73000000-0000-0000-0000-000000000001'
);

do $$
begin
  if (
    select status
    from public.migration_batches
    where id = '73000000-0000-0000-0000-000000000001'
  ) <> 'COMMITTED' then
    raise exception 'Valid import batch should be committed';
  end if;
  if (
    select count(*)
    from public.workers
    where passport_number = 'P7-PASSPORT'
  ) <> 1 then
    raise exception 'Import should create exactly one worker';
  end if;
  if (
    select hourly_rate_sen
    from public.worker_rate_periods
    join public.workers on workers.id = worker_rate_periods.worker_id
    where workers.passport_number = 'P7-PASSPORT'
  ) <> 1850 then
    raise exception 'Imported worker rate should reconcile';
  end if;
  if not exists (
    select 1
    from public.audit_entries
    where action = 'imports.commit'
      and entity_id = '73000000-0000-0000-0000-000000000001'
      and source = 'IMPORT'
  ) then
    raise exception 'Committed import should have an import audit entry';
  end if;
end
$$;

select public.commit_migration_batch(
  '73000000-0000-0000-0000-000000000001'
);

do $$
begin
  if (
    select count(*)
    from public.workers
    where passport_number = 'P7-PASSPORT'
  ) <> 1 then
    raise exception 'Retrying a committed batch must remain idempotent';
  end if;
end
$$;

insert into public.migration_batches (
  id,
  file_name,
  file_checksum,
  payload,
  issues,
  summary
)
values (
  '73000000-0000-0000-0000-000000000002',
  'phase-7-invalid.xlsx',
  repeat('b', 64),
  '{"projects":[],"workers":[],"assignments":[],"rates":[],"documents":[]}'::jsonb,
  '[{"sheet":"Workers","row":2,"message":"Missing identity"}]'::jsonb,
  '{}'::jsonb
);

do $$
begin
  begin
    perform public.commit_migration_batch(
      '73000000-0000-0000-0000-000000000002'
    );
    raise exception 'Invalid preview should not commit';
  exception
    when raise_exception then
      if sqlerrm = 'Invalid preview should not commit' then
        raise;
      end if;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase7_foreman","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.commit_migration_batch(
      '73000000-0000-0000-0000-000000000002'
    );
    raise exception 'Foreman should not commit imports';
  exception
    when raise_exception then
      if sqlerrm = 'Foreman should not commit imports' then
        raise;
      end if;
  end;
end
$$;

rollback;
