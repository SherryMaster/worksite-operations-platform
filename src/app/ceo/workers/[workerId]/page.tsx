import { ChevronLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  ProfileHeaderSkeleton,
  WorkerSectionSkeleton,
} from "@/components/operations/loading-skeletons";
import {
  CompactCard,
  InfoRows,
  WorkerDocumentList,
  WorkerProfileHeader,
  WorkerSectionPicker,
} from "@/components/phase3/worker-detail";
import {
  formatDate,
  formatDateTime,
  malaysiaDateInputValue,
} from "@/lib/phase2/format";
import { presentAuditEntry } from "@/lib/phase2/audit";
import { getWorkerAuditEntries } from "@/lib/phase2/data";
import {
  getWorkerCore,
  getWorkerForSection,
  getWorkerIdentity,
} from "@/lib/phase3/data";
import { formatSen, maskIdentifier } from "@/lib/phase3/format";
import { getWorkerAttendanceMonth } from "@/lib/phase4/data";
import { listLeaveRequests } from "@/lib/phase5/data";
import { getWorkerPayrollHistory } from "@/lib/phase6/data";
import { payrollMonthLabel } from "@/lib/phase6/calculations";
import {
  changeWorkerEmploymentAction,
  changeWorkerRateAction,
  transferWorkerAction,
} from "@/app/ceo/workers/actions";
import { ManagedForm } from "@/components/phase2/managed-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { listAssignableProjects } from "@/lib/phase3/data";

const sections = [
  { label: "Overview", value: "overview" },
  { label: "Work history", value: "work-history" },
  { label: "Documents", value: "documents" },
  { label: "Attendance & leave", value: "attendance-leave" },
  { label: "Payroll", value: "payroll" },
  { label: "Activity", value: "activity" },
];
const fileMessages: Record<string, string> = {
  "document-saved": "Document metadata and private file saved.",
  "file-removed": "The file was removed; document metadata remains active.",
  "metadata-saved": "Document metadata saved with no file attached.",
  "metadata-saved-upload-failed":
    "Document metadata was saved, but the optional file upload failed. Use Manage to retry.",
  removed: "Document removed; its history is retained.",
  "removed-cleanup-warning":
    "The record was removed, but private-storage cleanup needs support review.",
  failed: "The file change could not be completed. Please retry.",
  invalid: "Check the document metadata and selected file.",
  "photo-saved": "Worker photo saved.",
};

