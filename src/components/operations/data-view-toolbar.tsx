import { Search } from "lucide-react";

import { FilterSheet } from "@/components/operations/filter-sheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DataViewToolbar({
  action,
  actions,
  activeFilterCount = 0,
  activeFilters,
  children,
  filterDescription,
  filterTitle,
  searchDefaultValue,
  searchName = "search",
  searchPlaceholder = "Search records",
  className,
}: {
  action?: string;
  actions?: React.ReactNode;
  activeFilterCount?: number;
  activeFilters?: React.ReactNode;
  children?: React.ReactNode;
  filterDescription?: string;
  filterTitle?: string;
  searchDefaultValue?: string;
  searchName?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm md:static",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 md:max-w-sm">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            name={searchName}
            defaultValue={searchDefaultValue}
            placeholder={searchPlaceholder}
            autoComplete="off"
            className="h-11 bg-white pl-9 md:h-10"
          />
        </label>
        {children ? (
          <>
            <FilterSheet
              activeCount={activeFilterCount}
              title={filterTitle}
              description={filterDescription}
              formAction={action}
              hiddenFields={{ [searchName]: searchDefaultValue }}
            >
              {children}
            </FilterSheet>
            <div className="hidden flex-1 flex-wrap items-end gap-2 md:flex">
              {children}
            </div>
          </>
        ) : null}
        {actions ? (
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {activeFilters ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
          {activeFilters}
        </div>
      ) : null}
    </div>
  );
}
