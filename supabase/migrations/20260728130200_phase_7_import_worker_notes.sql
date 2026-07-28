create or replace function public.commit_migration_batch(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  target_batch public.migration_batches%rowtype;
  item jsonb;
  project_id uuid;
  worker_id uuid;
  trade_id uuid;
  skill_id uuid;
  document_type_id uuid;
  project_count integer := 0;
  worker_count integer := 0;
  assignment_count integer := 0;
  rate_count integer := 0;
  document_count integer := 0;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can commit a migration batch.';
  end if;

  select *
  into target_batch
  from public.migration_batches
  where id = p_batch_id
  for update;

  if target_batch.id is null then
    raise exception 'Migration preview was not found.';
  end if;
  if target_batch.status = 'COMMITTED' then
    return target_batch.summary;
  end if;
  if jsonb_array_length(target_batch.issues) > 0 then
    raise exception 'Resolve every preview issue before committing.';
  end if;
  if exists (
    select 1
    from public.migration_batches
    where file_checksum = target_batch.file_checksum
      and status = 'COMMITTED'
      and id <> target_batch.id
  ) then
    raise exception 'This workbook has already been committed.';
  end if;

  create temporary table phase7_project_keys (
    import_key text primary key,
    entity_id uuid not null
  ) on commit drop;
  create temporary table phase7_worker_keys (
    import_key text primary key,
    entity_id uuid not null
  ) on commit drop;

  for item in
    select value
    from jsonb_array_elements(target_batch.payload -> 'projects')
  loop
    if exists (
      select 1
      from public.projects
      where lower(btrim(name)) = lower(btrim(item ->> 'name'))
        and lower(btrim(client_name)) =
          lower(btrim(item ->> 'clientName'))
    ) then
      raise exception 'A matching project already exists.';
    end if;

    insert into public.projects (
      name,
      client_name,
      contractor_name,
      location,
      start_date,
      end_date,
      status
    )
    values (
      item ->> 'name',
      item ->> 'clientName',
      nullif(item ->> 'contractorName', ''),
      item ->> 'location',
      (item ->> 'startDate')::date,
      nullif(item ->> 'endDate', '')::date,
      (item ->> 'status')::public.project_status
    )
    returning id into project_id;

    insert into phase7_project_keys (import_key, entity_id)
    values (item ->> 'key', project_id);
    project_count := project_count + 1;
  end loop;

  for item in
    select value
    from jsonb_array_elements(target_batch.payload -> 'workers')
  loop
    if exists (
      select 1
      from public.workers
      where (
        nullif(item ->> 'cnicNumber', '') is not null
        and upper(replace(cnic_number, ' ', '')) =
          upper(replace(item ->> 'cnicNumber', ' ', ''))
      )
      or (
        nullif(item ->> 'passportNumber', '') is not null
        and upper(replace(passport_number, ' ', '')) =
          upper(replace(item ->> 'passportNumber', ' ', ''))
      )
    ) then
      raise exception 'A worker with the same identity number already exists.';
    end if;

    select id
    into trade_id
    from public.trades
    where lower(btrim(name)) = lower(btrim(item ->> 'tradeName'));
    select id
    into skill_id
    from public.skill_levels
    where lower(btrim(name)) = lower(btrim(item ->> 'skillName'));

    if trade_id is null or skill_id is null then
      raise exception 'A worker trade or skill level is no longer available.';
    end if;

    insert into public.workers (
      legal_name,
      phone_number,
      alternate_phone,
      address,
      nationality,
      cnic_number,
      passport_number,
      work_permit_number,
      work_permit_issue_date,
      work_permit_expiry_date,
      notes
    )
    values (
      item ->> 'legalName',
      item ->> 'phoneNumber',
      nullif(item ->> 'alternatePhone', ''),
      nullif(item ->> 'address', ''),
      nullif(item ->> 'nationality', ''),
      nullif(item ->> 'cnicNumber', ''),
      nullif(item ->> 'passportNumber', ''),
      nullif(item ->> 'workPermitNumber', ''),
      nullif(item ->> 'workPermitIssueDate', '')::date,
      nullif(item ->> 'workPermitExpiryDate', '')::date,
      nullif(item ->> 'notes', '')
    )
    returning id into worker_id;

    insert into phase7_worker_keys (import_key, entity_id)
    values (item ->> 'key', worker_id);

    insert into public.worker_employment_periods (
      worker_id,
      status,
      starts_on
    )
    values (
      worker_id,
      (item ->> 'employmentStatus')::public.worker_employment_status,
      (item ->> 'employmentStartDate')::date
    );

    insert into public.worker_classification_periods (
      worker_id,
      trade_id,
      skill_level_id,
      starts_on
    )
    values (
      worker_id,
      trade_id,
      skill_id,
      (item ->> 'employmentStartDate')::date
    );

    insert into public.worker_food_deduction_periods (
      worker_id,
      monthly_amount_sen,
      starts_on
    )
    values (
      worker_id,
      (item ->> 'monthlyFoodDeductionSen')::integer,
      (item ->> 'employmentStartDate')::date
    );

    worker_count := worker_count + 1;
  end loop;

  for item in
    select value
    from jsonb_array_elements(target_batch.payload -> 'assignments')
  loop
    select entity_id
    into worker_id
    from phase7_worker_keys
    where import_key = item ->> 'workerKey';
    select entity_id
    into project_id
    from phase7_project_keys
    where import_key = item ->> 'projectKey';

    insert into public.worker_project_assignments (
      worker_id,
      project_id,
      starts_on
    )
    values (
      worker_id,
      project_id,
      (item ->> 'effectiveDate')::date
    );
    assignment_count := assignment_count + 1;
  end loop;

  for item in
    select value
    from jsonb_array_elements(target_batch.payload -> 'rates')
  loop
    select entity_id
    into worker_id
    from phase7_worker_keys
    where import_key = item ->> 'workerKey';

    insert into public.worker_rate_periods (
      worker_id,
      hourly_rate_sen,
      starts_on
    )
    values (
      worker_id,
      (item ->> 'hourlyRateSen')::integer,
      (item ->> 'effectiveDate')::date
    );
    rate_count := rate_count + 1;
  end loop;

  for item in
    select value
    from jsonb_array_elements(target_batch.payload -> 'documents')
  loop
    if not exists (
      select 1
      from storage.objects
      where bucket_id = 'worker-documents'
        and name = item ->> 'objectPath'
    ) then
      raise exception 'A staged worker document file is missing.';
    end if;

    select entity_id
    into worker_id
    from phase7_worker_keys
    where import_key = item ->> 'workerKey';
    select id
    into document_type_id
    from public.document_types
    where lower(btrim(name)) = lower(btrim(item ->> 'documentTypeName'));

    insert into public.worker_documents (
      id,
      worker_id,
      file_kind,
      document_type_id,
      document_number,
      bucket_id,
      object_path,
      original_filename,
      mime_type,
      byte_size,
      issue_date,
      expiry_date
    )
    values (
      (item ->> 'id')::uuid,
      worker_id,
      'DOCUMENT',
      document_type_id,
      nullif(item ->> 'documentNumber', ''),
      'worker-documents',
      item ->> 'objectPath',
      item ->> 'originalFilename',
      item ->> 'mimeType',
      (item ->> 'byteSize')::integer,
      nullif(item ->> 'issueDate', '')::date,
      nullif(item ->> 'expiryDate', '')::date
    );
    document_count := document_count + 1;
  end loop;

  update public.migration_batches
  set
    status = 'COMMITTED',
    committed_at = now(),
    summary = jsonb_build_object(
      'projects', project_count,
      'workers', worker_count,
      'assignments', assignment_count,
      'rates', rate_count,
      'documents', document_count
    )
  where id = p_batch_id;

  insert into public.audit_entries (
    action,
    module,
    entity_type,
    entity_id,
    source,
    after_data
  )
  values (
    'imports.commit',
    'imports',
    'migration_batches',
    p_batch_id::text,
    'IMPORT',
    jsonb_build_object(
      'file_name', target_batch.file_name,
      'projects', project_count,
      'workers', worker_count,
      'assignments', assignment_count,
      'rates', rate_count,
      'documents', document_count
    )
  );

  return jsonb_build_object(
    'projects', project_count,
    'workers', worker_count,
    'assignments', assignment_count,
    'rates', rate_count,
    'documents', document_count
  );
end;
$$;

revoke all on function public.commit_migration_batch(uuid) from public;
grant execute on function public.commit_migration_batch(uuid) to authenticated;
