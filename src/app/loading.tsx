export default function Loading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-stone-950 text-stone-100"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="text-center">
        <div className="mx-auto size-10 animate-pulse border border-amber-400 bg-amber-400/10" />
        <p className="mt-5 font-heading text-sm font-semibold uppercase tracking-[0.24em] text-stone-400">
          Verifying access
        </p>
      </div>
    </main>
  );
}
