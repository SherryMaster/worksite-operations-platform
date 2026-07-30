"use client";

import {
  BarChart3,
  CalendarCheck2,
  ClipboardList,
  Database,
  FolderKanban,
  LayoutDashboard,
  MoreHorizontal,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { NavigationPendingIndicator } from "@/components/navigation-pending-indicator";
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
  { label: "Home", icon: LayoutDashboard, href: "/ceo", group: "Operations" },
  {
    label: "Projects",
    icon: FolderKanban,
    href: "/ceo/projects",
    group: "Operations",
  },
  { label: "Workers", icon: Users, href: "/ceo/workers", group: "Operations" },
  {
    label: "Attendance",
    icon: CalendarCheck2,
    href: "/ceo/attendance",
    group: "Operations",
  },
  {
    label: "Leave",
    icon: ClipboardList,
    href: "/ceo/leave",
    group: "Operations",
  },
  {
    label: "Payroll",
    icon: ReceiptText,
    href: "/ceo/payroll",
    group: "Finance",
  },
  {
    label: "Reports",
    icon: BarChart3,
    href: "/ceo/reports",
    group: "Reporting",
  },
  { label: "Settings", icon: Settings, href: "/ceo/settings", group: "Admin" },
  {
    label: "Import center",
    icon: Database,
    href: "/ceo/imports",
    group: "Admin",
  },
  { label: "Audit", icon: ShieldCheck, href: "/ceo/audit", group: "Admin" },
] as const;

const mobilePrimary = navigation.slice(0, 4);
const mobileMore = navigation.slice(4);
const groups = ["Operations", "Finance", "Reporting", "Admin"] as const;

function isActive(pathname: string, href: string) {
  return href === "/ceo"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function MobileNavigation({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = mobileMore.some(({ href }) => isActive(pathname, href));

  return (
    <nav
      aria-label="CEO mobile navigation"
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
              "relative flex min-h-15 flex-col items-center justify-center gap-1 rounded-md px-1 text-[0.68rem] font-medium transition-colors",
              active
                ? "text-violet-700"
                : "text-slate-500 hover:text-violet-700",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-0 h-0.5 w-8 rounded-full",
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
                "relative flex min-h-15 flex-col items-center justify-center gap-1 rounded-md px-1 text-[0.68rem] font-medium transition-colors",
                moreActive || moreOpen
                  ? "text-violet-700"
                  : "text-slate-500 hover:text-violet-700",
              )}
            />
          }
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-0 h-0.5 w-8 rounded-full",
              moreActive ? "bg-violet-600" : "bg-transparent",
            )}
          />
          <MoreHorizontal className="size-5" aria-hidden="true" />
          <span>More</span>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[82dvh] rounded-t-xl border-slate-200 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="border-b border-slate-200 px-5 py-4">
            <SheetTitle className="text-lg font-semibold">More</SheetTitle>
            <SheetDescription>
              Review and manage company operations.
            </SheetDescription>
          </SheetHeader>
          <div className="px-3 pb-3">
            {groups.map((group) => {
              const items = mobileMore.filter((item) => item.group === group);
              if (items.length === 0) return null;
              return (
                <div
                  key={group}
                  className="border-b border-slate-100 py-3 last:border-0"
                >
                  <p className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                    {group}
                  </p>
                  {items.map(({ label, icon: Icon, href }) => {
                    const active = isActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-violet-50 text-violet-800"
                            : "text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        <Icon
                          className="size-4.5 text-violet-700"
                          aria-hidden="true"
                        />
                        {label}
                        <NavigationPendingIndicator />
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

export function CeoNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return <MobileNavigation pathname={pathname} />;
  }

  return (
    <nav className="mt-5 space-y-3" aria-label="CEO navigation">
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-1 hidden px-3 text-[0.625rem] font-semibold uppercase tracking-wider text-slate-400 xl:block">
            {group}
          </p>
          <div className="space-y-1">
            {navigation
              .filter((item) => item.group === group)
              .map(({ label, icon: Icon, href }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-10 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors xl:justify-start",
                      active
                        ? "bg-violet-50 text-violet-900"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4.5 shrink-0",
                        active
                          ? "text-violet-700"
                          : "text-slate-400 group-hover:text-slate-700",
                      )}
                      aria-hidden="true"
                    />
                    <span className="hidden xl:inline">{label}</span>
                    <NavigationPendingIndicator />
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );
}
