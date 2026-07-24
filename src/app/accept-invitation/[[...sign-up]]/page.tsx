import { SignUp } from "@clerk/nextjs";
import { BadgeCheck, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

export default function AcceptInvitationPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-stone-950 px-5 py-8 text-stone-100">
      <div className="mx-auto max-w-5xl">
        <BrandMark />
        <div className="mt-10 grid min-w-0 gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <section className="min-w-0 lg:pt-8">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
              Company invitation
            </p>
            <h1 className="mt-4 font-heading text-5xl font-semibold uppercase leading-[0.9]">
              Set up your Foreman account.
            </h1>
            <p className="mt-5 text-sm leading-7 text-stone-400">
              Complete the invitation using the email selected by the CEO.
              Choose your username, then enroll an authenticator before project
              information becomes available.
            </p>
            <div className="mt-8 space-y-3 text-sm text-stone-300">
              <p className="flex items-center gap-3">
                <BadgeCheck
                  className="size-5 text-emerald-400"
                  aria-hidden="true"
                />
                Invitation-only registration
              </p>
              <p className="flex items-center gap-3">
                <ShieldCheck
                  className="size-5 text-amber-400"
                  aria-hidden="true"
                />
                CEO activation and MFA required
              </p>
            </div>
          </section>
          <section
            aria-label="Accept Foreman invitation"
            className="flex min-w-0 justify-center bg-stone-100 p-4 text-stone-950 sm:p-8"
          >
            <SignUp
              routing="path"
              path="/accept-invitation"
              signInUrl="/sign-in"
              forceRedirectUrl="/"
              appearance={{
                elements: {
                  rootBox: "!w-full !min-w-0 !max-w-md",
                  cardBox: "!w-full !min-w-0 !max-w-full shadow-none",
                  card: "!w-full !min-w-0 !max-w-full rounded-none shadow-none",
                  formButtonPrimary:
                    "rounded-none bg-stone-950 hover:bg-stone-800",
                  formFieldInput: "rounded-none border-stone-300",
                  footer: "hidden",
                },
              }}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
