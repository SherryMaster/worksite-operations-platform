import { ReportCenter } from "@/components/phase7/report-center";

export default async function ForemanReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ReportCenter role="FOREMAN" searchParams={await searchParams} />;
}
