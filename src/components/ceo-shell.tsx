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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 border-r border-slate-200 bg-white px-3 py-4 md:flex md:flex-col xl:w-64 xl:px-4">
        <div className="flex justify-center xl:justify-start xl:px-2">
          <span className="xl:hidden">
            <BrandMark compact />
          </span>
          <span className="hidden xl:block">
            <BrandMark />
          </span>
        </div>
        <CeoNavigation />
        <div className="mt-auto hidden rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 xl:block">
          <p className="font-semibold text-slate-900">CEO workspace</p>
          <p>Company-wide operations and oversight.</p>
        </div>
      </aside>

      <div className="md:pl-20 xl:pl-64">
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <BrandMark compact />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                Company operations
              </p>
              <p className="truncate text-xs text-slate-500">CEO workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionIndicator />
            <div className="[&_.cl-userButtonTrigger]:size-9 [&_.cl-userButtonTrigger]:rounded-lg [&_.cl-userButtonTrigger]:focus-visible:ring-2 [&_.cl-userButtonTrigger]:focus-visible:ring-violet-500">
              <UserButton />
            </div>
          </div>
        </header>
        <div id="main-content">{children}</div>
      </div>
      <CeoNavigation mobile />
    </div>
  );
}
