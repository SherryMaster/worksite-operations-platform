import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LoadingRegion({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function DashboardActionsSkeleton() {
  return (
    <LoadingRegion label="Loading priority actions" className="mt-4">
      <div className="overflow-hidden border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-36" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-16 items-center justify-between border-b border-slate-200 px-4 py-3 last:border-0"
          >
            <div className="w-full max-w-md space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            <Skeleton className="size-4 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function DashboardMetricsSkeleton() {
  return (
    <LoadingRegion
      label="Loading company summary"
      className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(34rem,2fr)]"
    >
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className={cn(
              "flex min-h-24 items-center gap-3 p-3 sm:min-h-28 sm:p-4",
              index === 0 && "border-b border-r border-slate-200 sm:border-b-0",
              index === 1 &&
                "border-b border-slate-200 sm:border-b-0 sm:border-r",
              index === 2 && "col-span-2 sm:col-span-1",
            )}
          >
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-full" />
            </div>
          </div>
        ))}
      </div>
      <DashboardAttendanceMetricSkeleton />
    </LoadingRegion>
  );
}

export function ListResultsSkeleton({
  announced = true,
  columns = 5,
  rows = 6,
  showLeading = false,
  className,
}: {
  announced?: boolean;
  columns?: number;
  rows?: number;
  showLeading?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-live={announced ? "polite" : undefined}
      className={cn("mt-4", className)}
    >
      {announced ? <span className="sr-only">Loading records</span> : null}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white md:hidden">
        {Array.from({ length: Math.min(rows, 5) }, (_, index) => (
          <div
            key={index}
            className="flex min-h-16 items-center gap-3 px-3 py-2"
          >
            {showLeading ? (
              <Skeleton className="size-9 shrink-0 rounded-full" />
            ) : null}
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
        <div
          className="grid h-10 items-center gap-4 border-b border-slate-200 bg-slate-50 px-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton key={index} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid min-h-12 items-center gap-4 border-b border-slate-100 px-3 last:border-0"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={cn("h-3", columnIndex === 0 ? "w-3/4" : "w-1/2")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DirectoryContentSkeleton({
  columns = 5,
  filters = 3,
  showLeading = false,
}: {
  columns?: number;
  filters?: number;
  showLeading?: boolean;
}) {
  return (
    <LoadingRegion label="Loading directory" className="mt-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
        <input
          disabled
          aria-label="Loading search"
          placeholder="Search records"
          className="h-10 min-w-48 flex-1 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
        />
        {Array.from({ length: filters }, (_, index) => (
          <select
            key={index}
            disabled
            aria-label={`Loading filter ${index + 1}`}
            className="hidden h-10 w-36 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 md:block"
          >
            <option>Loading options…</option>
          </select>
        ))}
        <button
          type="button"
          disabled
          className="h-10 rounded-md bg-slate-200 px-4 text-sm font-semibold text-slate-500"
        >
          Apply
        </button>
      </div>
      <ListResultsSkeleton
        announced={false}
        columns={columns}
        rows={7}
        showLeading={showLeading}
      />
    </LoadingRegion>
  );
}

export function DirectoryToolbarSkeleton({
  filters = 3,
}: {
  filters?: number;
}) {
  return (
    <LoadingRegion label="Loading filter options" className="mt-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
        <Skeleton className="h-10 min-w-48 flex-1" />
        {Array.from({ length: filters }, (_, index) => (
          <Skeleton key={index} className="hidden h-10 w-36 md:block" />
        ))}
        <Skeleton className="h-10 w-20" />
      </div>
    </LoadingRegion>
  );
}

export function ProfileHeaderSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <LoadingRegion
      label="Loading profile"
      className={cn("flex items-start gap-3", compact ? "mt-2" : "mt-4")}
    >
      <Skeleton
        className={cn("shrink-0 rounded-lg", compact ? "size-14" : "size-16")}
      />
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-52" />
        <Skeleton className="h-3 w-44" />
      </div>
      {!compact ? <Skeleton className="h-10 w-28 rounded-lg" /> : null}
    </LoadingRegion>
  );
}

export function ProjectHeaderSkeleton() {
  return (
    <LoadingRegion label="Loading project" className="mt-4">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-64" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-3.5 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-32 rounded-md" />
          <Skeleton className="h-11 w-36 rounded-md" />
        </div>
      </div>
      <div className="mt-3 flex gap-4 overflow-hidden border-b border-slate-200 py-3">
        {["Overview", "Workforce", "Attendance", "Leave", "History"].map(
          (label) => (
            <span key={label} className="shrink-0 text-sm text-slate-500">
              {label}
            </span>
          ),
        )}
      </div>
    </LoadingRegion>
  );
}

export function ProjectSummarySkeleton() {
  return (
    <LoadingRegion label="Loading project summary" className="mt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-56" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[7rem_1fr] gap-3 border-b border-slate-100 px-4 py-4 last:border-0"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </LoadingRegion>
  );
}

export function DetailPanelsSkeleton({
  cards = 2,
  rows = 4,
}: {
  cards?: number;
  rows?: number;
}) {
  return (
    <LoadingRegion
      label="Loading details"
      className={cn(
        "mt-4 grid gap-4",
        cards > 1 ? "lg:grid-cols-2" : "grid-cols-1",
      )}
    >
      {Array.from({ length: cards }, (_, cardIndex) => (
        <section
          key={cardIndex}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          <div className="border-b border-slate-200 p-4">
            <Skeleton className="h-5 w-40" />
          </div>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid min-h-16 grid-cols-2 gap-4 border-b border-slate-100 px-4 py-3 last:border-0"
            >
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>
          ))}
        </section>
      ))}
    </LoadingRegion>
  );
}

export function AttendanceWorkspaceSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <LoadingRegion
      label="Loading attendance"
      className={cn(compact ? "px-3 pb-24 pt-4" : "mt-4")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-3 w-60" />
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="space-y-2 border-b border-r border-slate-200 p-3 last:border-0 sm:border-b-0"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2 rounded-lg border border-slate-200 bg-white p-2">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
      <ListResultsSkeleton
        announced={false}
        columns={6}
        rows={7}
        showLeading
        className="mt-3"
      />
    </LoadingRegion>
  );
}

