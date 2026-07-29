import { UserButton } from "@clerk/nextjs";

import { BrandMark } from "@/components/brand-mark";
import { CeoNavigation } from "@/components/ceo-navigation";
import { ConnectionIndicator } from "@/components/phase4/connection-indicator";

export function CeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-workspace text-slate-950">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[70] -translate-y-24 rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-violet-100 bg-white px-5 py-6 lg:flex lg:flex-col">
        <BrandMark />
        <p className="mt-9 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Company Workspace
        </p>
        <CeoNavigation />
        <div className="mt-auto rounded-2xl bg-violet-50 p-4 text-xs leading-5 text-slate-600">
          <p className="font-semibold text-violet-900">CEO access</p>
          <p className="mt-1">Company-wide operations and oversight.</p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-violet-100 bg-white/90 px-4 py-2 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                Company Workspace
              </p>
              <p className="truncate text-xs text-slate-500">CEO operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionIndicator />
            <span className="sr-only" aria-label="Access verified">
              Access verified
            </span>
            <UserButton
              appearance={{
                elements: {
                  userButtonTrigger:
                    "size-11 rounded-xl focus-visible:ring-2 focus-visible:ring-violet-500",
                },
              }}
            />
          </div>
        </header>
        <div id="main-content">{children}</div>
      </div>
      <CeoNavigation mobile />
    </div>
  );
}
