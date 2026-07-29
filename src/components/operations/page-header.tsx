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
        "flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="flex items-center gap-2 text-xs font-semibold text-violet-700">
            {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-heading font-semibold text-slate-950">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
