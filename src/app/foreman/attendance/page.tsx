import { AttendanceWorkspace } from "@/components/phase4/attendance-workspace";
import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { getForemanAttendanceSnapshot } from "@/lib/phase4/data";

export default async function ForemanAttendanceHistory({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const workDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "")
    ? (params.date as string)
    : malaysiaDateInputValue();
  const snapshot = await getForemanAttendanceSnapshot(workDate);
  return <AttendanceWorkspace initialSnapshot={snapshot} context="history" />;
}
