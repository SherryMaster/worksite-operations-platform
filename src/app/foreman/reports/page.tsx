import { Suspense } from "react";

import { ReportContentSkeleton } from "@/components/operations/loading-skeletons";
import { PageHeader } from "@/components/operations/page-header";
import { ReportCenter } from "@/components/phase7/report-center";

export default async function ForemanReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <main>
      <PageHeader
        title="Reports"
        description="Browse predefined operational reports and export the filtered results."
      />
      <Suspense
        key={JSON.stringify(params)}
        fallback={<ReportContentSkeleton />}
      >
        <ReportCenter role="FOREMAN" searchParams={params} />
      </Suspense>
    </main>
  );
}
