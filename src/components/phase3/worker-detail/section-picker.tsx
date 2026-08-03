"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type WorkerSection = { label: string; value: string };

export function WorkerSectionPicker({
  active,
  basePath,
  sections,
}: {
  active: string;
  basePath: string;
  sections: WorkerSection[];
}) {
  const selected = sections.find((section) => section.value === active)!;
  return (
    <>
      <nav
        aria-label="Worker sections"
        className="mt-4 hidden grid-cols-6 rounded-lg border border-slate-200 bg-white p-1 md:grid"
      >
        {sections.map((section) => (
          <Link
            key={section.value}
            href={`${basePath}?section=${section.value}`}
            aria-current={active === section.value ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center rounded-md px-3 text-center text-sm font-medium",
              active === section.value
                ? "bg-violet-50 text-violet-800"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
            )}
          >
            {section.label}
          </Link>
        ))}
      </nav>
      <Sheet>
        <SheetTrigger className="mt-4 flex min-h-12 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 text-left text-sm font-semibold md:hidden">
          <span>
            <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Section
            </span>
            {selected.label}
          </span>
          <ChevronDown className="size-5" aria-hidden="true" />
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
        >
          <SheetHeader>
            <SheetTitle>Worker sections</SheetTitle>
            <SheetDescription>Choose what you want to view.</SheetDescription>
          </SheetHeader>
          <nav aria-label="Choose worker section" className="px-2 pb-3">
            {sections.map((section) => (
              <SheetClose
                key={section.value}
                render={
                  <Link
                    href={`${basePath}?section=${section.value}`}
                    aria-current={active === section.value ? "page" : undefined}
                    className="flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-sm font-medium hover:bg-slate-50"
                  />
                }
              >
                {section.label}
                {active === section.value ? (
                  <Check
                    className="size-5 text-violet-700"
                    aria-hidden="true"
                  />
                ) : null}
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
