import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AppPageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className={cn(compact ? "px-4 pb-24 pt-6" : "px-5 py-8 sm:px-8 lg:py-10")}
    >
      <span className="sr-only">Loading workspace</span>
      <div className={cn("space-y-3", compact ? "" : "max-w-5xl")}>
        <Skeleton className="h-3 w-28 rounded-none bg-stone-200" />
        <Skeleton
          className={cn(
            "rounded-none bg-stone-200",
            compact ? "h-8 w-48" : "h-12 w-72",
          )}
        />
        <Skeleton className="h-4 w-full max-w-xl rounded-none bg-stone-200" />
      </div>
      <div
        className={cn(
          "mt-7 grid gap-4",
          compact ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {Array.from({ length: compact ? 4 : 6 }, (_, index) => (
          <section
            key={index}
            className="space-y-4 border border-stone-200 bg-white p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-2/3 rounded-none bg-stone-200" />
              <Skeleton className="h-7 w-16 rounded-none bg-stone-200" />
            </div>
            <Skeleton className="h-3 w-1/2 rounded-none bg-stone-200" />
            <Skeleton className="h-11 w-full rounded-none bg-stone-200" />
          </section>
        ))}
      </div>
    </main>
  );
}