export function AttendanceSummarySkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <LoadingRegion
      label="Loading attendance summary"
      className="mt-4 grid overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      <div className={cn("grid", cards === 5 ? "grid-cols-5" : "grid-cols-3")}>
        {Array.from({ length: cards }, (_, index) => (
          <div
            key={index}
            className="space-y-2 border-r border-slate-200 p-3 last:border-0"
          >
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-24 max-w-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function AttendanceMonitorSummarySkeleton() {
  return (
    <LoadingRegion
      label="Loading attendance monitor summary"
      className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-12"
    >
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-5">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className={cn(
            "space-y-3 rounded-lg border border-slate-200 bg-white p-3",
            index === 1 ? "lg:col-span-3" : "lg:col-span-2",
          )}
        >
          <Skeleton className="size-4" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function AttendanceProjectComparisonSkeleton() {
  return (
    <LoadingRegion label="Loading project attendance" className="mt-4">
      <Skeleton className="h-5 w-40" />
      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-6 gap-4 border-t border-slate-100 p-3"
          >
            {Array.from({ length: 6 }, (_, cell) => (
              <Skeleton key={cell} className="h-3" />
            ))}
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function AttendanceWorkerLedgerSkeleton() {
  return (
    <LoadingRegion label="Loading worker attendance records" className="mt-4">
      <Skeleton className="h-5 w-36" />
      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-2">
        <Skeleton className="h-11 w-full" />
        <div className="mt-2 flex gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-24" />
          ))}
        </div>
      </div>
      <ListResultsSkeleton
        announced={false}
        columns={9}
        rows={7}
        showLeading
        className="mt-3"
      />
    </LoadingRegion>
  );
}

export function AttendanceRecordsSummarySkeleton() {
  return (
    <LoadingRegion
      label="Loading monthly attendance summary"
      className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-4 xl:grid-cols-8"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="space-y-2 border-b border-r border-slate-200 p-3"
        >
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function AttendanceRecordsTableSkeleton() {
  return (
    <LoadingRegion label="Loading monthly attendance records" className="mt-4">
      <div className="rounded-lg border border-slate-200 bg-white p-2">
        <Skeleton className="h-11 w-full" />
        <div className="mt-2 flex gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-24" />
          ))}
        </div>
      </div>
      <ListResultsSkeleton
        announced={false}
        columns={9}
        rows={8}
        showLeading
        className="mt-4"
      />
      <ListResultsSkeleton
        announced={false}
        columns={9}
        rows={8}
        showLeading
        className="mt-5"
      />
    </LoadingRegion>
  );
}

export function DashboardAttendanceMetricSkeleton() {
  return (
    <div
      aria-busy="true"
      className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,.8fr)_auto]">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-2 rounded-lg bg-slate-50 p-2.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-6 w-8" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        ))}
        <div className="col-span-3 flex items-center gap-3 border-t border-slate-200 px-1 pt-3 xl:col-span-1 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormContentSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <LoadingRegion
      label="Loading form"
      className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2"
    >
      {Array.from({ length: fields }, (_, index) => (
        <div
          key={index}
          className={cn("space-y-2", index === fields - 1 && "sm:col-span-2")}
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </LoadingRegion>
  );
}

export function WorkerRecordFormSkeleton() {
  return (
    <LoadingRegion
      label="Loading worker record form"
      className="mt-5 max-w-[80rem]"
    >
      <div className="hidden grid-cols-5 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-16 items-center gap-3 border-r border-slate-100 px-4 last:border-r-0"
          >
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 py-4 sm:hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="size-2.5 rounded-full" />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={index === 3 ? "sm:col-span-2" : ""}>
              <Skeleton className="h-3 w-24" />
              <Skeleton
                className={cn(
                  "mt-2 w-full rounded-lg",
                  index === 3 ? "h-24" : "h-11",
                )}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <Skeleton className="h-11 w-24 rounded-lg" />
        <Skeleton className="h-11 w-28 rounded-lg" />
      </div>
    </LoadingRegion>
  );
}

export function WorkerSectionSkeleton({ section }: { section: string }) {
  if (section.includes("attendance")) {
    return (
      <LoadingRegion label="Loading worker attendance" className="mt-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 sm:grid-cols-4 lg:grid-cols-8">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="space-y-2 bg-white p-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
        <DetailPanelsSkeleton cards={2} rows={5} />
      </LoadingRegion>
    );
  }
  if (section === "documents") {
    return (
      <LoadingRegion
        label="Loading worker documents"
        className="mt-4 rounded-xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-100 p-4">
          <Skeleton className="h-5 w-28" />
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-20 items-center gap-3 border-b border-slate-100 p-4 last:border-0"
          >
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        ))}
      </LoadingRegion>
    );
  }
  return (
    <DetailPanelsSkeleton cards={section === "overview" ? 3 : 2} rows={4} />
  );
}

