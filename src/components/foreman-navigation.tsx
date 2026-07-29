"use client";

import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Clock3,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavigationPendingIndicator } from "@/components/navigation-pending-indicator";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Today", icon: Clock3, href: "/foreman" },
  { label: "Attendance", icon: CalendarDays, href: "/foreman/attendance" },
  { label: "Workers", icon: Users, href: "/foreman/workers" },
  { label: "Leave", icon: ClipboardList, href: "/foreman/leave" },
  { label: "Reports", icon: BarChart3, href: "/foreman/reports" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/foreman"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function ForemanNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Foreman navigation"
      className={
        mobile
          ? "fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-violet-100 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(76,29,149,0.08)] backdrop-blur-xl lg:hidden"
          : "mt-6 hidden space-y-1.5 lg:block"
      }
    >
      {navigation.map(({ label, icon: Icon, href }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              mobile
                ? "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-medium transition-colors"
                : "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors",
              active
                ? mobile
                  ? "text-violet-700"
                  : "bg-violet-100 text-violet-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-violet-700",
            )}
          >
            {mobile ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 h-0.5 w-8 rounded-full",
                  active ? "bg-violet-600" : "bg-transparent",
                )}
              />
            ) : null}
            <Icon className="size-5" aria-hidden="true" />
            <span>{label}</span>
            <NavigationPendingIndicator
              className={mobile ? "absolute right-2 top-2 ml-0" : undefined}
            />
          </Link>
        );
      })}
    </nav>
  );
}
