"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function FilterSheet({
  activeCount = 0,
  children,
  description = "Narrow this view using one or more filters.",
  formAction,
  hiddenFields,
  title = "Filter records",
}: {
  activeCount?: number;
  children: React.ReactNode;
  description?: string;
  formAction?: string;
  hiddenFields?: Record<string, string | undefined>;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button type="button" variant="outline" className="gap-2 md:hidden" />
        }
      >
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filters
        {activeCount > 0 ? (
          <span className="grid size-5 place-items-center rounded-full bg-violet-700 text-[0.625rem] text-white">
            {activeCount}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[88dvh] overflow-y-auto rounded-t-xl border-slate-200 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="border-b border-slate-200 px-5 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {formAction ? (
          <form action={formAction} className="space-y-3 p-5">
            {Object.entries(hiddenFields ?? {}).map(([name, value]) =>
              value ? (
                <input key={name} type="hidden" name={name} value={value} />
              ) : null,
            )}
            {children}
          </form>
        ) : (
          <div className="p-5">{children}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
