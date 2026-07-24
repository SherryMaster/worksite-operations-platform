import { cn } from "@/lib/utils";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Worksite Operations">
      <div
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center border border-amber-300/20 bg-amber-400 font-heading text-lg font-bold tracking-tighter text-stone-950 shadow-[4px_4px_0_0_rgba(251,191,36,0.12)]"
      >
        WO
      </div>
      <div className={cn(compact && "sr-only")}>
        <p className="font-heading text-lg font-semibold uppercase leading-none tracking-[0.08em]">
          Worksite
        </p>
        <p className="mt-1 text-[0.63rem] font-medium uppercase tracking-[0.26em] text-stone-400">
          Operations
        </p>
      </div>
    </div>
  );
}
