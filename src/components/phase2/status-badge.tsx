import type { ProjectStatus } from "@/lib/phase2/status";
import { projectStatusLabel } from "@/lib/phase2/status";
import { cn } from "@/lib/utils";

const styles: Record<ProjectStatus, string> = {
  PLANNED: "border-sky-200 bg-sky-50 text-sky-800",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  COMPLETED: "border-indigo-200 bg-indigo-50 text-indigo-800",
  CANCELLED: "border-red-200 bg-red-50 text-red-800",
  ARCHIVED: "border-stone-300 bg-stone-100 text-stone-600",
};

export function StatusBadge({
  className,
  status,
}: {
  className?: string;
  status: ProjectStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex border px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em]",
        styles[status],
        className,
      )}
    >
      {projectStatusLabel(status)}
    </span>
  );
}
