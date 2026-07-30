import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectForm } from "@/components/phase2/project-form";
import type { ActionState } from "@/lib/phase2/validation";

async function action(): Promise<ActionState> {
  return { message: "", status: "success" };
}

describe("ProjectForm", () => {
  it("shows one guided section at a time without removing its fields", () => {
    render(<ProjectForm action={action} submitLabel="Create project" />);

    expect(
      screen.getByRole("heading", { name: "Project details" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Schedule and notes",
        hidden: true,
      }),
    ).not.toBeVisible();
    expect(screen.queryByRole("button", { name: "Create project" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      screen.getByRole("heading", { name: "Schedule and notes" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Create project" }),
    ).toBeVisible();
    expect(document.querySelector('input[name="name"]')).toBeInTheDocument();
  });
});
