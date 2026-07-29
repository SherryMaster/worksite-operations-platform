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
    <main className="min-h-screen bg-slate-100 px-5 py-8 text-slate-950 sm:grid sm:place-items-center">
      <section className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <BrandMark />
        <div className="mt-10 grid size-11 place-items-center rounded-lg bg-violet-50 text-violet-700">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-semibold text-violet-700">{eyebrow}</p>
        <h1 className="mt-2 max-w-md font-heading text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="mt-3 max-w-md leading-7 text-slate-600">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {action ? (
            <Button
              render={<Link href={action.href} />}
              nativeButton={false}
              size="lg"
              className="rounded-lg bg-violet-700 px-5 text-white hover:bg-violet-800"
            >
              {action.label}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : null}
          <SignOutButton>
            <Button
              variant="outline"
              size="lg"
              className="rounded-lg border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </Button>
          </SignOutButton>
        </div>
      </section>
    </main>
  );
}
