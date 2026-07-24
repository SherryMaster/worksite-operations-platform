import {
  BadgeCheck,
  Building2,
  CircleOff,
  KeyRound,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

import {
  createForemanAction,
  createSkillAction,
  createTradeAction,
  renameSkillAction,
  renameTradeAction,
  resetForemanPasswordAction,
  setCategoryActiveAction,
  setForemanActiveAction,
  setForemanMfaRequirementAction,
  updateCompanySettingsAction,
} from "@/app/ceo/actions";
import { ActionButton } from "@/components/phase2/action-button";
import { ManagedForm } from "@/components/phase2/managed-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettingsData } from "@/lib/phase2/data";
import type { Tables } from "@/types/database";

type Category = Pick<Tables<"trades">, "id" | "is_active" | "name">;

function CategorySection({
  categories,
  createAction,
  description,
  id,
  renameAction,
  table,
  title,
}: {
  categories: Category[];
  createAction: typeof createTradeAction;
  description: string;
  id: string;
  renameAction: typeof renameTradeAction;
  table: "trades" | "skill_levels";
  title: string;
}) {
  return (
    <article id={id} className="border border-stone-300 bg-white">
      <div className="border-b border-stone-200 p-5">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          Workforce category
        </p>
        <h2 className="mt-1 font-heading text-2xl font-semibold uppercase">
          {title}
        </h2>
        <p className="mt-2 text-sm text-stone-500">{description}</p>
      </div>
      <div className="p-5">
        <ManagedForm
          action={createAction}
          submitLabel={`Add ${title.toLowerCase()}`}
          className="border border-stone-200 bg-stone-50 p-4"
        >
          <Label htmlFor={`${id}-name`}>New name</Label>
          <Input
            id={`${id}-name`}
            name="name"
            required
            maxLength={80}
            className="mt-2 h-11 rounded-none bg-white"
          />
        </ManagedForm>

        {categories.length === 0 ? (
          <p className="mt-5 border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
            No {title.toLowerCase()} configured.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-stone-200 border border-stone-200">
            {categories.map((category) => (
              <div
                key={category.id}
                className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-start"
              >
                <ManagedForm
                  action={renameAction.bind(null, category.id)}
                  submitLabel="Rename"
                  className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                >
                  <label className="space-y-2 text-sm font-medium">
                    <span className="sr-only">Category name</span>
                    <Input
                      name="name"
                      defaultValue={category.name}
                      required
                      maxLength={80}
                      className="h-10 rounded-none"
                    />
                  </label>
                </ManagedForm>
                <ActionButton
                  action={setCategoryActiveAction.bind(
                    null,
                    table,
                    category.id,
                    !category.is_active,
                  )}
                  label={category.is_active ? "Deactivate" : "Restore"}
                  confirmMessage={
                    category.is_active
                      ? `Deactivate ${category.name}? Existing historical records will retain it.`
                      : undefined
                  }
                  variant={category.is_active ? "outline" : "secondary"}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default async function SettingsPage() {
  const data = await getSettingsData();

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="border-b border-stone-300 pb-8">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
          Company administration
        </p>
        <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
          Settings
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Manage who can enter the field workspace and the categories used by
          later workforce records.
        </p>
      </div>

      <nav className="mt-6 flex gap-2 overflow-x-auto" aria-label="Settings">
        {[
          ["Users", "#users"],
          ["Trades", "#trades"],
          ["Skills", "#skills"],
          ["Company", "#company"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="shrink-0 border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:border-stone-950"
          >
            {label}
          </a>
        ))}
      </nav>

      <section id="users" className="mt-8 space-y-6">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-amber-700" aria-hidden="true" />
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Restricted access
            </p>
            <h2 className="font-heading text-3xl font-semibold uppercase">
              Foreman accounts
            </h2>
          </div>
        </div>

        <article className="grid gap-px border border-stone-300 bg-stone-300 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="bg-stone-950 p-6 text-stone-100">
            <UserPlus className="size-5 text-amber-400" aria-hidden="true" />
            <h3 className="mt-8 font-heading text-2xl font-semibold uppercase">
              Create a Foreman account
            </h3>
            <p className="mt-3 text-sm leading-6 text-stone-400">
              The CEO creates the sign-in details directly. Email and MFA are
              optional. Share the initial password privately with the Foreman.
            </p>
          </div>
          <div className="bg-white p-5 sm:p-6">
            <ManagedForm
              action={createForemanAction}
              submitLabel="Create Account"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    required
                    maxLength={80}
                    autoComplete="off"
                    className="h-11 rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    maxLength={80}
                    autoComplete="off"
                    className="h-11 rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    required
                    minLength={4}
                    maxLength={64}
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailAddress">Email (Optional)</Label>
                  <Input
                    id="emailAddress"
                    name="emailAddress"
                    type="email"
                    autoComplete="off"
                    spellCheck={false}
                    className="h-11 rounded-none"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="initialPassword">Initial Password</Label>
                  <Input
                    id="initialPassword"
                    name="initialPassword"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className="h-11 rounded-none"
                  />
                  <p className="text-xs text-stone-500">
                    Use at least 8 characters. Passwords never appear in the
                    audit log.
                  </p>
                </div>
                <label className="flex min-h-11 items-center gap-3 border border-stone-200 bg-stone-50 px-3 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    name="mfaRequired"
                    className="size-4 accent-stone-950"
                  />
                  Require MFA for this account
                </label>
              </div>
            </ManagedForm>
          </div>
        </article>

        <div>
          <article className="border border-stone-300 bg-white">
            <h3 className="border-b border-stone-200 px-5 py-4 font-heading text-xl font-semibold uppercase">
              Managed Foreman Accounts
            </h3>
            {data.foremen.length === 0 ? (
              <p className="p-6 text-sm text-stone-500">
                No Foreman accounts have been created.
              </p>
            ) : (
              <div className="divide-y divide-stone-200">
                {data.foremen.map((foreman) => (
                  <div
                    key={foreman.applicationUserId}
                    className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{foreman.displayName}</p>
                        <span
                          className={
                            foreman.isActive
                              ? "border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-800"
                              : "border border-stone-300 bg-stone-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-stone-600"
                          }
                        >
                          {foreman.isActive ? "Active" : "Inactive"}
                        </span>
                        <span
                          className={
                            foreman.mfaRequired || foreman.twoFactorEnabled
                              ? "inline-flex items-center gap-1 text-xs text-emerald-700"
                              : "inline-flex items-center gap-1 text-xs text-stone-500"
                          }
                        >
                          {foreman.mfaRequired || foreman.twoFactorEnabled ? (
                            <ShieldCheck
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          ) : (
                            <CircleOff
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          )}
                          {foreman.mfaRequired
                            ? foreman.twoFactorEnabled
                              ? "MFA required and enrolled"
                              : "MFA required — setup pending"
                            : foreman.twoFactorEnabled
                              ? "MFA enrolled — optional"
                              : "MFA off"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {foreman.username
                          ? `@${foreman.username}`
                          : "No username"}
                        {foreman.emailAddress
                          ? ` · ${foreman.emailAddress}`
                          : " · No email"}
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                        <Building2 className="size-3.5" aria-hidden="true" />
                        {foreman.projectName ?? "No current project"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-3 xl:justify-end">
                      <ActionButton
                        action={setForemanMfaRequirementAction.bind(
                          null,
                          foreman.applicationUserId,
                          foreman.clerkUserId,
                          !(foreman.mfaRequired || foreman.twoFactorEnabled),
                        )}
                        label={
                          foreman.mfaRequired || foreman.twoFactorEnabled
                            ? "Turn MFA Off"
                            : "Require MFA"
                        }
                        confirmMessage={
                          foreman.mfaRequired || foreman.twoFactorEnabled
                            ? `Turn MFA off for ${foreman.displayName}? Existing authenticator methods and backup codes will be removed.`
                            : undefined
                        }
                        variant="outline"
                      />
                      <ActionButton
                        action={setForemanActiveAction.bind(
                          null,
                          foreman.applicationUserId,
                          !foreman.isActive,
                        )}
                        label={foreman.isActive ? "Deactivate" : "Reactivate"}
                        confirmMessage={
                          foreman.isActive
                            ? `Deactivate ${foreman.displayName}? Access will stop immediately.`
                            : undefined
                        }
                        variant={foreman.isActive ? "destructive" : "secondary"}
                      />
                      <details className="w-full border border-stone-200 bg-stone-50 p-3 xl:max-w-sm">
                        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                          <KeyRound
                            className="size-4 text-amber-700"
                            aria-hidden="true"
                          />
                          Change Password
                        </summary>
                        <ManagedForm
                          action={resetForemanPasswordAction.bind(
                            null,
                            foreman.applicationUserId,
                            foreman.clerkUserId,
                          )}
                          submitLabel="Save New Password"
                          className="mt-4"
                        >
                          <Label
                            htmlFor={`password-${foreman.applicationUserId}`}
                          >
                            New Password
                          </Label>
                          <Input
                            id={`password-${foreman.applicationUserId}`}
                            name="newPassword"
                            type="password"
                            required
                            minLength={8}
                            maxLength={128}
                            autoComplete="new-password"
                            className="h-10 rounded-none bg-white"
                          />
                          <p className="text-xs leading-5 text-stone-500">
                            Existing sessions will be signed out. Share the new
                            password securely.
                          </p>
                        </ManagedForm>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-2">
        <CategorySection
          id="trades"
          title="Trades"
          description="CEO-managed worker trade categories."
          categories={data.trades}
          createAction={createTradeAction}
          renameAction={renameTradeAction}
          table="trades"
        />
        <CategorySection
          id="skills"
          title="Skill levels"
          description="Skill categories do not determine worker rates."
          categories={data.skills}
          createAction={createSkillAction}
          renameAction={renameSkillAction}
          table="skill_levels"
        />
      </section>

      <section
        id="company"
        className="mt-10 grid gap-px border border-stone-300 bg-stone-300 lg:grid-cols-[0.7fr_1.3fr]"
      >
        <div className="bg-stone-950 p-6 text-stone-100">
          <BadgeCheck className="size-5 text-amber-400" aria-hidden="true" />
          <p className="mt-8 font-heading text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Company identity
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold uppercase">
            Fixed operating context
          </h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between border-b border-stone-800 pb-3">
              <dt className="text-stone-500">Currency</dt>
              <dd>MYR</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-stone-800 pb-3">
              <dt className="text-stone-500">Timezone</dt>
              <dd className="text-right">Asia/Kuala_Lumpur</dd>
            </div>
          </dl>
        </div>
        <div className="bg-white p-5 sm:p-8">
          <ManagedForm
            action={updateCompanySettingsAction}
            submitLabel="Save company settings"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                <span>Legal name</span>
                <Input
                  name="legalName"
                  defaultValue={data.settings?.legal_name ?? ""}
                  maxLength={160}
                  className="h-11 rounded-none"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Display name</span>
                <Input
                  name="displayName"
                  defaultValue={data.settings?.display_name ?? ""}
                  maxLength={120}
                  className="h-11 rounded-none"
                />
              </label>
            </div>
          </ManagedForm>
        </div>
      </section>
    </main>
  );
}
