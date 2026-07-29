"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3 } from "lucide-react";
import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function DesktopDataTable<TData extends object>({
  columns,
  data,
  emptyMessage = "No records match this view.",
  enableColumnVisibility = false,
  className,
}: {
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyMessage?: string;
  enableColumnVisibility?: boolean;
  className?: string;
}) {
  "use no memo";

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  // TanStack Table intentionally exposes mutable table functions; React Compiler skips this boundary.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    state: { columnVisibility, sorting },
  });

  return (
    <div
      className={cn(
        "hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block",
        className,
      )}
    >
      {enableColumnVisibility ? (
        <div className="flex justify-end border-b border-slate-200 bg-white px-3 py-2">
          <details className="group relative">
            <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Columns3 className="size-4" aria-hidden="true" />
              Columns
            </summary>
            <fieldset className="absolute right-0 z-20 mt-1 min-w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
              <legend className="sr-only">Visible columns</legend>
              {table.getAllLeafColumns().map((column) => (
                <label
                  key={column.id}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                    className="size-4 accent-violet-700"
                  />
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </label>
              ))}
            </fieldset>
          </details>
        </div>
      ) : null}
      <div className="max-h-[65vh] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const sortable = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      className="h-10 whitespace-nowrap px-3 text-xs font-semibold text-slate-600"
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex min-h-8 items-center gap-1 rounded-md text-left hover:text-slate-950"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          ) : sorted === "desc" ? (
                            <ArrowDown
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronsUpDown
                              className="size-3.5 text-slate-400"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="h-12">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 py-2 text-sm">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