export default async function WorkerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<{
    file?: string;
    month?: string;
    section?: string;
    tab?: string;
  }>;
}) {
  const { workerId } = await params;
  const query = await searchParams;
  if (!(await getWorkerIdentity(workerId))) notFound();
  const requested = query.section ?? query.tab ?? "overview";
  const section = sections.some((item) => item.value === requested)
    ? requested
    : "overview";
  const corePromise = getWorkerCore(workerId);
  return (
    <main>
      <Link
        href="/ceo/workers"
        className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-600"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to workers
      </Link>
      <Suspense fallback={<ProfileHeaderSkeleton />}>
        <Header workerPromise={corePromise} section={section} />
      </Suspense>
      {query.file && fileMessages[query.file] ? (
        <p
          role="status"
          className={`mt-4 rounded-lg border p-3 text-sm ${query.file.includes("failed") || query.file === "invalid" || query.file.includes("warning") ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
        >
          {fileMessages[query.file]}
        </p>
      ) : null}
      <Suspense
        key={`${section}:${query.month ?? ""}`}
        fallback={<WorkerSectionSkeleton section={section} />}
      >
        <Section
          workerId={workerId}
          section={section}
          month={query.month}
          corePromise={corePromise}
        />
      </Suspense>
    </main>
  );
}

async function Header({
  workerPromise,
  section,
}: {
  workerPromise: ReturnType<typeof getWorkerCore>;
  section: string;
}) {
  const worker = await workerPromise;
  if (!worker) return null;
  return (
    <>
      <WorkerProfileHeader canEdit worker={worker} />
      <WorkerSectionPicker
        active={section}
        basePath={`/ceo/workers/${worker.id}`}
        sections={sections}
      />
    </>
  );
}

function minutes(value: number) {
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

async function Section({
  workerId,
  section,
  month,
  corePromise,
}: {
  workerId: string;
  section: string;
  month?: string;
  corePromise: ReturnType<typeof getWorkerCore>;
}) {
  const currentMonth = /^\d{4}-\d{2}$/.test(month ?? "")
    ? month!
    : malaysiaDateInputValue().slice(0, 7);
  if (section === "attendance-leave") {
    const [attendance, leave] = await Promise.all([
      getWorkerAttendanceMonth(workerId, currentMonth),
      listLeaveRequests({ workerId }),
    ]);
    return (
      <div className="mt-4 grid gap-4">
        <form className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <input type="hidden" name="section" value="attendance-leave" />
          <label className="text-sm font-medium">
            Month
            <input
              className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-3"
              type="month"
              name="month"
              defaultValue={currentMonth}
            />
          </label>
          <button className="min-h-11 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white">
            View month
          </button>
        </form>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4 lg:grid-cols-8">
          {[
            ["Payable days", attendance.totals.payableDays],
            ["Payable time", minutes(attendance.totals.payableMinutes)],
            ["Normal", minutes(attendance.totals.normalMinutes)],
            ["Overtime", minutes(attendance.totals.overtimeMinutes)],
            ["Sunday", minutes(attendance.totals.sundayMinutes)],
            ["Public holiday", minutes(attendance.totals.publicHolidayMinutes)],
            ["Exceptions", attendance.totals.exceptions],
            ["Leave days", attendance.totals.leaveDays],
          ].map(([label, value]) => (
            <div key={label} className="bg-white p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 font-heading text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
        <CompactCard title="Attendance">
          <div className="divide-y divide-slate-100">
            {attendance.rows.length ? (
              attendance.rows.map((row) => (
                <div
                  key={`${row.projectId}:${row.date}`}
                  className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[8rem_1fr_auto_auto]"
                >
                  <span className="font-medium">{formatDate(row.date)}</span>
                  <span className="break-words text-slate-600">
                    {row.projectName}
                  </span>
                  <span>{row.leaveTypeName ?? minutes(row.totalMinutes)}</span>
                  <span className="text-slate-500">
                    {row.leaveTypeName ??
                      (row.exceptionCount
                        ? `${row.exceptionCount} exceptions`
                        : row.status)}
                  </span>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">
                No attendance for this month.
              </p>
            )}
          </div>
        </CompactCard>
        <CompactCard title="Leave history">
          <div className="divide-y divide-slate-100">
            {leave.length ? (
              leave.slice(0, 30).map((item) => (
                <div
                  key={item.id}
                  className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto]"
                >
                  <span>
                    {item.leaveTypeName} · {item.projectName}
                  </span>
                  <span>
                    {formatDate(item.starts_on)} – {formatDate(item.ends_on)}
                  </span>
                  <span className="font-medium">{item.status}</span>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">No leave history.</p>
            )}
          </div>
        </CompactCard>
      </div>
    );
  }
  if (section === "payroll") {
    const history = await getWorkerPayrollHistory(workerId);
    return (
      <div className="mt-4">
        <CompactCard title="Payroll and payment history">
          <div className="divide-y divide-slate-100">
            {history.length ? (
              history.map((line) => (
                <Link
                  key={line.id}
                  href={`/ceo/payroll/${line.payroll_run_id}/workers/${line.id}`}
                  className="grid min-h-14 gap-1 px-4 py-3 text-sm hover:bg-slate-50 sm:grid-cols-[1fr_auto_auto]"
                >
                  <span className="font-semibold">
                    {line.run
                      ? payrollMonthLabel(line.run.payroll_month)
                      : "Payroll"}
                  </span>
                  <span>{formatSen(line.net_pay_sen)}</span>
                  <span className="text-slate-500">{line.payment_status}</span>
                </Link>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">No payroll history.</p>
            )}
          </div>
        </CompactCard>
      </div>
    );
  }
  if (section === "activity") {
    const entries = await getWorkerAuditEntries(workerId);
    return (
      <div className="mt-4">
        <CompactCard title="Worker activity">
          <div className="divide-y divide-slate-100">
            {entries.length ? (
              entries.map((entry) => {
                const view = presentAuditEntry({
                  action: entry.action,
                  actorName: entry.actorName,
                  afterData: entry.after_data,
                  beforeData: entry.before_data,
                  entityType: entry.entity_type,
                  foremanName: entry.foremanName,
                  module: entry.module,
                  projectName: entry.projectName,
                  source: entry.source,
                  workerName: entry.workerName,
                });
                return (
                  <article key={entry.id} className="px-4 py-3">
                    <div className="flex flex-wrap justify-between gap-2">
                      <h3 className="font-semibold">{view.title}</h3>
                      <time className="text-xs text-slate-500">
                        {formatDateTime(entry.occurred_at)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {view.summary}
                    </p>
                    {view.changes.length ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {view.changes
                          .map(
                            (change) =>
                              `${change.field}: ${change.from ?? "—"} → ${change.to}`,
                          )
                          .join(" · ")}
                      </p>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <p className="p-4 text-sm text-slate-500">
                No activity recorded.
              </p>
            )}
          </div>
        </CompactCard>
      </div>
    );
  }
  const worker = await getWorkerForSection(workerId, section, corePromise);
  if (!worker) return null;
  if (section === "documents")
    return (
      <div className="mt-4">
        <CompactCard
          title="Documents"
          action={
            worker.currentEmployment?.status !== "ARCHIVED" ? (
              <Link
                href={`/ceo/workers/${workerId}/edit?stage=documents`}
                className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-violet-800"
              >
                <Pencil className="size-4" />
                Manage
              </Link>
            ) : undefined
          }
        >
          <WorkerDocumentList
            canManage={worker.currentEmployment?.status !== "ARCHIVED"}
            worker={worker}
          />
        </CompactCard>
      </div>
    );
  if (section === "work-history") {
    const projects = await listAssignableProjects();
    return (
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <WorkHistoryActions
          workerId={workerId}
          status={worker.currentEmployment?.status ?? ""}
          projects={projects}
          currentProjectId={worker.currentAssignment?.project_id ?? ""}
          currentRate={worker.currentRate?.hourly_rate_sen ?? 0}
        />
        <CompactCard title="Employment timeline">
          <InfoRows
            rows={worker.employment.map((item) => [
              formatDate(item.starts_on),
              `${item.status.replaceAll("_", " ")} · until ${formatDate(item.ends_on)}`,
            ])}
          />
        </CompactCard>
        <CompactCard title="Assignment timeline">
          <InfoRows
            rows={
              worker.assignments.length
                ? worker.assignments.map((item) => [
                    formatDate(item.starts_on),
                    `${item.projectName} · until ${formatDate(item.ends_on)}`,
                  ])
                : [["Current", "Awaiting assignment"]]
            }
          />
        </CompactCard>
        <CompactCard title="Trade and skill history">
          <InfoRows
            rows={worker.classifications.map((item) => [
              formatDate(item.starts_on),
              `${item.tradeName} · ${item.skillName}`,
            ])}
          />
        </CompactCard>
        <CompactCard title="Rate history">
          <InfoRows
            rows={worker.rates.map((item) => [
              formatDate(item.starts_on),
              `${formatSen(item.hourly_rate_sen)} · until ${formatDate(item.ends_on)}`,
            ])}
          />
        </CompactCard>
        <CompactCard title="Food-deduction history">
          <InfoRows
            rows={worker.foodDeductions.map((item) => [
              formatDate(item.starts_on),
              `${formatSen(item.monthly_amount_sen)} · until ${formatDate(item.ends_on)}`,
            ])}
          />
        </CompactCard>
        <aside className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
          <p className="font-semibold">Dedicated operations</p>
          <p className="mt-1">
            Employment status and project assignment remain separate from Edit
            worker.
          </p>
          <Link
            href={`/ceo/workers/${workerId}/edit?stage=work-pay`}
            className="mt-3 inline-flex min-h-11 items-center font-semibold underline"
          >
            Review classification or pay changes
          </Link>
        </aside>
      </div>
    );
  }
  const alertCount = worker.documents.filter((item) =>
    ["EXPIRED", "EXPIRING"].includes(item.expiryState),
  ).length;
  return (
    <div className="mt-4 grid gap-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-5">
        {[
          ["Project", worker.projectName ?? "Awaiting assignment"],
          ["Status", worker.currentEmployment?.status ?? "Not recorded"],
          ["Rate", formatSen(worker.currentRate?.hourly_rate_sen ?? null)],
          [
            "Food deduction",
            formatSen(worker.currentDeduction?.monthly_amount_sen ?? null),
          ],
          ["Document alerts", alertCount],
        ].map(([label, value]) => (
          <div className="min-w-0 bg-white p-3" key={label}>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-1 break-words font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CompactCard
          title="Personal information"
          action={
            <Link
              className="text-sm font-semibold text-violet-800"
              href={`/ceo/workers/${workerId}/edit?stage=personal`}
            >
              Edit
            </Link>
          }
        >
          <InfoRows
            rows={[
              ["Phone", worker.phone_number],
              ["Nationality", worker.nationality ?? "Not recorded"],
              ["Address", worker.address ?? "Not recorded"],
              [
                "Primary identifier",
                maskIdentifier(worker.primaryIdentifier?.number ?? null),
              ],
              ["Joined", formatDate(worker.created_at.slice(0, 10))],
            ]}
          />
        </CompactCard>
        <CompactCard
          title="Job and pay"
          action={
            <Link
              className="text-sm font-semibold text-violet-800"
              href={`/ceo/workers/${workerId}/edit?stage=work-pay`}
            >
              Edit
            </Link>
          }
        >
          <InfoRows
            rows={[
              ["Project", worker.projectName ?? "Awaiting assignment"],
              ["Trade", worker.tradeName ?? "Not recorded"],
              ["Skill", worker.skillName ?? "Not recorded"],
              [
                "Hourly rate",
                formatSen(worker.currentRate?.hourly_rate_sen ?? null),
              ],
              [
                "Food deduction",
                formatSen(worker.currentDeduction?.monthly_amount_sen ?? null),
              ],
            ]}
          />
        </CompactCard>
      </div>
      <CompactCard title="Needs attention">
        <p className="p-4 text-sm text-slate-600">
          {alertCount
            ? `${alertCount} document${alertCount === 1 ? "" : "s"} need attention.`
            : "No current document alerts."}
        </p>
      </CompactCard>
      <OverviewAttendance workerId={workerId} month={currentMonth} />
    </div>
  );
}

function WorkHistoryActions({
  workerId,
  status,
  projects,
  currentProjectId,
  currentRate,
}: {
  workerId: string;
  status: string;
  projects: Array<{ id: string; name: string }>;
  currentProjectId: string;
  currentRate: number;
}) {
  const today = malaysiaDateInputValue();
  const statuses =
    status === "ACTIVE"
      ? ["SUSPENDED", "LEFT_COMPANY"]
      : status === "ARCHIVED"
        ? []
        : ["ACTIVE", "ARCHIVED"];
  const triggerClass =
    "min-h-11 rounded-lg border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-800";
  return (
    <CompactCard title="Manage work history">
      <div className="flex flex-wrap gap-2 p-4">
        {statuses.length ? (
          <Sheet>
            <SheetTrigger className={triggerClass}>Change status</SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Change employment status</SheetTitle>
                <SheetDescription>
                  This creates an effective-dated employment record.
                </SheetDescription>
              </SheetHeader>
              <ManagedForm
                className="px-4"
                action={changeWorkerEmploymentAction.bind(null, workerId)}
                submitLabel="Save status"
              >
                <label className="grid gap-2 text-sm font-medium">
                  New status
                  <select
                    name="status"
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  >
                    {statuses.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Effective date
                  <input
                    required
                    max={today}
                    defaultValue={today}
                    name="startsOn"
                    type="date"
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Reason
                  <input
                    name="reason"
                    maxLength={500}
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  />
                </label>
              </ManagedForm>
            </SheetContent>
          </Sheet>
        ) : null}
        {status === "ACTIVE" ? (
          <Sheet>
            <SheetTrigger className={triggerClass}>
              Transfer / assign
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Transfer or assign</SheetTitle>
                <SheetDescription>
                  Changes project access from the effective date.
                </SheetDescription>
              </SheetHeader>
              <ManagedForm
                className="px-4"
                action={transferWorkerAction.bind(null, workerId)}
                submitLabel="Save assignment"
              >
                <label className="grid gap-2 text-sm font-medium">
                  Project
                  <select
                    name="projectId"
                    defaultValue={currentProjectId}
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  >
                    <option value="">Awaiting assignment</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Effective date
                  <input
                    required
                    max={today}
                    defaultValue={today}
                    name="startsOn"
                    type="date"
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  />
                </label>
              </ManagedForm>
            </SheetContent>
          </Sheet>
        ) : null}
        {status !== "ARCHIVED" ? (
          <Sheet>
            <SheetTrigger className={triggerClass}>Add rate</SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Add hourly rate</SheetTitle>
                <SheetDescription>
                  Earlier rates remain available to payroll history.
                </SheetDescription>
              </SheetHeader>
              <ManagedForm
                className="px-4"
                action={changeWorkerRateAction.bind(null, workerId)}
                submitLabel="Save rate"
              >
                <label className="grid gap-2 text-sm font-medium">
                  Hourly rate (MYR)
                  <input
                    required
                    min="0.01"
                    step="0.01"
                    defaultValue={(currentRate / 100).toFixed(2)}
                    name="hourlyRate"
                    inputMode="decimal"
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Effective date
                  <input
                    required
                    defaultValue={today}
                    name="startsOn"
                    type="date"
                    className="min-h-11 rounded-lg border border-slate-300 px-3"
                  />
                </label>
              </ManagedForm>
            </SheetContent>
          </Sheet>
        ) : (
          <p className="text-sm text-slate-500">
            Archived workers are read-only.
          </p>
        )}
      </div>
    </CompactCard>
  );
}

async function OverviewAttendance({
  workerId,
  month,
}: {
  workerId: string;
  month: string;
}) {
  const attendance = await getWorkerAttendanceMonth(workerId, month);
  return (
    <CompactCard title="Recent attendance">
      <div className="divide-y divide-slate-100">
        {attendance.rows.slice(0, 4).map((row) => (
          <div
            key={`${row.projectId}:${row.date}`}
            className="flex justify-between gap-3 px-4 py-3 text-sm"
          >
            <span>
              {formatDate(row.date)} · {row.projectName}
            </span>
            <span>{row.leaveTypeName ?? minutes(row.totalMinutes)}</span>
          </div>
        ))}
        {attendance.rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No recent attendance.</p>
        ) : null}
      </div>
    </CompactCard>
  );
}
