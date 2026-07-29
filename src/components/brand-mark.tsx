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
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 text-sm font-bold tracking-tight text-white shadow-[0_8px_22px_rgba(109,40,217,0.24)]"
      >
        WO
      </div>
      <div className={cn(compact && "sr-only")}>
        <p
          className={cn(
            "text-base font-bold leading-none tracking-tight",
            inverted ? "text-white" : "text-slate-950",
          )}
        >
          Worksite
        </p>
        <p
          className={cn(
            "mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em]",
            inverted ? "text-violet-200" : "text-violet-600",
          )}
        >
          Operations
        </p>
      </div>
    </div>
  );
}
