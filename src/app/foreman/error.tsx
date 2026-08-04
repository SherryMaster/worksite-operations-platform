"use client";

import { WorkspaceErrorRecovery } from "@/components/workspace-error-recovery";

export default function ForemanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="px-4 py-8 sm:px-6 lg:px-8">
      <WorkspaceErrorRecovery
        compact
        description="This worksite view could not be loaded. Attendance changes already saved on this device remain in the queue and will not be cleared by recovery."
        reference={error.digest}
        reset={reset}
        title="This worksite view is temporarily unavailable"
      />
    </main>
  );
}
