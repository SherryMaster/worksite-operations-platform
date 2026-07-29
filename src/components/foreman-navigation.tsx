"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock3,
  MoreHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { NavigationPendingIndicator } from "@/components/navigation-pending-indicator";
import { DeviceSignOutButton } from "@/components/phase4/device-sign-out-button";
import { InstallAppButton } from "@/components/phase4/install-app-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Today", icon: Clock3, href: "/foreman" },
  { label: "Attendance", icon: CalendarDays, href: "/foreman/attendance" },
  { label: "Workers", icon: Users, href: "/foreman/workers" },
  { label: "Leave", icon: ClipboardList, href: "/foreman/leave" },
  { label: "Reports", icon: BarChart3, href: "/foreman/reports" },
] as const;
const mobilePrimary = navigation.slice(0, 4);

function isActive(pathname: string, href: string) {
  return href === "/foreman"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function ForemanNavigation({
  mobile = false,
  projectName,
}: {
  mobile?: boolean;
  projectName?: string | null;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  if (mobile) {
    const reportsActive = isActive(pathname, "/foreman/reports");
    return (
      <nav
        aria-label="Foreman mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/98 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(15_23_42/0.08)] md:hidden"
      >
        {mobilePrimary.map(({ label, icon: Icon, href }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-15 flex-col items-center justify-center gap-1 rounded-md px-1 text-[0.68rem] font-medium",
                active ? "text-violet-700" : "text-slate-500",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 h-0.5 w-7 rounded-full",
                  active ? "bg-violet-600" : "bg-transparent",
                )}
              />
              <Icon className="size-5" aria-hidden="true" />
              <span>{label}</span>
              <NavigationPendingIndicator className="absolute right-2 top-2 ml-0" />
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                className={cn(
                  "relative flex min-h-15 flex-col items-center justify-center gap-1 rounded-md px-1 text-[0.68rem] font-medium",
                  reportsActive || moreOpen
                    ? "text-violet-700"
                    : "text-slate-500",
                )}
              />
            }
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-0 h-0.5 w-7 rounded-full",
                reportsActive ? "bg-violet-600" : "bg-transparent",
              )}
            />
            <MoreHorizontal className="size-5" aria-hidden="true" />
            <span>More</span>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-xl border-slate-200 pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <SheetHeader className="border-b border-slate-200 px-5 py-4 text-left">
              <SheetTitle>Foreman workspace</SheetTitle>
              <SheetDescription>
                {projectName ?? "No project assigned"}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-1 p-3">
              <Link
                href="/foreman/reports"
                onClick={() => setMoreOpen(false)}
                aria-current={reportsActive ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium",
                  reportsActive
                    ? "bg-violet-50 text-violet-800"
                    : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <BarChart3
                  className="size-4.5 text-violet-700"
                  aria-hidden="true"
                />
                Reports
              </Link>
              <InstallAppButton />
              <DeviceSignOutButton variant="menu" />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Foreman navigation"
      className="mt-5 hidden space-y-1 md:block"
    >
      {navigation.map(({ label, icon: Icon, href }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-10 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors xl:justify-start",
              active
                ? "bg-violet-50 text-violet-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-violet-700",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="hidden xl:inline">{label}</span>
            <NavigationPendingIndicator className="hidden xl:block" />
          </Link>
        );
      })}
    </nav>
  );
}
