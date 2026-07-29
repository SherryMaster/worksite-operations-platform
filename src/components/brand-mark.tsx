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
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-700 text-xs font-bold tracking-tight text-white"
      >
        WO
      </div>
      <div className={cn(compact && "sr-only")}>
        <p
          className={cn(
            "text-sm font-bold leading-none tracking-tight",
            inverted ? "text-white" : "text-slate-950",
          )}
        >
          Worksite
        </p>
        <p
          className={cn(
            "mt-1 text-[0.625rem] font-semibold tracking-wide",
            inverted ? "text-violet-200" : "text-violet-600",
          )}
        >
          Operations
        </p>
      </div>
    </div>
  );
}
