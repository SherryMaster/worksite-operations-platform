import { UserButton } from "@clerk/nextjs";

import { BrandMark } from "@/components/brand-mark";
import { CeoNavigation } from "@/components/ceo-navigation";

export function CeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-stone-800 bg-stone-950 px-5 py-6 text-stone-100 lg:flex lg:flex-col">
        <BrandMark />
        <p className="mt-10 px-3 font-heading text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-stone-600">
          Company control
        </p>
        <CeoNavigation />
        <div className="mt-auto border-t border-stone-800 pt-5 text-xs leading-5 text-stone-500">
          Phase 4 attendance operations
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
        <CeoNavigation mobile />
        {children}
      </div>
    </div>
  );
}
