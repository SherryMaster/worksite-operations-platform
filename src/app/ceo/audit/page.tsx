import { ClipboardClock, Filter, ShieldCheck } from "lucide-react";

import { formatDateTime, maskEmail } from "@/lib/phase2/format";
import { getAuditEntries } from "@/lib/phase2/data";
import type { Json } from "@/types/database";

const internalFields = new Set([
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "ended_by",
  "actor_user_id",
  "clerk_user_id",
]);

function asRecord(value: Json | null): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function valueLabel(key: string, value: Json | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (key.toLowerCase().includes("email") && typeof value === "string") {
    return maskEmail(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fieldLabel(key: string) {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function AuditChanges({
  after,
  before,
}: {
  after: Json | null;
  before: Json | null;
}) {
  const previous = asRecord(before);
  const current = asRecord(after);
  const keys = [...new Set([...Object.keys(previous), ...Object.keys(current)])]
    .filter((key) => !internalFields.has(key))
    .filter(
      (key) => JSON.stringify(previous[key]) !== JSON.stringify(current[key]),
    );

  if (keys.length === 0) {
    return <p className="text-xs text-stone-500">No field values recorded.</p>;
  }

  return (
    <dl className="mt-3 grid gap-3">
      {keys.map((key) => (
        <div
          key={key}
          className="grid gap-1 border-l-2 border-stone-200 pl-3 sm:grid-cols-[9rem_1fr]"
        >
          <dt className="text-xs font-semibold text-stone-500">
            {fieldLabel(key)}
          </dt>
          <dd className="text-xs text-stone-700">
            {before ? `${valueLabel(key, previous[key])} → ` : ""}
            {valueLabel(key, current[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string;
    actor?: string;
    date?: string;
    entity?: string;
    module?: string;
  }>;
}) {
  const params = await searchParams;
  const entries = (await getAuditEntries()).filter((entry) => {
    const actor = params.actor?.trim().toLowerCase();
    const action = params.action?.trim().toLowerCase();
    const entity = params.entity?.trim().toLowerCase();
    return (
      (!params.module || entry.module === params.module) &&
      (!actor || entry.actorName.toLowerCase().includes(actor)) &&
      (!action || entry.action.toLowerCase().includes(action)) &&
      (!entity ||
        entry.entity_type.toLowerCase().includes(entity) ||
        entry.entity_id.toLowerCase().includes(entity)) &&
      (!params.date || entry.occurred_at.slice(0, 10) === params.date)
    );
  });

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="border-b border-stone-300 pb-8">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
          Immutable business history
        </p>
        <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
          Audit
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Review Phase 2 account, project, assignment, category, and company
          changes.
        </p>
      </div>

      <form
        action="/ceo/audit"
        className="mt-6 grid gap-3 border border-stone-300 bg-white p-4 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
      >
        <input
          name="actor"
          defaultValue={params.actor}
          placeholder="Actor"
          aria-label="Filter by actor"
          className="h-10 border border-stone-300 bg-stone-50 px-3 text-sm"
        />
        <input
          name="action"
          defaultValue={params.action}
          placeholder="Action"
          aria-label="Filter by action"
          className="h-10 border border-stone-300 bg-stone-50 px-3 text-sm"
        />
        <select
          name="module"
          defaultValue={params.module ?? ""}
          aria-label="Filter by module"
          className="h-10 border border-stone-300 bg-stone-50 px-3 text-sm"
        >
          <option value="">All modules</option>
          {["projects", "assignments", "users", "categories", "settings"].map(
            (module) => (
              <option key={module} value={module}>
                {fieldLabel(module)}
              </option>
            ),
          )}
        </select>
        <input
          name="entity"
          defaultValue={params.entity}
          placeholder="Entity"
          aria-label="Filter by entity"
          className="h-10 border border-stone-300 bg-stone-50 px-3 text-sm"
        />
        <input
          name="date"
          type="date"
          defaultValue={params.date}
          aria-label="Filter by date"
          className="h-10 border border-stone-300 bg-stone-50 px-3 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 bg-stone-950 px-4 text-sm font-semibold text-white"
        >
          <Filter className="size-4" aria-hidden="true" />
          Filter
        </button>
      </form>

      <section className="mt-6">
        {entries.length === 0 ? (
          <div className="border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <ClipboardClock
              className="mx-auto size-8 text-amber-700"
              aria-hidden="true"
            />
            <h2 className="mt-5 font-heading text-2xl font-semibold uppercase">
              No matching audit entries
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              Important Phase 2 changes will appear here automatically.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-stone-200 border border-stone-300 bg-white">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="grid gap-4 p-5 lg:grid-cols-[12rem_1fr_auto]"
              >
                <div>
                  <time className="text-xs text-stone-500">
                    {formatDateTime(entry.occurred_at)}
                  </time>
                  <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    {entry.source.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{entry.actorName}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {entry.action.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {entry.entity_type} · {entry.entity_id.slice(0, 18)}
                  </p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-amber-800">
                      View before and after values
                    </summary>
                    <AuditChanges
                      before={entry.before_data}
                      after={entry.after_data}
                    />
                  </details>
                </div>
                <span className="h-fit border border-stone-200 bg-stone-50 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-stone-500">
                  {entry.module}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
