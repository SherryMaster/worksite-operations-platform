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
    text: "Mobile-first workflows with complete desktop workspaces.",
  },
];

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(28rem,0.65fr)]">
      <section className="hidden min-h-screen border-r border-slate-200 bg-white p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div>
          <BrandMark />
          <p className="mt-20 text-sm font-semibold text-violet-700">
            Company operations
          </p>
          <h1 className="mt-3 max-w-xl font-heading text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Workforce operations, from the office to the worksite.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            One secure place for company oversight and focused field operations.
          </p>
        </div>

        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200">
          {safeguards.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="border-r border-slate-200 p-4 last:border-0"
            >
              <Icon className="size-5 text-violet-700" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>
          <p className="text-xs font-semibold text-violet-700">
            Authorized personnel
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold">
            Sign in to continue
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Use the company account assigned to you. Accounts are created and
            managed by company administration.
          </p>
          <div className="mt-8">
            <SignIn
              withSignUp={false}
              fallbackRedirectUrl="/"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none",
                  card: "w-full rounded-xl border border-slate-200 bg-white shadow-sm",
                  header: "hidden",
                  footer: "hidden",
                  formButtonPrimary:
                    "rounded-lg bg-violet-700 hover:bg-violet-800",
                  formFieldInput: "rounded-lg border-slate-200",
                  socialButtonsBlockButton: "rounded-lg border-slate-200",
                },
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