export function ReportContentSkeleton() {
  return (
    <LoadingRegion label="Loading report" className="mt-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 min-w-48 flex-1 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between border-b border-slate-200 pb-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      <ListResultsSkeleton announced={false} columns={6} rows={8} />
    </LoadingRegion>
  );
}

export function PayrollRunSkeleton() {
  return (
    <LoadingRegion label="Loading payroll run" className="mt-4">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-36 rounded-md" />
          <Skeleton className="h-11 w-32 rounded-md" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="space-y-2 bg-white p-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="mt-8">
        <h2 className="font-heading text-xl font-semibold">Projects</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="space-y-4 border border-violet-100 bg-white p-5"
            >
              <Skeleton className="h-5 w-36" />
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }, (_, cell) => (
                  <div key={cell} className="space-y-2">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
          Traceable calculations
        </p>
        <h2 className="font-heading text-xl font-semibold">Workers</h2>
        <ListResultsSkeleton
          announced={false}
          columns={8}
          rows={8}
          className="mt-4"
        />
      </div>
    </LoadingRegion>
  );
}

export function PayrollWorkerSkeleton() {
  return (
    <LoadingRegion label="Loading worker payroll" className="mt-4">
      <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 max-w-full w-56" />
          <Skeleton className="h-4 max-w-full w-64" />
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="ml-auto h-3 w-16" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2 bg-white p-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <DetailPanelsSkeleton cards={2} rows={5} />
    </LoadingRegion>
  );
}

export function PayrollStatementSkeleton() {
  return (
    <LoadingRegion label="Loading payroll statement" className="mt-6">
      <article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-10">
        <header className="flex min-w-0 flex-col justify-between gap-4 border-b-2 border-slate-200 pb-6 sm:flex-row">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 max-w-full w-64" />
            <Skeleton className="h-3 w-36" />
          </div>
          <div className="space-y-3">
            <Skeleton className="ml-auto h-6 w-32" />
            <Skeleton className="h-3 max-w-full w-48" />
          </div>
        </header>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-20 rounded-md" />
          <Skeleton className="h-20 rounded-md" />
        </div>
        <ListResultsSkeleton announced={false} columns={4} rows={6} />
      </article>
    </LoadingRegion>
  );
}

export function SettingsContentSkeleton({
  section = "users",
}: {
  section?: string;
}) {
  const rows =
    section === "company" ? 3 : section === "import-template" ? 2 : 4;
  return (
    <LoadingRegion label="Loading settings" className="mt-6">
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-heading text-lg font-semibold capitalize">
          {section.replaceAll("-", " ")}
        </h2>
        <Skeleton className="h-3 max-w-full w-80" />
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
