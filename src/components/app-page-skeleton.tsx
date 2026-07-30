import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AppPageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className={cn(compact ? "px-3 pb-24 pt-4" : "px-3 py-4 sm:px-5")}
    >
      <span className="sr-only">Loading workspace</span>
      <div className={cn("space-y-2", compact ? "" : "max-w-5xl")}>
        <Skeleton
          className={cn(
            "rounded-xl bg-slate-200",
            compact ? "h-7 w-40" : "h-8 w-52",
          )}
        />
        <Skeleton className="h-3 w-full max-w-sm rounded-xl bg-slate-200" />
      </div>
      <Skeleton className="mt-4 h-11 w-full max-w-md rounded-lg bg-slate-200" />
      <div
        className={cn(
          "mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white",
          compact ? "" : "max-w-6xl",
        )}
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0"
          >
            <Skeleton className="size-9 shrink-0 rounded-full bg-slate-200" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3 rounded-xl bg-slate-200" />
              <Skeleton className="h-3 w-1/2 rounded-xl bg-slate-200" />
            </div>
            <Skeleton className="h-8 w-16 shrink-0 rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>
    </main>
  );
}
