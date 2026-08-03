import { Check } from "lucide-react";

import { workerFormStages } from "@/components/phase3/worker-record-form/helpers";

export function WorkerRecordStepper({ stage }: { stage: number }) {
  return (
    <nav
      aria-label="Worker record progress"
      className="rounded-xl border border-slate-200 bg-white px-3 py-4 sm:px-5"
    >
      <ol className="flex items-center justify-center sm:grid sm:grid-cols-5">
        {workerFormStages.map((item, index) => {
          const complete = index < stage;
          const active = index === stage;
          return (
            <li
              key={item.label}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 items-center sm:border-r sm:px-4 sm:last:border-0"
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                  complete
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : active
                      ? "border-violet-700 bg-violet-700 text-white"
                      : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {complete ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              {index < workerFormStages.length - 1 ? (
                <span
                  className="mx-1 h-px w-5 bg-slate-200 sm:hidden"
                  aria-hidden="true"
                />
              ) : null}
              <span className="ml-3 hidden min-w-0 sm:block">
                <span
                  className={`block text-xs font-semibold ${active ? "text-slate-950" : "text-slate-500"}`}
                >
                  {item.label}
                </span>
                <span className="mt-1 block truncate text-[10px] text-slate-500">
                  {item.description}
                </span>
              </span>
              <span className="sr-only">
                {item.label}
                {complete ? ", complete" : active ? ", current" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
