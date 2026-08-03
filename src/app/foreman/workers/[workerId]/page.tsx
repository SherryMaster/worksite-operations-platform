import { ChevronLeft, Phone } from "lucide-react";
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
import { formatDate, malaysiaDateInputValue } from "@/lib/phase2/format";
import {
  getWorkerCore,
  getWorkerForSection,
  getWorkerIdentity,
} from "@/lib/phase3/data";
import { maskIdentifier } from "@/lib/phase3/format";
import { getWorkerAttendanceMonth } from "@/lib/phase4/data";
import { listLeaveRequests } from "@/lib/phase5/data";

const sections = [
  { label: "Overview", value: "overview" },
  { label: "Documents", value: "documents" },
  { label: "Attendance", value: "attendance" },
  { label: "Leave", value: "leave" },
];

export default async function ForemanWorkerPage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<{ month?: string; section?: string; tab?: string }>;
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
        href="/foreman/workers"
        className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-600"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Workers
      </Link>
      <Suspense fallback={<ProfileHeaderSkeleton compact />}>
        <Header workerPromise={corePromise} section={section} />
      </Suspense>
      <Suspense
        key={`${section}:${query.month ?? ""}`}
        fallback={<WorkerSectionSkeleton section={section} />}
      >
        <Content
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
      <WorkerProfileHeader canEdit={false} worker={worker} />
      <WorkerSectionPicker
        active={section}
        basePath={`/foreman/workers/${worker.id}`}
        sections={sections}
      />
    </>
  );
}

function minutes(value: number) {
  return `${Math.floor(value / 60)}h ${value % 60}m`;
}

async function Content({
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
  if (section === "leave") {
    const leave = await listLeaveRequests({ workerId });
    return (
      <div className="mt-4">
        <CompactCard title="Leave">
          <div className="divide-y divide-slate-100">
            {leave.length ? (
              leave.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto]"
                >
                  <span>{item.leaveTypeName}</span>
                  <span>
                    {formatDate(item.starts_on)} – {formatDate(item.ends_on)}
                  </span>
                  <span className="font-medium">{item.status}</span>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">
                No leave records for this project.
              </p>
            )}
          </div>
        </CompactCard>
      </div>
    );
  }
  if (section === "attendance") {
    const selectedMonth = /^\d{4}-\d{2}$/.test(month ?? "")
      ? month!
      : malaysiaDateInputValue().slice(0, 7);
    const attendance = await getWorkerAttendanceMonth(workerId, selectedMonth);
    return (
      <div className="mt-4 grid gap-4">
        <form className="flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <input type="hidden" name="section" value="attendance" />
          <label className="text-sm font-medium">
            Month
            <input
              className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-3"
              type="month"
              name="month"
              defaultValue={selectedMonth}
            />
          </label>
          <button className="min-h-11 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white">
            View
          </button>
        </form>
        <CompactCard title="Project attendance">
          <div className="divide-y divide-slate-100">
            {attendance.rows.length ? (
              attendance.rows.map((row) => (
                <div
                  key={`${row.projectId}:${row.date}`}
                  className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[8rem_1fr_auto]"
                >
                  <span>{formatDate(row.date)}</span>
                  <span>{row.projectName}</span>
                  <span>{row.leaveTypeName ?? minutes(row.totalMinutes)}</span>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">
                No attendance for this month.
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
        <CompactCard title="Documents">
          <WorkerDocumentList canManage={false} worker={worker} />
        </CompactCard>
      </div>
    );
  return (
    <div className="mt-4 grid gap-4">
      <CompactCard title="Worker information">
        <InfoRows
          rows={[
            [
              "Phone",
              <a
                key="phone"
                className="inline-flex min-h-11 items-center gap-2 text-violet-800"
                href={`tel:${worker.phone_number}`}
              >
                <Phone className="size-4" />
                {worker.phone_number}
              </a>,
            ],
            ["Nationality", worker.nationality ?? "Not recorded"],
            ["Identifier", maskIdentifier(worker.primaryIdentifier?.number)],
            ["Address", worker.address ?? "Not recorded"],
            ["Project", worker.projectName ?? "Not assigned"],
            ["Trade", worker.tradeName ?? "Not recorded"],
            ["Skill", worker.skillName ?? "Not recorded"],
          ]}
        />
      </CompactCard>
    </div>
  );
}
