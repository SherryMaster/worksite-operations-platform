export default function Loading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-slate-100 text-slate-700"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <div className="mx-auto size-10 animate-pulse rounded-xl border border-violet-300 bg-violet-300/10" />
        <p className="mt-4 text-sm font-semibold text-slate-500">
          Opening your workspace…
        </p>
      </div>
    </main>
  );
}
