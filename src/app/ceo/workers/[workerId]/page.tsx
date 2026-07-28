import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  FileText,
  ImageIcon,
  Pencil,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  changeWorkerEmploymentAction,
  changeWorkerRateAction,
  transferWorkerAction,
} from "@/app/ceo/workers/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { ManagedForm } from "@/components/phase2/managed-form";
import { ConfirmSubmitButton } from "@/components/phase3/confirm-submit-button";
import { formatDate, malaysiaDateInputValue } from "@/lib/phase2/format";
import { getWorker, getWorkerOptions } from "@/lib/phase3/data";
import { formatSen, maskIdentifier } from "@/lib/phase3/format";

function employmentLabel(status: string | undefined) {
  return status
    ? status
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "No status";
}

function nextEmploymentStatuses(status: string | undefined) {
  if (status === "ACTIVE") return ["SUSPENDED", "LEFT_COMPANY"] as const;
  if (status === "SUSPENDED") return ["ACTIVE", "ARCHIVED"] as const;
  if (status === "LEFT_COMPANY") return ["ACTIVE", "ARCHIVED"] as const;
  return [] as const;
}

const fileMessages: Record<string, string> = {
  failed: "The file change could not be completed. Please retry.",
  invalid: "Check the file type, size, document type, and required dates.",
  removed: "File removed. Its metadata remains in history.",
  "removed-cleanup-warning":
    "The file was removed from the app, but Storage cleanup needs support review.",
  replaced: "File replaced and the earlier version retained in history.",
  uploaded: "Private file uploaded.",
};

