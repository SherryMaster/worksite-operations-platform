import { UserButton } from "@clerk/nextjs";
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

import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Projects", icon: FolderKanban },
  { label: "Workers", icon: Users },
  { label: "Attendance", icon: CalendarCheck2 },
  { label: "Leave", icon: ClipboardList },
  { label: "Payroll", icon: ReceiptText },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
  { label: "Audit", icon: ShieldCheck },
];

export function CeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-stone-800 bg-stone-950 px-5 py-6 text-stone-100 lg:flex lg:flex-col">
        <BrandMark />
        <p className="mt-10 px-3 font-heading text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-stone-600">
          Company control
        </p>
        <nav className="mt-3 space-y-1" aria-label="CEO navigation">
          {navigation.map(({ label, icon: Icon, active }) => (
            <div
              key={label}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex items-center gap-3 border-l-2 border-amber-400 bg-stone-900 px-3 py-2.5 text-sm font-medium text-white"
                  : "flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-sm text-stone-500"
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
              {!active ? (
                <span className="ml-auto text-[0.58rem] uppercase tracking-wider text-stone-700">
                  Later
                </span>
              ) : null}
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-stone-800 pt-5 text-xs leading-5 text-stone-500">
          Phase 1 foundation
          <br />
          Development environment
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-stone-300 bg-stone-100/95 px-5 backdrop-blur sm:px-8">
          <div className="lg:hidden">
            <BrandMark compact />
          </div>
          <div className="hidden lg:block">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              CEO workspace
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              aria-label="Access verified"
              className="flex items-center gap-2 text-xs font-medium text-emerald-700"
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="hidden sm:inline">Access verified</span>
            </span>
            <UserButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
