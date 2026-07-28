import { CalendarDays, ClipboardList, Clock3, Users } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { NavigationPendingIndicator } from "@/components/navigation-pending-indicator";
import { ConnectionIndicator } from "@/components/phase4/connection-indicator";
import { DeviceSignOutButton } from "@/components/phase4/device-sign-out-button";
import { InstallAppButton } from "@/components/phase4/install-app-button";

const navigation = [
  { label: "Today", icon: Clock3, href: "/foreman" },
  { label: "Attendance", icon: CalendarDays, href: "/foreman/attendance" },
  { label: "Workers", icon: Users, href: "/foreman/workers" },
  { label: "Leave", icon: ClipboardList, href: null },
];

export function ForemanShell({
  children,
  projectName,
}: {
  children: React.ReactNode;
  projectName: string | null;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-xl bg-stone-100 text-stone-950 shadow-2xl">
      <header className="sticky top-0 z-10 border-b border-stone-800 bg-stone-950 px-4 py-3 text-stone-100">
        <div className="flex items-center justify-between">
          <BrandMark compact />
          <div className="flex items-center gap-3">
            <ConnectionIndicator />
            <DeviceSignOutButton />
          </div>
        </div>
        <div className="mt-3 border-t border-stone-800 pt-3">
          <p className="font-heading text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Assigned project
          </p>
          <p className="mt-1 font-heading text-lg font-semibold uppercase">
            {projectName ?? "Awaiting assignment"}
          </p>
          <InstallAppButton />
        </div>
      </header>
      {children}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-xl grid-cols-4 border-t border-stone-300 bg-white"
        aria-label="Foreman navigation"
      >
        {navigation.map(({ label, icon: Icon, href }) => {
          const content = (
            <>
              <Icon className="size-5" aria-hidden="true" />
              <span className="text-[0.68rem] font-medium">{label}</span>
            </>
          );

          return href ? (
            <Link
              key={label}
              href={href}
              className="relative flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 border-transparent text-stone-700 hover:border-amber-500"
            >
              {content}
              <NavigationPendingIndicator className="absolute right-2 top-2 ml-0" />
            </Link>
          ) : (
            <div
              key={label}
              aria-disabled="true"
              className="flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 border-transparent text-stone-400"
            >
              {content}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
