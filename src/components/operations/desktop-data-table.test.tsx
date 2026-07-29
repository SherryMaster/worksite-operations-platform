import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { afterEach, describe, expect, it } from "vitest";

import { DesktopDataTable } from "@/components/operations/desktop-data-table";

type ScaleRow = {
  name: string;
  workerNumber: number;
};

const columns: ColumnDef<ScaleRow>[] = [
  { accessorKey: "name", header: "Worker" },
  { accessorKey: "workerNumber", header: "Number" },
];

afterEach(cleanup);

describe("DesktopDataTable", () => {
  it("renders a 50-row server page and sorts the visible page", () => {
    const data = Array.from({ length: 50 }, (_, index) => ({
      name: `Worker ${String(50 - index).padStart(2, "0")}`,
      workerNumber: 50 - index,
    }));

    render(<DesktopDataTable columns={columns} data={data} />);

    expect(screen.getAllByRole("row")).toHaveLength(51);
    fireEvent.click(screen.getByRole("button", { name: /Number/ }));
    fireEvent.click(screen.getByRole("button", { name: /Number/ }));
    const firstDataRow = screen.getAllByRole("row")[1];
    expect(firstDataRow).toHaveTextContent("Worker 01");
  });

  it("lets report users choose the columns they need", () => {
    render(
      <DesktopDataTable
        columns={columns}
        data={[{ name: "Worker 01", workerNumber: 1 }]}
        enableColumnVisibility
      />,
    );

    fireEvent.click(screen.getByText("Columns"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Number" }));

    expect(
      screen.queryByRole("columnheader", { name: /Number/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Worker 01")).toBeInTheDocument();
  });
});
