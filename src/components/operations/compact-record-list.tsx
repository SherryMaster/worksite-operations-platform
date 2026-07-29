import { cn } from "@/lib/utils";

export function CompactRecordList({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="list"
      aria-label={label}
      className={cn(
        "divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CompactRecord({
  action,
  children,
  className,
  leading,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  leading?: React.ReactNode;
}) {
  return (
    <div
      role="listitem"
      className={cn(
        "flex min-h-16 items-center gap-3 px-3 py-2.5 sm:px-4",
        className,
      )}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
