create or replace function public.register_worker_file(
  p_id uuid,
  p_worker_id uuid,
  p_file_kind public.worker_file_kind,
  p_document_type_id text,
  p_document_number text,
  p_bucket_id text,
  p_object_path text,
  p_original_filename text,
  p_mime_type text,
  p_byte_size integer,
  p_issue_date text,
  p_expiry_date text,
  p_replace_document_id text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := private.current_application_user_id();
  replaced_document public.worker_documents%rowtype;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can manage worker files';
  end if;

  if nullif(p_replace_document_id, '') is not null then
    select * into replaced_document
    from public.worker_documents
    where id = p_replace_document_id::uuid
      and worker_id = p_worker_id
      and status = 'ACTIVE'
    for update;

    if replaced_document.id is null then
      raise exception 'The file being replaced is no longer current';
    end if;
    if replaced_document.file_kind is distinct from p_file_kind then
      raise exception 'Replacement file type does not match';
    end if;

    update public.worker_documents
    set status = 'REPLACED', changed_by = actor_id
    where id = replaced_document.id;
  end if;

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
    p_id,
    p_worker_id,
    p_file_kind,
    nullif(p_document_type_id, '')::uuid,
    nullif(btrim(p_document_number), ''),
    p_bucket_id,
    p_object_path,
    p_original_filename,
    p_mime_type,
    p_byte_size,
    nullif(p_issue_date, '')::date,
    nullif(p_expiry_date, '')::date
  );

  if replaced_document.id is not null then
    update public.worker_documents
    set replaced_by_id = p_id, changed_by = actor_id
    where id = replaced_document.id;
  end if;
end;
$$;

create or replace function public.remove_worker_file(p_document_id uuid)
returns table(bucket_id text, object_path text)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can manage worker files';
  end if;

  return query
  update public.worker_documents
  set
    status = 'REMOVED',
    changed_by = private.current_application_user_id()
  where id = p_document_id
    and status = 'ACTIVE'
  returning
    worker_documents.bucket_id,
    worker_documents.object_path;
end;
$$;

grant execute on function public.register_worker_file(
  uuid, uuid, public.worker_file_kind, text, text, text, text, text, text,
  integer, text, text, text
) to authenticated;
grant execute on function public.remove_worker_file(uuid) to authenticated;
