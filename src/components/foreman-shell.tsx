import { UserButton } from "@clerk/nextjs";
import { CalendarDays, ClipboardList, Clock3, Users, Wifi } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { label: "Today", icon: Clock3, active: true },
  { label: "Attendance", icon: CalendarDays },
  { label: "Workers", icon: Users },
  { label: "Leave", icon: ClipboardList },
];

export function ForemanShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-xl bg-stone-100 text-stone-950 shadow-2xl">
      <header className="sticky top-0 z-10 border-b border-stone-800 bg-stone-950 px-4 py-3 text-stone-100">
        <div className="flex items-center justify-between">
          <BrandMark compact />
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Wifi className="size-3.5" aria-hidden="true" />
              Online
            </span>
            <UserButton />
          </div>
        </div>
        <div className="mt-3 border-t border-stone-800 pt-3">
          <p className="font-heading text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Assigned project
          </p>
          <p className="mt-1 font-heading text-lg font-semibold uppercase">
            Awaiting assignment
          </p>
        </div>
      </header>
      {children}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-xl grid-cols-4 border-t border-stone-300 bg-white"
        aria-label="Foreman navigation"
      >
        {navigation.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 border-amber-500 text-stone-950"
                : "flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 border-transparent text-stone-400"
            }
          >
            <Icon className="size-5" aria-hidden="true" />
            <span className="text-[0.68rem] font-medium">{label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
}