export default async function WorkerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<{ file?: string }>;
}) {
  const { workerId } = await params;
  const query = await searchParams;
  const [worker, options] = await Promise.all([
    getWorker(workerId),
    getWorkerOptions(),
  ]);
  if (!worker) notFound();

  const today = malaysiaDateInputValue();
  const currentStatus = worker.currentEmployment?.status;
  const activeDocuments = worker.documents.filter(
    (document) =>
      document.status === "ACTIVE" && document.file_kind === "DOCUMENT",
  );
  const fileHistory = worker.documents.filter(
    (document) => document.status !== "ACTIVE",
  );

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <Link
        href="/ceo/workers"
        className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to workers
      </Link>

      <div className="mt-6 flex flex-col gap-6 border-b border-stone-300 pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex items-start gap-5">
          <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden border border-stone-300 bg-stone-100 font-heading text-2xl font-semibold text-stone-500">
            {worker.photoId ? (
              <Image
                src={`/api/workers/${worker.id}/documents/${worker.photoId}`}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              worker.legal_name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="border border-stone-300 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wider">
                {employmentLabel(currentStatus)}
              </span>
              <span className="text-xs text-stone-500">
                {worker.projectName ?? "Awaiting assignment"}
              </span>
            </div>
            <h1 className="mt-3 font-heading text-4xl font-semibold uppercase leading-none sm:text-6xl">
              {worker.legal_name}
            </h1>
            <p className="mt-3 text-sm text-stone-600">
              {worker.tradeName ?? "No trade"} ·{" "}
              {worker.skillName ?? "No skill level"}
            </p>
          </div>
        </div>
        {currentStatus !== "ARCHIVED" ? (
          <Link
            href={`/ceo/workers/${worker.id}/edit`}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-stone-300 bg-white px-4 text-sm font-semibold hover:border-stone-950"
          >
            <Pencil className="size-4" aria-hidden="true" />
            Edit Worker
          </Link>
        ) : null}
      </div>

      <nav
        aria-label="Worker sections"
        className="mt-6 flex gap-1 overflow-x-auto border-b border-stone-300"
      >
        {[
          ["Overview", "#overview"],
          ["Employment", "#employment"],
          ["Assignments", "#assignments"],
          ["Rates", "#rates"],
          ["Documents", "#documents"],
          ["Audit", "#audit"],
        ].map(([label, href], index) => (
          <a
            key={href}
            href={href}
            className={
              index === 0
                ? "shrink-0 border-b-2 border-amber-600 px-4 py-3 text-sm font-semibold"
                : "shrink-0 border-b-2 border-transparent px-4 py-3 text-sm text-stone-500 hover:text-stone-950"
            }
          >
            {label}
          </a>
        ))}
      </nav>

      <section
        id="overview"
        className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]"
      >
        <article className="border border-stone-300 bg-white">
          <div className="border-b border-stone-200 p-5">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Overview
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold uppercase">
              Identity and contact
            </h2>
          </div>
          <dl className="grid sm:grid-cols-2">
            {[
              ["Phone", worker.phone_number],
              ["Alternate phone", worker.alternate_phone ?? "Not recorded"],
              ["Nationality", worker.nationality ?? "Not recorded"],
              ["CNIC", maskIdentifier(worker.cnic_number)],
              ["Passport", maskIdentifier(worker.passport_number)],
              ["Work permit", maskIdentifier(worker.work_permit_number)],
              [
                "Permit issue",
                worker.work_permit_issue_date
                  ? formatDate(worker.work_permit_issue_date)
                  : "Not recorded",
              ],
              [
                "Permit expiry",
                worker.work_permit_expiry_date
                  ? formatDate(worker.work_permit_expiry_date)
                  : "Not recorded",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border-b border-stone-200 p-5 sm:odd:border-r"
              >
                <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {label}
                </dt>
                <dd className="mt-2 text-sm font-medium">{value}</dd>
              </div>
            ))}
            <div className="p-5 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Address and notes
              </dt>
              <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                {[worker.address, worker.notes].filter(Boolean).join("\n\n") ||
                  "No address or notes recorded."}
              </dd>
            </div>
          </dl>
        </article>

        <aside className="border border-stone-800 bg-stone-950 p-6 text-stone-100">
          <WalletCards className="size-5 text-amber-400" aria-hidden="true" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Current hourly rate
          </p>
          <p className="mt-2 font-heading text-4xl font-semibold">
            {formatSen(worker.currentRate?.hourly_rate_sen ?? null)}
          </p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Monthly food deduction
          </p>
          <p className="mt-2 font-heading text-3xl font-semibold">
            {formatSen(worker.currentDeduction?.monthly_amount_sen ?? null)}
          </p>
        </aside>
      </section>

      <section id="employment" className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="border border-stone-300 bg-white p-5">
          <UserRound className="size-5 text-amber-700" aria-hidden="true" />
          <h2 className="mt-5 font-heading text-2xl font-semibold uppercase">
            Change Employment Status
          </h2>
          {nextEmploymentStatuses(currentStatus).length > 0 ? (
            <ManagedForm
              action={changeWorkerEmploymentAction.bind(null, worker.id)}
              submitLabel="Save Status"
              className="mt-5"
            >
              <label className="block space-y-2 text-sm font-medium">
                New status
                <select
                  name="status"
                  required
                  className="h-11 w-full border border-stone-300 bg-white px-3"
                >
                  {nextEmploymentStatuses(currentStatus).map((status) => (
                    <option key={status} value={status}>
                      {employmentLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Effective date
                <input
                  type="date"
                  name="startsOn"
                  required
                  max={today}
                  defaultValue={today}
                  className="h-11 w-full border border-stone-300 bg-white px-3"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Reason (Optional)
                <input
                  name="reason"
                  maxLength={500}
                  className="h-11 w-full border border-stone-300 bg-white px-3"
                />
              </label>
            </ManagedForm>
          ) : (
            <p className="mt-4 text-sm text-stone-500">
              Archived workers are read-only.
            </p>
          )}
        </article>
        <article className="border border-stone-300 bg-white">
          <h3 className="border-b border-stone-200 p-5 font-heading text-xl font-semibold uppercase">
            Employment History
          </h3>
          <ol className="divide-y divide-stone-200">
            {worker.employment.map((period) => (
              <li key={period.id} className="p-5">
                <div className="flex justify-between gap-4">
                  <p className="font-semibold">
                    {employmentLabel(period.status)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {formatDate(period.starts_on)} —{" "}
                    {formatDate(period.ends_on)}
                  </p>
                </div>
                {period.reason ? (
                  <p className="mt-2 text-sm text-stone-600">{period.reason}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section id="assignments" className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="border border-stone-300 bg-white p-5">
          <BriefcaseBusiness
            className="size-5 text-amber-700"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-heading text-2xl font-semibold uppercase">
            Assign or Transfer
          </h2>
          {currentStatus === "ACTIVE" ? (
            <ManagedForm
              action={transferWorkerAction.bind(null, worker.id)}
              submitLabel="Save Assignment"
              className="mt-5"
            >
              <label className="block space-y-2 text-sm font-medium">
                Destination
                <select
                  name="projectId"
                  defaultValue={worker.currentAssignment?.project_id ?? ""}
                  className="h-11 w-full border border-stone-300 bg-white px-3"
                >
                  <option value="">Awaiting assignment</option>
                  {options.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Effective date
                <input
                  type="date"
                  name="startsOn"
                  required
                  max={today}
                  defaultValue={today}
                  className="h-11 w-full border border-stone-300 bg-white px-3"
                />
              </label>
            </ManagedForm>
          ) : (
            <p className="mt-4 text-sm text-stone-500">
              Only active workers can be assigned to projects.
            </p>
          )}
        </article>
        <article className="border border-stone-300 bg-white">
          <h3 className="border-b border-stone-200 p-5 font-heading text-xl font-semibold uppercase">
            Assignment History
          </h3>
          {worker.assignments.length === 0 ? (
            <p className="p-5 text-sm text-stone-500">
              This worker has always been awaiting assignment.
            </p>
          ) : (
            <ol className="divide-y divide-stone-200">
              {worker.assignments.map((assignment) => (
                <li key={assignment.id} className="p-5">
                  <p className="font-semibold">{assignment.projectName}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {formatDate(assignment.starts_on)} —{" "}
                    {formatDate(assignment.ends_on)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>

      <section id="rates" className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="border border-stone-300 bg-white p-5">
          <CalendarClock className="size-5 text-amber-700" aria-hidden="true" />
          <h2 className="mt-5 font-heading text-2xl font-semibold uppercase">
            Add Effective Rate
          </h2>
          {currentStatus !== "ARCHIVED" ? (
            <ManagedForm
              action={changeWorkerRateAction.bind(null, worker.id)}
              submitLabel="Save Rate"
              className="mt-5"
            >
              <label className="block space-y-2 text-sm font-medium">
                Hourly rate (MYR)
                <input
                  name="hourlyRate"
                  inputMode="decimal"
                  required
                  defaultValue={
                    worker.currentRate
                      ? (worker.currentRate.hourly_rate_sen / 100).toFixed(2)
                      : ""
                  }
                  className="h-11 w-full border border-stone-300 bg-white px-3"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium">
                Effective date
                <input
                  type="date"
                  name="startsOn"
                  required
                  defaultValue={today}
                  className="h-11 w-full border border-stone-300 bg-white px-3"
                />
              </label>
            </ManagedForm>
          ) : (
            <p className="mt-4 text-sm text-stone-500">
              Archived workers are read-only.
            </p>
          )}
        </article>
        <article className="border border-stone-300 bg-white">
          <h3 className="border-b border-stone-200 p-5 font-heading text-xl font-semibold uppercase">
            Rate History
          </h3>
          <ol className="divide-y divide-stone-200">
            {worker.rates.map((rate) => (
              <li
                key={rate.id}
                className="flex items-center justify-between gap-4 p-5"
              >
                <p className="font-semibold">
                  {formatSen(rate.hourly_rate_sen)} / hour
                </p>
                <p className="text-xs text-stone-500">
                  {formatDate(rate.starts_on)} — {formatDate(rate.ends_on)}
                </p>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section id="documents" className="mt-8">
        <div className="flex items-center gap-3">
          <FileText className="size-5 text-amber-700" aria-hidden="true" />
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Private Storage
            </p>
            <h2 className="font-heading text-3xl font-semibold uppercase">
              Photos and Documents
            </h2>
          </div>
        </div>
        {query.file && fileMessages[query.file] ? (
          <p
            className={
              query.file === "failed" || query.file === "invalid"
                ? "mt-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                : "mt-4 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            }
            aria-live="polite"
          >
            {fileMessages[query.file]}
          </p>
        ) : null}

        {currentStatus === "ARCHIVED" ? (
          <p className="mt-5 border border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
            This worker is archived. Files remain available for authorized
            viewing, but the record is read-only.
          </p>
        ) : (
          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <form
              action={`/api/workers/${worker.id}/documents`}
              method="post"
              encType="multipart/form-data"
              className="border border-stone-300 bg-white p-5"
            >
              <ImageIcon className="size-5 text-amber-700" aria-hidden="true" />
              <h3 className="mt-4 font-heading text-xl font-semibold uppercase">
                {worker.photoId ? "Replace Worker Photo" : "Add Worker Photo"}
              </h3>
              <input type="hidden" name="fileKind" value="PHOTO" />
              <input
                type="hidden"
                name="replaceDocumentId"
                value={worker.photoId ?? ""}
              />
              <input type="hidden" name="documentTypeId" value="" />
              <input type="hidden" name="documentNumber" value="" />
              <input type="hidden" name="issueDate" value="" />
              <input type="hidden" name="expiryDate" value="" />
              <label className="mt-5 block space-y-2 text-sm font-medium">
                JPEG or PNG, up to 10 MB
                <input
                  type="file"
                  name="file"
                  accept="image/jpeg,image/png"
                  required
                  className="block w-full border border-stone-300 p-3 text-sm"
                />
              </label>
              <FormSubmitButton
                pendingLabel="Saving photo…"
                className="mt-4 min-h-11 bg-stone-950 px-5 text-sm font-semibold text-white"
              >
                Save Photo
              </FormSubmitButton>
            </form>

            <form
              action={`/api/workers/${worker.id}/documents`}
              method="post"
              encType="multipart/form-data"
              className="border border-stone-300 bg-white p-5"
            >
              <FileText className="size-5 text-amber-700" aria-hidden="true" />
              <h3 className="mt-4 font-heading text-xl font-semibold uppercase">
                Upload Document
              </h3>
              <input type="hidden" name="fileKind" value="DOCUMENT" />
              <input type="hidden" name="replaceDocumentId" value="" />
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  Document type
                  <select
                    name="documentTypeId"
                    required
                    className="h-11 w-full border border-stone-300 bg-white px-3"
                  >
                    <option value="">Select type</option>
                    {options.documentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Document number (Optional)
                  <input
                    name="documentNumber"
                    maxLength={100}
                    className="h-11 w-full border border-stone-300 px-3"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Issue date
                  <input
                    type="date"
                    name="issueDate"
                    className="h-11 w-full border border-stone-300 px-3"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Expiry date
                  <input
                    type="date"
                    name="expiryDate"
                    className="h-11 w-full border border-stone-300 px-3"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium sm:col-span-2">
                  PDF, JPEG, or PNG, up to 10 MB
                  <input
                    type="file"
                    name="file"
                    accept="application/pdf,image/jpeg,image/png"
                    required
                    className="block w-full border border-stone-300 p-3 text-sm"
                  />
                </label>
              </div>
              <FormSubmitButton
                pendingLabel="Uploading document…"
                className="mt-4 min-h-11 bg-stone-950 px-5 text-sm font-semibold text-white"
              >
                Upload Document
              </FormSubmitButton>
            </form>
          </div>
        )}

        <div className="mt-6 border border-stone-300 bg-white">
          <h3 className="border-b border-stone-200 p-5 font-heading text-xl font-semibold uppercase">
            Current Documents
          </h3>
          {activeDocuments.length === 0 ? (
            <p className="p-5 text-sm text-stone-500">
              No worker documents uploaded.
            </p>
          ) : (
            <div className="divide-y divide-stone-200">
              {activeDocuments.map((document) => (
                <article key={document.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">
                          {document.documentTypeName}
                        </h4>
                        {document.expiryState === "EXPIRED" ||
                        document.expiryState === "EXPIRING" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                            <AlertTriangle
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            {document.expiryState === "EXPIRED"
                              ? "Expired"
                              : "Expires within 30 days"}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {document.original_filename} ·{" "}
                        {document.expiry_date
                          ? `Expires ${formatDate(document.expiry_date)}`
                          : "No expiry date recorded"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/api/workers/${worker.id}/documents/${document.id}`}
                        className="inline-flex min-h-10 items-center gap-2 border border-stone-300 px-3 text-sm font-semibold"
                      >
                        Open Private File
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </Link>
                      {currentStatus !== "ARCHIVED" ? (
                        <form
                          action={`/api/workers/${worker.id}/documents`}
                          method="post"
                        >
                          <input type="hidden" name="intent" value="remove" />
                          <input
                            type="hidden"
                            name="documentId"
                            value={document.id}
                          />
                          <ConfirmSubmitButton
                            message={`Remove ${document.documentTypeName ?? "this document"}? The file will no longer be available, but its history will remain.`}
                            className="min-h-10 border border-red-200 px-3 text-sm font-semibold text-red-700"
                          >
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  {currentStatus !== "ARCHIVED" ? (
                    <details className="mt-4 border-t border-stone-200 pt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-amber-800">
                        Replace This Document
                      </summary>
                      <form
                        action={`/api/workers/${worker.id}/documents`}
                        method="post"
                        encType="multipart/form-data"
                        className="mt-4 grid gap-3 sm:grid-cols-2"
                      >
                        <input type="hidden" name="fileKind" value="DOCUMENT" />
                        <input
                          type="hidden"
                          name="replaceDocumentId"
                          value={document.id}
                        />
                        <input
                          type="hidden"
                          name="documentTypeId"
                          value={document.document_type_id ?? ""}
                        />
                        <input
                          name="documentNumber"
                          defaultValue={document.document_number ?? ""}
                          placeholder="Document number"
                          className="h-11 border border-stone-300 px-3 text-sm"
                        />
                        <input
                          type="date"
                          name="issueDate"
                          defaultValue={document.issue_date ?? ""}
                          aria-label="Replacement issue date"
                          className="h-11 border border-stone-300 px-3 text-sm"
                        />
                        <input
                          type="date"
                          name="expiryDate"
                          defaultValue={document.expiry_date ?? ""}
                          aria-label="Replacement expiry date"
                          className="h-11 border border-stone-300 px-3 text-sm"
                        />
                        <input
                          type="file"
                          name="file"
                          accept="application/pdf,image/jpeg,image/png"
                          required
                          aria-label="Replacement file"
                          className="border border-stone-300 p-3 text-sm sm:col-span-2"
                        />
                        <FormSubmitButton
                          pendingLabel="Replacing document…"
                          className="min-h-10 bg-stone-950 px-4 text-sm font-semibold text-white"
                        >
                          Replace Document
                        </FormSubmitButton>
                      </form>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        {fileHistory.length > 0 ? (
          <details className="mt-4 border border-stone-300 bg-stone-50 p-5">
            <summary className="cursor-pointer font-semibold">
              Replaced and Removed File History ({fileHistory.length})
            </summary>
            <ol className="mt-4 divide-y divide-stone-200">
              {fileHistory.map((document) => (
                <li key={document.id} className="py-3 text-sm">
                  <span className="font-medium">
                    {document.documentTypeName ?? "Worker photo"}
                  </span>{" "}
                  <span className="text-stone-500">
                    · {employmentLabel(document.status)} ·{" "}
                    {document.original_filename}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </section>

      <section
        id="audit"
        className="mt-8 border border-stone-800 bg-stone-950 p-6 text-stone-100"
      >
        <ShieldCheck className="size-5 text-amber-400" aria-hidden="true" />
        <h2 className="mt-5 font-heading text-2xl font-semibold uppercase">
          Worker Audit History
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400">
          Identity numbers and document contents are never copied into audit
          details. Open the filtered company audit log to trace profile,
          assignment, rate, status, and document changes.
        </p>
        <Link
          href={`/ceo/audit?query=${encodeURIComponent(worker.legal_name)}`}
          className="mt-5 inline-flex items-center gap-2 border border-stone-700 px-4 py-3 text-sm font-semibold hover:border-amber-400"
        >
          Open Worker Audit
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
