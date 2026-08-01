import Image from "next/image";

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
      <Image
        src="/brand/worksite-mark.svg"
        alt=""
        aria-hidden="true"
        width={36}
        height={36}
        className="size-9 shrink-0"
      />
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
