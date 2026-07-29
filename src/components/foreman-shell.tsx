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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-violet-100 bg-white px-5 py-6 lg:flex lg:flex-col">
        <BrandMark />
        <div className="mt-8 rounded-2xl bg-violet-50 p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-violet-600">
            Assigned Project
          </p>
          <p className="mt-2 text-sm font-semibold leading-5 text-violet-950">
            {projectName ?? "Awaiting assignment"}
          </p>
        </div>
        <ForemanNavigation />
        <div className="mt-auto space-y-3 border-t border-violet-100 pt-5">
          <ConnectionIndicator />
          <InstallAppButton />
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-violet-100 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl sm:px-6 lg:flex lg:min-h-16 lg:items-center lg:justify-between lg:px-8 lg:py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="lg:hidden">
              <BrandMark compact />
            </div>
            <div className="flex items-center gap-3">
              <ConnectionIndicator />
              <DeviceSignOutButton />
            </div>
          </div>
          <div className="mt-3 min-w-0 border-t border-violet-100 pt-3 lg:mt-0 lg:border-0 lg:pt-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-violet-600">
              Assigned Project
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-950">
              {projectName ?? "Awaiting assignment"}
            </p>
            <div className="lg:hidden">
              <InstallAppButton />
            </div>
          </div>
        </header>
        <div id="main-content">{children}</div>
      </div>
      <ForemanNavigation mobile />
    </div>
  );
}
