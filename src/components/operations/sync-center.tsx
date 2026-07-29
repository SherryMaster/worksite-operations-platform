import { AlertTriangle, CloudUpload } from "lucide-react";

export function SyncCenter({
  attentionCount,
  children,
  pendingCount,
}: {
  attentionCount: number;
  children: React.ReactNode;
  pendingCount: number;
}) {
  const total = attentionCount + pendingCount;
  if (total === 0) return null;

  return (
    <details className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
        {attentionCount > 0 ? (
          <AlertTriangle className="size-4 text-red-700" aria-hidden="true" />
        ) : (
          <CloudUpload className="size-4 text-violet-700" aria-hidden="true" />
        )}
        Sync center · {total} {total === 1 ? "change" : "changes"}
      </summary>
      {children}
    </details>
  );
}
