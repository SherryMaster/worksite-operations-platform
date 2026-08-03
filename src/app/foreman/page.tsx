import { Suspense } from "react";

import { AttendanceWorkspaceSkeleton } from "@/components/operations/loading-skeletons";
import { AttendanceWorkspace } from "@/components/phase4/attendance-workspace";
import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { getForemanAttendanceSnapshot } from "@/lib/phase4/data";

export default function ForemanToday() {
  return (
    <Suspense fallback={<AttendanceWorkspaceSkeleton compact />}>
      <TodayAttendance />
    </Suspense>
  );
}

async function TodayAttendance() {
  const snapshot = await getForemanAttendanceSnapshot(malaysiaDateInputValue());
  return <AttendanceWorkspace initialSnapshot={snapshot} />;
}
