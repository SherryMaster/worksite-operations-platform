import type { Metadata } from "next";

import { AttendanceWorkspace } from "@/components/phase4/attendance-workspace";

export const metadata: Metadata = {
  title: "Offline attendance",
};

export default function OfflineAttendancePage() {
  return <AttendanceWorkspace initialSnapshot={null} />;
}
