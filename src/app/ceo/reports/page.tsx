import { Suspense } from "react";

import {
  DirectoryToolbarSkeleton,
  ListResultsSkeleton,
} from "@/components/operations/loading-skeletons";
import { PageHeader } from "@/components/operations/page-header";
import { ReportCenter } from "@/components/phase7/report-center";

export default async function CeoReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const resultsKey = [
    "report",
    "projectId",
    "workerId",
    "date",
    "month",
    "dateFrom",
    "dateTo",
    "status",
    "query",
    "page",
  ]
    .map((key) => {
      const value = params[key];
      return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
    })
    .join("|");

  return (
    <main>
      <PageHeader
        title="Reports"
        description="Browse predefined operational reports and export the filtered results."
      />
      <Suspense fallback={<DirectoryToolbarSkeleton filters={4} />}>
        <ReportCenter part="toolbar" role="CEO" searchParams={params} />
      </Suspense>
      <Suspense
        key={resultsKey}
        fallback={<ListResultsSkeleton columns={6} rows={8} />}
      >
        <ReportCenter part="results" role="CEO" searchParams={params} />
      </Suspense>
    </main>
  );
}
