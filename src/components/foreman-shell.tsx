import { BrandMark } from "@/components/brand-mark";
import { ForemanNavigation } from "@/components/foreman-navigation";
import { ConnectionIndicator } from "@/components/phase4/connection-indicator";
import { DeviceSignOutButton } from "@/components/phase4/device-sign-out-button";
import { InstallAppButton } from "@/components/phase4/install-app-button";

export function ForemanShell({
  children,
  projectName,
}: {
  children: React.ReactNode;
  projectName: string | null;
}) {
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
        <div className="mt-5 hidden rounded-lg border border-violet-100 bg-violet-50 p-3 xl:block">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-violet-700">
            Assigned Project
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">
            {projectName ?? "Awaiting assignment"}
          </p>
        </div>
        <ForemanNavigation />
        <div className="mt-auto hidden space-y-2 border-t border-slate-200 pt-4 xl:block">
          <ConnectionIndicator />
          <InstallAppButton />
          <DeviceSignOutButton variant="menu" />
        </div>
      </aside>

      <div className="md:pl-20 xl:pl-64">
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur sm:px-6 md:py-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden">
              <BrandMark compact />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {projectName ?? "Awaiting assignment"}
              </p>
              <p className="truncate text-xs text-slate-500">
                Foreman workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionIndicator />
            <span className="md:hidden">
              <DeviceSignOutButton />
            </span>
          </div>
        </header>
        <div id="main-content">{children}</div>
      </div>
      <ForemanNavigation mobile projectName={projectName} />
    </div>
  );
}
