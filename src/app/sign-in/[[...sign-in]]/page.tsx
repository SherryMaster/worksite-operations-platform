import { SignIn } from "@clerk/nextjs";
import { BadgeCheck, HardHat, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

const safeguards = [
  {
    icon: ShieldCheck,
    title: "Restricted access",
    text: "Accounts are issued by company administration.",
  },
  {
    icon: BadgeCheck,
    title: "Role verified",
    text: "Workspaces are resolved from active company records.",
  },
  {
    icon: HardHat,
    title: "Field ready",
    text: "Desktop control for the office. Mobile focus for site teams.",
  },
];

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(30rem,0.72fr)]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-stone-800 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(251,191,36,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.11)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]"
        />
        <div className="relative">
          <BrandMark />
          <p className="mt-24 font-heading text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
            Company operations console
          </p>
          <h1 className="mt-5 max-w-2xl font-heading text-7xl font-semibold uppercase leading-[0.86] tracking-[-0.035em] xl:text-8xl">
            The day starts at the worksite.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-stone-400">
            One secure place for company oversight and focused field operations.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-px border border-stone-800 bg-stone-800">
          {safeguards.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-stone-950 p-5">
              <Icon className="size-5 text-amber-400" aria-hidden="true" />
              <p className="mt-5 font-heading text-lg font-semibold uppercase">
                {title}
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-stone-100 px-5 py-10 text-stone-950">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            Authorized personnel
          </p>
          <h2 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none">
            Sign in to continue
          </h2>
          <p className="mt-4 text-sm leading-6 text-stone-600">
            Use the company account assigned to you. Foreman access requires
            multi-factor authentication.
          </p>
          <div className="mt-8">
            <SignIn
              withSignUp={false}
              fallbackRedirectUrl="/"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none",
                  card: "w-full rounded-none border border-stone-300 bg-white shadow-[8px_8px_0_0_rgba(28,25,23,0.08)]",
                  header: "hidden",
                  footer: "hidden",
                  formButtonPrimary:
                    "rounded-none bg-stone-950 hover:bg-stone-800",
                  formFieldInput: "rounded-none border-stone-300",
                  socialButtonsBlockButton: "rounded-none border-stone-300",
                },
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
