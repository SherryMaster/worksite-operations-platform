import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function PageHeader({
  action,
  description,
  eyebrow,
  icon: Icon,
  title,
  className,
}: {
  action?: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
  title: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex min-w-0 items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-violet-700">
            {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading font-semibold text-slate-950">{title}</h1>
        {description ? (
          <p className="mt-0.5 max-w-3xl text-xs leading-5 text-slate-500 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </header>
  );
}
