import { SignOutButton } from "@clerk/nextjs";
import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

export function AccessState({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <main className="min-h-screen bg-violet-700 px-5 py-8 text-white sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-violet-500/40 bg-violet-900/70 p-6 shadow-2xl sm:p-10">
        <BrandMark inverted />
        <div className="mt-14 grid size-12 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-orange-300">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-8 font-heading text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-md font-heading text-4xl font-semibold uppercase leading-[0.95] tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-md leading-7 text-violet-100">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {action ? (
            <Button
              render={<Link href={action.href} />}
              nativeButton={false}
              size="lg"
              className="rounded-xl bg-amber-400 px-5 text-slate-950 hover:bg-amber-300"
            >
              {action.label}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}
          <SignOutButton>
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl border-violet-700 bg-transparent text-slate-200 hover:bg-violet-800"
            >
              Sign out
            </Button>
          </SignOutButton>
        </div>
      </section>
    </main>
  );
}
