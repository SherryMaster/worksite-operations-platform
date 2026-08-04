"use client";

import { WorkspaceErrorRecovery } from "@/components/workspace-error-recovery";

export default function CeoError({
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
        description="Company data could not be loaded. The workspace navigation and account controls remain available."
        reference={error.digest}
        reset={reset}
        title="This company view is temporarily unavailable"
      />
    </main>
  );
}
