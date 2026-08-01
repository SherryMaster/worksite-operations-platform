import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AttendanceSyncIssues } from "@/components/phase4/attendance-sync-issues";
import type {
  AttendanceQueueAction,
  AttendanceSnapshot,
} from "@/lib/phase4/types";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const PROJECT = "41000000-0000-0000-0000-000000000001";
const WORKER = "42000000-0000-0000-0000-000000000001";
const WORK_DATE = "2026-07-20";

function reviewAction(
  overrides: Partial<AttendanceQueueAction> & {
    actionType: AttendanceQueueAction["actionType"];
    clientActionId: string;
    serverStatus: "CONFLICT" | "FAILED";
  },
): AttendanceQueueAction {
  return {
    createdAt: overrides.createdAt ?? "2026-07-20T08:00:00+08:00",
    issueKind: null,
    lastAttemptAt: overrides.lastAttemptAt ?? "2026-07-20T08:00:05+08:00",
    message: overrides.message ?? "Server rejected the action.",
    payload: overrides.payload ?? {},
    projectId: PROJECT,
    state: "REVIEW_REQUIRED",
    workDate: WORK_DATE,
    workerId: WORKER,
    ...overrides,
  };
}

const snapshot: AttendanceSnapshot = {
  dayType: "NORMAL",
  projectId: PROJECT,
  projectName: "Project",
  sessions: [
    {
      breaks: [],
      enteredAt: "2026-07-20T08:40:16+08:00",
      exitedAt: "2026-07-20T08:40:34+08:00",
      id: "session-1",
      workerId: WORKER,
    },
  ],
  updatedAt: "2026-07-20T00:00:00.000Z",
  workDate: WORK_DATE,
  workers: [
    {
      id: WORKER,
      legalName: "Worker A",
      skillName: null,
      tradeName: null,
    },
  ],
};

describe("AttendanceSyncIssues drawer", () => {
  it("renders only one close control when opened", () => {
    const failedCorrection = reviewAction({
      actionType: "CORRECT_DAY",
      clientActionId: "correct-failed",
      createdAt: "2026-07-20T18:00:00+08:00",
      message: "The corrected times overlap or contain an invalid interval.",
      payload: {
        sessions: [
          {
            breaks: [],
            enteredAt: "2026-07-20T08:40:00+08:00",
            exitedAt: "2026-07-20T08:40:00+08:00",
            id: "session-1",
          },
        ],
      },
      serverStatus: "FAILED",
    });
    render(
      <AttendanceSyncIssues
        open
        onClose={vi.fn()}
        onDiscard={vi.fn()}
        onRetry={vi.fn()}
        onReview={vi.fn()}
        projectActions={[failedCorrection]}
        retryableActionIds={[]}
        snapshot={snapshot}
      />,
    );
    const drawer = screen.getByRole("dialog");
    const closeButtons = within(drawer).getAllByRole("button", {
      name: /close sync issues/i,
    });
    expect(closeButtons).toHaveLength(1);
  });

  it("shows the saved sub-minute server session and the attempted zero-length correction", () => {
    const failedCorrection = reviewAction({
      actionType: "CORRECT_DAY",
      clientActionId: "correct-failed",
      createdAt: "2026-07-20T18:00:00+08:00",
      message: "The corrected times overlap or contain an invalid interval.",
      payload: {
        sessions: [
          {
            breaks: [],
            enteredAt: "2026-07-20T08:40:00+08:00",
            exitedAt: "2026-07-20T08:40:00+08:00",
            id: "session-1",
          },
        ],
      },
      serverStatus: "FAILED",
    });
    render(
      <AttendanceSyncIssues
        open
        onClose={vi.fn()}
        onDiscard={vi.fn()}
        onRetry={vi.fn()}
        onReview={vi.fn()}
        projectActions={[failedCorrection]}
        retryableActionIds={[]}
        snapshot={snapshot}
      />,
    );
    const drawer = screen.getByRole("dialog");
    expect(
      within(drawer).getAllByText("Invalid correction").length,
    ).toBeGreaterThan(0);
    expect(
      within(drawer).getAllByText("Session 1 ends at the same time it starts.")
        .length,
    ).toBeGreaterThan(0);
    // The server record preserves seconds for the sub-minute session
    // and labels the open exit so it is never repeated as the entry.
    expect(within(drawer).getByText(/08:40:16/)).toBeInTheDocument();
    expect(within(drawer).getByText(/08:40:34/)).toBeInTheDocument();
  });

  it("does not show a Pending tab when there are no pending actions", () => {
    const failed = reviewAction({
      actionType: "CORRECT_DAY",
      clientActionId: "correct-failed",
      serverStatus: "FAILED",
    });
    render(
      <AttendanceSyncIssues
        open
        onClose={vi.fn()}
        onDiscard={vi.fn()}
        onRetry={vi.fn()}
        onReview={vi.fn()}
        projectActions={[failed]}
        retryableActionIds={[]}
        snapshot={snapshot}
      />,
    );
    const drawer = screen.getByRole("dialog");
    expect(
      within(drawer).queryByText(/Pending\s*·\s*0/i),
    ).not.toBeInTheDocument();
  });

  it("labels the primary review action as Correct attendance, not Review attendance", () => {
    const failed = reviewAction({
      actionType: "CORRECT_DAY",
      clientActionId: "correct-failed",
      serverStatus: "FAILED",
    });
    render(
      <AttendanceSyncIssues
        open
        onClose={vi.fn()}
        onDiscard={vi.fn()}
        onRetry={vi.fn()}
        onReview={vi.fn()}
        projectActions={[failed]}
        retryableActionIds={[]}
        snapshot={snapshot}
      />,
    );
    const drawer = screen.getByRole("dialog");
    expect(
      within(drawer).getByRole("button", { name: "Correct attendance" }),
    ).toBeInTheDocument();
    expect(
      within(drawer).queryByRole("button", { name: "Review attendance" }),
    ).not.toBeInTheDocument();
  });

  it("calls onReview with the group when the primary action is pressed", async () => {
    const user = userEvent.setup();
    const failed = reviewAction({
      actionType: "CORRECT_DAY",
      clientActionId: "correct-failed",
      serverStatus: "FAILED",
    });
    const onReview = vi.fn();
    render(
      <AttendanceSyncIssues
        open
        onClose={vi.fn()}
        onDiscard={vi.fn()}
        onRetry={vi.fn()}
        onReview={onReview}
        projectActions={[failed]}
        retryableActionIds={[]}
        snapshot={snapshot}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Correct attendance" }),
    );
    expect(onReview).toHaveBeenCalledTimes(1);
  });
});
