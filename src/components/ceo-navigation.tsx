"use client";

import {
  BarChart3,
  CalendarCheck2,
  ClipboardList,
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
  { label: "Home", icon: LayoutDashboard, href: "/ceo" },
  { label: "Projects", icon: FolderKanban, href: "/ceo/projects" },
  { label: "Workers", icon: Users, href: "/ceo/workers" },
  { label: "Attendance", icon: CalendarCheck2, href: "/ceo/attendance" },
  { label: "Leave", icon: ClipboardList, href: "/ceo/leave" },
  { label: "Payroll", icon: ReceiptText, href: "/ceo/payroll" },
  { label: "Reports", icon: BarChart3, href: "/ceo/reports" },
  { label: "Settings", icon: Settings, href: "/ceo/settings" },
  { label: "Audit", icon: ShieldCheck, href: "/ceo/audit" },
] as const;

const mobilePrimary = navigation.slice(0, 4);
const mobileMore = navigation.slice(4);

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
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-violet-100 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(76,29,149,0.08)] backdrop-blur-xl lg:hidden"
    >
      {mobilePrimary.map(({ label, icon: Icon, href }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-medium transition-colors",
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
                "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-medium transition-colors",
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
          className="max-h-[78dvh] rounded-t-3xl border-violet-100 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="border-b border-violet-100 px-5 py-5">
            <SheetTitle className="text-lg font-semibold">
              Company Workspace
            </SheetTitle>
            <SheetDescription>
              Payroll, reporting, and company administration.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-3 pb-3">
            {mobileMore.map(({ label, icon: Icon, href }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 items-center gap-3 rounded-2xl px-4 text-sm font-semibold transition-colors",
                    active
                      ? "bg-violet-50 text-violet-800"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-white text-violet-700 shadow-sm ring-1 ring-violet-100">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  {label}
                  <NavigationPendingIndicator />
                </Link>
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
    <nav className="mt-6 space-y-1.5" aria-label="CEO navigation">
      {navigation.map(({ label, icon: Icon, href }) => {
        const active = isActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors",
              active
                ? "bg-violet-100 text-violet-900"
                : "text-slate-600 hover:bg-slate-50 hover:text-violet-800",
            )}
          >
            <Icon
              className={cn(
                "size-4.5",
                active
                  ? "text-violet-700"
                  : "text-slate-400 group-hover:text-violet-600",
              )}
              aria-hidden="true"
            />
            {label}
            <NavigationPendingIndicator />
          </Link>
        );
      })}
    </nav>
  );
}
