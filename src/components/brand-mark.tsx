import { cn } from "@/lib/utils";

export function BrandMark({
  compact = false,
  inverted = false,
}: {
  compact?: boolean;
  inverted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3" aria-label="Worksite Operations">
      <div
        aria-hidden="true"
        className={cn(
          "grid size-9 shrink-0 place-items-center text-base font-bold tracking-[-0.12em]",
          inverted ? "text-white" : "text-violet-700",
        )}
      >
        WO
      </div>
      <div className={cn(compact && "sr-only")}>
        <p
          className={cn(
            "text-sm font-semibold leading-none tracking-tight",
            inverted ? "text-white" : "text-slate-950",
          )}
        >
          Worksite
        </p>
        <p
          className={cn(
            "mt-1 text-[0.625rem] font-medium tracking-wide",
            inverted ? "text-violet-200" : "text-slate-500",
          )}
        >
          Operations
        </p>
      </div>
    </div>
  );
}
