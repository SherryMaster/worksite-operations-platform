revoke execute
on function public.apply_attendance_action(uuid, uuid, text, jsonb)
from anon;

revoke execute
on function public.submit_leave_request(
  uuid,
  uuid,
  uuid,
  date,
  date,
  text,
  text
)
from anon;

revoke execute
on function public.decide_leave_request(
  uuid,
  public.leave_request_status,
  text
)
from anon;
