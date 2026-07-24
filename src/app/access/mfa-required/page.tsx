import { UserProfile } from "@clerk/nextjs";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { destinationForAccess, getCurrentAccess } from "@/lib/auth/access";

export default async function MfaRequiredPage() {
  const access = await getCurrentAccess();

  if (access.status !== "MFA_REQUIRED") {
    redirect(destinationForAccess(access));
  }

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-6 text-stone-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <BrandMark />
        <div className="mt-10 grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <section className="lg:pt-6">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
              Foreman security
            </p>
            <h1 className="mt-4 font-heading text-5xl font-semibold uppercase leading-[0.9] tracking-tight">
              Set up multi-factor access.
            </h1>
            <p className="mt-5 leading-7 text-stone-400">
              Every active Foreman must enroll an authenticator and verify the
              second factor before site information is available.
            </p>
            <ol className="mt-8 space-y-4 text-sm text-stone-300">
              {[
                "Open Security in your profile.",
                "Add an authenticator application and save backup codes.",
                "Sign out, then sign in again and complete the second factor.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center border border-amber-400/30 font-heading text-xs text-amber-400">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 leading-6">{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex items-center gap-2 text-xs text-stone-500">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Application role already verified
            </div>
            <Button
              render={<Link href="/" />}
              nativeButton={false}
              variant="outline"
              size="lg"
              className="mt-8 rounded-none border-stone-700 bg-transparent text-stone-200 hover:bg-stone-800"
            >
              Check access again
            </Button>
          </section>

          <section
            aria-label="Account security settings"
            className="min-w-0 overflow-hidden border border-stone-800 bg-stone-900 p-2 sm:p-4"
          >
            <UserProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none",
                  card: "w-full rounded-none shadow-none",
                  navbar: "rounded-none",
                  scrollBox: "rounded-none",
                },
              }}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
