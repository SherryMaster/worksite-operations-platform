"use client";

import {
  BarChart3,
  CalendarCheck2,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/ceo" },
  { label: "Projects", icon: FolderKanban, href: "/ceo/projects" },
  { label: "Workers", icon: Users },
  { label: "Attendance", icon: CalendarCheck2 },
  { label: "Leave", icon: ClipboardList },
  { label: "Payroll", icon: ReceiptText },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings, href: "/ceo/settings" },
  { label: "Audit", icon: ShieldCheck, href: "/ceo/audit" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/ceo"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function CeoNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav
        aria-label="CEO mobile navigation"
        className="flex gap-1 overflow-x-auto border-b border-stone-300 bg-white px-4 py-2 lg:hidden"
      >
        {navigation
          .filter((item) => "href" in item)
          .map(({ label, icon: Icon, href }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 border px-3 py-2 text-xs font-medium",
                  active
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-200 text-stone-600",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
      </nav>
    );
  }

  return (
    <nav className="mt-3 space-y-1" aria-label="CEO navigation">
      {navigation.map(({ label, icon: Icon, ...item }) => {
        const href = "href" in item ? item.href : undefined;
        const active = href ? isActive(pathname, href) : false;
        const className = active
          ? "flex items-center gap-3 border-l-2 border-amber-400 bg-stone-900 px-3 py-2.5 text-sm font-medium text-white"
          : "flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-sm text-stone-500 hover:text-stone-200";
        const content = (
          <>
            <Icon className="size-4" aria-hidden="true" />
            {label}
            {!href ? (
              <span className="ml-auto text-[0.58rem] uppercase tracking-wider text-stone-700">
                Later
              </span>
            ) : null}
          </>
        );

        return href ? (
          <Link
            key={label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={className}
          >
            {content}
          </Link>
        ) : (
          <div key={label} className={className} aria-disabled="true">
            {content}
          </div>
        );
      })}
    </nav>
  );
}
