import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AttendanceWorkspace } from "@/components/phase4/attendance-workspace";
import * as offlineStore from "@/lib/phase4/offline-store";
import type {
  AttendanceQueueAction,
  AttendanceSnapshot,
} from "@/lib/phase4/types";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

afterEach(cleanup);

const PROJECT = "41000000-0000-0000-0000-000000000001";
const WORKER = "42000000-0000-0000-0000-000000000001";
const WORK_DATE = "2026-07-20";
const SESSION_ID = "44000000-0000-0000-0000-000000000001";

const baseSnapshot: AttendanceSnapshot = {
  dayType: "NORMAL",
  projectId: PROJECT,
  projectName: "Project",
  sessions: [
    {
      breaks: [],
      enteredAt: `${WORK_DATE}T08:00:00+08:00`,
      exitedAt: `${WORK_DATE}T17:00:00+08:00`,
      id: SESSION_ID,
      workerId: WORKER,
    },
  ],
  updatedAt: `${WORK_DATE}T00:00:00.000Z`,
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

function mockIndexedDb() {
  const snapshotStore = new Map<string, AttendanceSnapshot>();
  const actionStore = new Map<string, AttendanceQueueAction>();
  vi.spyOn(offlineStore, "saveAttendanceSnapshot").mockImplementation(
    async (snapshot) => {
      snapshotStore.set(`${snapshot.projectId}:${snapshot.workDate}`, snapshot);
    },
  );
  vi.spyOn(offlineStore, "saveAttendanceAction").mockImplementation(
    async (action) => {
      actionStore.set(action.clientActionId, action);
    },
  );
  vi.spyOn(offlineStore, "listAttendanceActions").mockImplementation(async () =>
    Array.from(actionStore.values()),
  );
  return { actionStore, snapshotStore };
}

beforeEach(() => {
  // The workspace calls `synchronize` when the device is online, but
  // this test focuses on the correction save gate so we keep every
  // network call out of scope.
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: false,
  });
});

describe("AttendanceWorkspace correction save gate", () => {
  it("does not enqueue a correction and focuses the reason field when the reason is empty", async () => {
    const { actionStore } = mockIndexedDb();
    const user = userEvent.setup();

    render(<AttendanceWorkspace initialSnapshot={baseSnapshot} />);

    // Open the production correction editor.
    await screen.findByText("Worker A");
    // The summary element has `aria-label` but `summary` is not
    // promoted to role="button" by jsdom; query it directly by
    // aria-label and click via mouseDown/click user events.
    const more = await screen.findByLabelText(
      /more attendance actions for worker a/i,
    );
    await user.click(more);
    const correctTimes = await screen.findByRole("button", {
      name: /correct times/i,
    });
    await user.click(correctTimes);

    // Force the editor into a state where canSubmit is false by leaving
    // the reason empty. The real CorrectionPanel still has the default
    // session, which is valid, so the empty reason is the only blocker.
    const save = await screen.findByRole("button", {
      name: /save correction/i,
    });
    await user.click(save);

    expect(actionStore.size).toBe(0);
    const dialog = await screen.findByRole("dialog", {
      name: /correct attendance/i,
    });
    expect(
      within(dialog).getByText(
        "Add a reason of at least 3 characters so the audit history is useful.",
      ),
    ).toBeInTheDocument();
    expect(document.activeElement?.tagName).toBe("TEXTAREA");
  });

  it("does not enqueue a correction when the reason is too short", async () => {
    const { actionStore } = mockIndexedDb();
    const user = userEvent.setup();

    render(<AttendanceWorkspace initialSnapshot={baseSnapshot} />);

    const more = await screen.findByLabelText(
      /more attendance actions for worker a/i,
    );
    await user.click(more);
    await user.click(
      await screen.findByRole("button", { name: /correct times/i }),
    );

    // Reason is required and must be at least 3 characters; provide
    // a 2-character value so `canSubmit` is false purely because of
    // the reason gate.
    const dialog = await screen.findByRole("dialog", {
      name: /correct attendance/i,
    });
    const reason = within(dialog).getByRole("textbox", { name: /reason/i });
    await user.type(reason, "ab");

    const save = within(dialog).getByRole("button", {
      name: /save correction/i,
    });
    await user.click(save);

    expect(actionStore.size).toBe(0);
    expect(
      within(dialog).getByText(
        "Add a reason of at least 3 characters so the audit history is useful.",
      ),
    ).toBeInTheDocument();
  });
});
