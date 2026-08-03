import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkerRecordForm } from "./form";
import type { WorkerDocumentType, WorkerFormValues } from "./types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(cleanup);

const passport = {
  created_at: "2026-08-03T00:00:00.000Z",
  created_by: "34000000-0000-4000-8000-000000000010",
  id: "34000000-0000-4000-8000-000000000001",
  name: "Passport",
  system_code: "PASSPORT",
  expects_document_number: true,
  expects_issue_date: false,
  expects_expiry_date: false,
  is_repeatable: false,
  metadata_fields: [],
  is_active: true,
  updated_at: "2026-08-03T00:00:00.000Z",
  updated_by: "34000000-0000-4000-8000-000000000010",
} satisfies WorkerDocumentType;
const values: WorkerFormValues = {
  address: "",
  documents: [
    {
      clientKey: "34000000-0000-4000-8000-000000000099",
      documentNumber: "PASS-1234",
      documentTypeId: passport.id,
      expiryDate: "",
      file: null,
      fileAction: "keep",
      hasFile: false,
      id: null,
      issueDate: "",
      metadata: {},
      originalFilename: "",
      systemCode: "PASSPORT",
    },
  ],
  foodDeduction: "0.00",
  hourlyRate: "12.00",
  legalName: "Ali Worker",
  nationality: "Pakistan",
  phoneNumber: "+60123456789",
  photoAction: "keep",
  photoFile: null,
  photoId: null,
  rateEffectiveOn: "",
  skillLevelId: "33000000-0000-4000-8000-000000000001",
  tradeId: "32000000-0000-4000-8000-000000000001",
  workerId: null,
};
const options = {
  documentTypes: [passport],
  skills: [{ id: values.skillLevelId, name: "Skilled" }],
  trades: [{ id: values.tradeId, name: "Electrician" }],
};

describe("WorkerRecordForm review submission", () => {
  it("preserves the draft through steps, enters Review without saving, and submits only on the explicit action", async () => {
    const action = vi.fn(async () => ({
      status: "error" as const,
      message: "Possible duplicate",
      duplicateWorkerId: "worker-existing",
      duplicateWorkerName: "Existing worker",
    }));
    render(
      <WorkerRecordForm
        action={action}
        mode="create"
        values={values}
        {...options}
      />,
    );
    fireEvent.change(screen.getByLabelText("Address (optional)"), {
      target: { value: "Kuala Lumpur" },
    });
    for (let index = 0; index < 4; index += 1)
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByRole("heading", { name: "Review worker details" }),
    ).toBeInTheDocument();
    const personalReview = screen
      .getByRole("heading", { name: "Personal" })
      .closest("section");
    expect(personalReview).not.toBeNull();
    expect(
      within(personalReview!).getByText("Kuala Lumpur"),
    ).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Create worker" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(
      screen.getByRole("heading", { name: "Review worker details" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: /Open possible match/ }),
    ).toHaveAttribute("href", "/ceo/workers/worker-existing");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create worker" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
  });

  it("disables Save changes when an edit has no changes", () => {
    render(
      <WorkerRecordForm
        action={vi.fn()}
        initialStage={4}
        mode="edit"
        values={{ ...values, workerId: "31000000-0000-4000-8000-000000000001" }}
        {...options}
      />,
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.getAllByText("No changes").length).toBeGreaterThan(0);
  });
});
