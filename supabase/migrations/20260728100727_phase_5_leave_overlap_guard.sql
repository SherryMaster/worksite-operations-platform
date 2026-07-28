alter table public.leave_requests
add constraint leave_requests_no_overlap
exclude using gist (
  worker_id with =,
  project_id with =,
  daterange(starts_on, ends_on, '[]') with &&
)
where (status in ('PENDING', 'APPROVED'));
