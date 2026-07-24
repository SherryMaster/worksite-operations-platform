import { AttendanceWorkspace } from "@/components/phase4/attendance-workspace";
import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { getForemanAttendanceSnapshot } from "@/lib/phase4/data";

export default async function ForemanToday() {
  const snapshot = await getForemanAttendanceSnapshot(malaysiaDateInputValue());
  return <AttendanceWorkspace initialSnapshot={snapshot} />;
}
