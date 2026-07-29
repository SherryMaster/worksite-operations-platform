"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function DetailDrawer({
  children,
  description,
  title,
  trigger,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
  trigger: React.ReactElement;
}) {
  return (
    <Sheet>
      <SheetTrigger render={trigger} />
      <SheetContent
        side="right"
        className="w-full max-w-lg overflow-y-auto border-slate-200 sm:w-[30rem]"
      >
        <SheetHeader className="border-b border-slate-200 px-5 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="p-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
