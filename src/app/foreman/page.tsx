import { Building2, ShieldCheck } from "lucide-react";

export default function ForemanToday() {
  return (
    <main className="min-h-[calc(100vh-9rem)] px-4 pb-24 pt-8">
      <p className="font-heading text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
        Today
      </p>
      <h1 className="mt-2 font-heading text-5xl font-semibold uppercase leading-none">
        Site operations
      </h1>

      <section className="mt-8 border border-stone-300 bg-white p-5">
        <div className="grid size-12 place-items-center bg-amber-100 text-amber-800">
          <Building2 className="size-6" aria-hidden="true" />
        </div>
        <h2 className="mt-6 font-heading text-2xl font-semibold uppercase">
          Project assignment required
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Your account is active and secure, but no current project is assigned.
          Ask the CEO to assign a project before operational data becomes
          available.
        </p>
      </section>

      <div className="mt-4 flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Secure access confirmed</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            Your Foreman role and multi-factor session were verified on the
            server.
          </p>
        </div>
      </div>
    </main>
  );
}
