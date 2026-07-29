"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

import { DesktopDataTable } from "@/components/operations/desktop-data-table";
import type { ReportColumn, ReportRow } from "@/lib/phase7/report-definitions";

export function ReportDesktopTable({
  columns,
  rows,
}: {
  columns: ReportColumn[];
  rows: ReportRow[];
}) {
  const tableColumns = useMemo<ColumnDef<ReportRow>[]>(
    () =>
      columns.map((column) => ({
        cell: ({ getValue }) => {
          const value = getValue();
          return value === null || value === undefined ? "—" : String(value);
        },
        header: column.label,
        id: column.key,
        accessorFn: (row) => row[column.key],
      })),
    [columns],
  );

  return (
    <DesktopDataTable
      columns={tableColumns}
      data={rows}
      enableColumnVisibility
      className="mt-4"
      emptyMessage="No rows on this page."
    />
  );
}
