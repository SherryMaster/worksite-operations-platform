"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import type { AttendanceMonitorProject } from "@/lib/phase4/attendance-monitor-types";
import { malaysiaDate } from "@/lib/phase4/attendance-monitor";
import { cn } from "@/lib/utils";

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return malaysiaDate(date);
}

function hrefFor({
  basePath,
  date,
  month,
  projectId,
  view,
}: {
  basePath: string;
  date: string;
  month: string;
  projectId?: string;
  view: "day" | "month";
}) {
  const params = new URLSearchParams();
  params.set("view", view === "month" ? "month" : "day");
  if (view === "day") params.set("date", date);
  else params.set("month", month);
  if (projectId) params.set("project", projectId);
  return `${basePath}?${params.toString()}`;
}

export function AttendanceMonitorControls({
  basePath,
  date,
  month,
  projectId,
  projects,
  role,
  today,
  view,
}: {
  basePath: string;
  date: string;
  month: string;
  projectId?: string;
  projects: AttendanceMonitorProject[];
  role: "CEO" | "FOREMAN";
  today: string;
  view: "day" | "month";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (next: string) => startTransition(() => router.push(next));
  const fixedProject =
    projects.find((project) => project.id === projectId) ?? projects[0];

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-2.5 sm:p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 lg:w-fit">
          <Link
            href={hrefFor({ basePath, date, month, projectId, view: "day" })}
            aria-current={view === "day" ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold",
              view === "day"
                ? "bg-white text-violet-800 shadow-sm"
                : "text-slate-600",
            )}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Daily monitor
          </Link>
          <Link
            href={hrefFor({ basePath, date, month, projectId, view: "month" })}
            aria-current={view === "month" ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold",
              view === "month"
                ? "bg-white text-violet-800 shadow-sm"
                : "text-slate-600",
            )}
          >
            <Clock3 className="size-4" aria-hidden="true" />
            Records
          </Link>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {view === "day" ? (
            <div className="flex items-center gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-[2.75rem_1fr_2.75rem] items-center overflow-hidden rounded-lg border border-slate-200">
                <Link
                  href={hrefFor({
                    basePath,
                    date: shiftDate(date, -1),
                    month,
                    projectId,
                    view,
                  })}
                  aria-label="Previous attendance date"
                  className="grid min-h-11 place-items-center border-r border-slate-200 hover:bg-slate-50"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Link>
                <label className="min-w-0">
                  <span className="sr-only">Attendance date</span>
                  <input
                    type="date"
                    value={date}
                    max={today}
                    onChange={(event) =>
                      navigate(
                        hrefFor({
                          basePath,
                          date: event.target.value,
                          month,
                          projectId,
                          view,
                        }),
                      )
                    }
                    className="h-11 w-full min-w-0 border-0 px-2 text-center text-sm font-semibold tabular-nums outline-none"
                  />
                </label>
                {date < today ? (
                  <Link
                    href={hrefFor({
                      basePath,
                      date: shiftDate(date, 1),
                      month,
                      projectId,
                      view,
                    })}
                    aria-label="Next attendance date"
                    className="grid min-h-11 place-items-center border-l border-slate-200 hover:bg-slate-50"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <span
                    aria-label="Next date unavailable"
                    className="grid min-h-11 place-items-center border-l border-slate-200 text-slate-300"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </span>
                )}
              </div>
              {date !== today ? (
                <Link
                  href={hrefFor({
                    basePath,
                    date: today,
                    month,
                    projectId,
                    view,
                  })}
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-violet-700"
                >
                  Today
                </Link>
              ) : null}
            </div>
          ) : (
            <label className="text-xs font-semibold text-slate-600">
              <span className="sr-only">Records month</span>
              <input
                type="month"
                value={month}
                max={today.slice(0, 7)}
                onChange={(event) =>
                  navigate(
                    hrefFor({
                      basePath,
                      date,
                      month: event.target.value,
                      projectId,
                      view,
                    }),
                  )
                }
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold tabular-nums"
              />
            </label>
          )}

          {role === "CEO" ? (
            <label className="min-w-0 sm:min-w-56">
              <span className="sr-only">Project scope</span>
              <select
                value={projectId ?? "all"}
                onChange={(event) =>
                  navigate(
                    hrefFor({
                      basePath,
                      date,
                      month,
                      projectId:
                        event.target.value === "all"
                          ? undefined
                          : event.target.value,
                      view,
                    }),
                  )
                }
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
              >
                <option value="all">
                  {view === "day"
                    ? "All active projects"
                    : "All authorized projects"}
                </option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
              {fixedProject?.name ?? "No assigned project"}
            </div>
          )}
        </div>
      </div>
      {pending ? (
        <p role="status" className="mt-2 text-xs font-medium text-violet-700">
          Updating attendance…
        </p>
      ) : null}
    </div>
  );
}
