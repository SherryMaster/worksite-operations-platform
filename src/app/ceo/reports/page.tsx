import { ReportCenter } from "@/components/phase7/report-center";

export default async function CeoReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ReportCenter role="CEO" searchParams={await searchParams} />;
}
