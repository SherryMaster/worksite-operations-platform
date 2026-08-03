import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WorkerSectionPicker } from "./section-picker";

afterEach(cleanup);

describe("WorkerSectionPicker", () => {
  it("provides a full-width mobile picker without a horizontal tab scroller", () => {
    render(
      <WorkerSectionPicker
        active="documents"
        basePath="/ceo/workers/worker-1"
        sections={[
          { label: "Overview", value: "overview" },
          { label: "Documents", value: "documents" },
          { label: "Attendance & leave", value: "attendance-leave" },
        ]}
      />,
    );
    const trigger = screen.getByRole("button", { name: /Section Documents/i });
    expect(trigger).toHaveClass("w-full");
    fireEvent.click(trigger);
    expect(
      screen.getByRole("navigation", { name: "Choose worker section" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Attendance & leave/ }),
    ).toHaveAttribute("href", "/ceo/workers/worker-1?section=attendance-leave");
  });
});
