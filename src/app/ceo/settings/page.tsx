import {
  BadgeCheck,
  Building2,
  Download,
  FileCog,
  KeyRound,
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
  updateCompanySettingsAction,
} from "@/app/ceo/actions";
import {
  createDocumentTypeAction,
  setDocumentTypeActiveAction,
} from "@/app/ceo/workers/actions";
import { PageHeader } from "@/components/operations/page-header";
import { ActionButton } from "@/components/phase2/action-button";
import { ManagedForm } from "@/components/phase2/managed-form";
import { LeaveTypeSettings } from "@/components/phase5/leave-type-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSettingsData } from "@/lib/phase2/data";
import { listDocumentTypes } from "@/lib/phase3/data";
import { listLeaveTypes } from "@/lib/phase5/data";
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
    <article id={id} className="border border-violet-100 bg-white">
      <div className="border-b border-slate-200 p-5">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
          Workforce category
        </p>
        <h2 className="mt-1 font-heading text-2xl font-semibold uppercase">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      <div className="p-5">
        <ManagedForm
          action={createAction}
          submitLabel={`Add ${title.toLowerCase()}`}
          className="border border-slate-200 bg-slate-50 p-4"
        >
          <Label htmlFor={`${id}-name`}>New name</Label>
          <Input
            id={`${id}-name`}
            name="name"
            required
            maxLength={80}
            className="mt-2 h-11 rounded-xl bg-white"
          />
        </ManagedForm>

        {categories.length === 0 ? (
          <p className="mt-5 border border-dashed border-violet-100 p-6 text-center text-sm text-slate-500">
            No {title.toLowerCase()} configured.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-slate-200 border border-slate-200">
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
                      className="h-11 rounded-xl"
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
  const [data, documentTypes, leaveTypes] = await Promise.all([
    getSettingsData(),
    listDocumentTypes(),
    listLeaveTypes(true),
  ]);

  return (
    <main>
      <PageHeader
        eyebrow="Administration"
        title="Company settings"
        description="Manage access, master data, leave rules, import tools, and company identity."
      />

      <nav
        className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7"
        aria-label="Administration sections"
      >
        {[
          ["Users", "#users"],
          ["Trades", "#trades"],
          ["Skills", "#skills"],
          ["Documents", "#documents"],
          ["Leave types", "#leave-types"],
          ["Import template", "#import-template"],
          ["Company", "#company"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-medium hover:border-violet-300 hover:bg-violet-50"
          >
            {label}
          </a>
        ))}
      </nav>

      <section id="users" className="mt-6 space-y-4 scroll-mt-20">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-violet-700" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-violet-700">
              Restricted access
            </p>
            <h2 className="font-heading text-xl font-semibold">
              Foreman accounts
            </h2>
          </div>
        </div>

        <article className="grid overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
            <UserPlus className="size-5 text-violet-700" aria-hidden="true" />
            <h3 className="mt-4 font-heading text-lg font-semibold">
              Create a Foreman account
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The CEO creates the sign-in details directly. Email is optional.
              Share the initial password privately with the Foreman.
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
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    maxLength={80}
                    autoComplete="off"
                    className="h-11 rounded-xl"
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
                    className="h-11 rounded-xl"
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
                    className="h-11 rounded-xl"
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
                    className="h-11 rounded-xl"
                  />
                  <p className="text-xs text-slate-500">
                    Use at least 8 characters. Passwords never appear in the
                    audit log.
                  </p>
                </div>
              </div>
            </ManagedForm>
          </div>
        </article>

        <div>
          <article className="border border-violet-100 bg-white">
            <h3 className="border-b border-slate-200 px-5 py-4 font-heading text-xl font-semibold uppercase">
              Managed Foreman Accounts
            </h3>
            {data.foremen.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                No Foreman accounts have been created.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
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
                              : "border border-violet-100 bg-violet-50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-600"
                          }
                        >
                          {foreman.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {foreman.username
                          ? `@${foreman.username}`
                          : "No username"}
                        {foreman.emailAddress
                          ? ` · ${foreman.emailAddress}`
                          : " · No email"}
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                        <Building2 className="size-3.5" aria-hidden="true" />
                        {foreman.projectName ?? "No current project"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-start gap-3 xl:justify-end">
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
                      <details className="w-full border border-slate-200 bg-slate-50 p-3 xl:max-w-sm">
                        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                          <KeyRound
                            className="size-4 text-violet-700"
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
                            className="h-11 rounded-xl bg-white"
                          />
                          <p className="text-xs leading-5 text-slate-500">
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

      <LeaveTypeSettings leaveTypes={leaveTypes} />

      <section
        id="documents"
        className="mt-8 grid overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[0.7fr_1.3fr]"
      >
        <div className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
          <FileCog className="size-5 text-violet-700" aria-hidden="true" />
          <p className="mt-4 text-xs font-semibold text-violet-700">
            Worker files
          </p>
          <h2 className="mt-1 font-heading text-xl font-semibold">
            Document Types
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Define the labels and dates collected for private worker files.
            Deactivating a type preserves all existing records.
          </p>
        </div>
        <div className="bg-white p-5 sm:p-6">
          <ManagedForm
            action={createDocumentTypeAction}
            submitLabel="Add Document Type"
            className="border border-slate-200 bg-slate-50 p-4"
          >
            <label className="space-y-2 text-sm font-medium">
              Name
              <Input
                name="name"
                required
                minLength={2}
                maxLength={80}
                className="mt-2 h-11 rounded-xl bg-white"
              />
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="expectsIssueDate"
                  className="size-4 accent-stone-950"
                />
                Collect issue date
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="expectsExpiryDate"
                  className="size-4 accent-stone-950"
                />
                Collect expiry date
              </label>
            </div>
          </ManagedForm>
          <div className="mt-5 divide-y divide-slate-200 border border-slate-200">
            {documentTypes.map((type) => (
              <div
                key={type.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold">{type.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[
                      type.expects_issue_date ? "Issue date" : null,
                      type.expects_expiry_date ? "Expiry date" : null,
                    ]
                      .filter(Boolean)
                      .join(" and ") || "No dates required"}{" "}
                    · {type.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <ActionButton
                  action={setDocumentTypeActiveAction.bind(
                    null,
                    type.id,
                    !type.is_active,
                  )}
                  label={type.is_active ? "Deactivate" : "Restore"}
                  confirmMessage={
                    type.is_active
                      ? `Deactivate ${type.name}? Existing worker files will be preserved.`
                      : undefined
                  }
                  variant={type.is_active ? "outline" : "secondary"}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="import-template"
        className="mt-10 flex flex-col gap-5 border border-violet-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
            Data preparation
          </p>
          <h2 className="mt-2 font-heading text-2xl font-semibold uppercase">
            Worker Import Template
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Download the approved multi-sheet workbook for preparing projects,
            workers, documents, assignments, and rates. Import execution is
            planned for a later phase.
          </p>
        </div>
        <a
          href="/templates/worksite-import-template.xlsx"
          download
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-violet-700 px-5 text-sm font-semibold text-white"
        >
          <Download className="size-4" aria-hidden="true" />
          Download Template
        </a>
      </section>

      <section
        id="company"
        className="mt-8 grid overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-[0.7fr_1.3fr]"
      >
        <div className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
          <BadgeCheck className="size-5 text-violet-700" aria-hidden="true" />
          <p className="mt-4 text-xs font-semibold text-violet-700">
            Company identity
          </p>
          <h2 className="mt-1 font-heading text-xl font-semibold">
            Fixed operating context
          </h2>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-3">
              <dt className="text-slate-500">Currency</dt>
              <dd>MYR</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-200 pb-3">
              <dt className="text-slate-500">Timezone</dt>
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
                  className="h-11 rounded-xl"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                <span>Display name</span>
                <Input
                  name="displayName"
                  defaultValue={data.settings?.display_name ?? ""}
                  maxLength={120}
                  className="h-11 rounded-xl"
                />
              </label>
            </div>
          </ManagedForm>
        </div>
      </section>
    </main>
  );
}
