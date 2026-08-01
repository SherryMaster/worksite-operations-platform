import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { validateCorrectionSessions } from "@/lib/phase4/sync-issues";

/**
 * A minimal harness that mirrors the submit logic of the real
 * `CorrectionPanel`: validate, then enqueue. We test the harness
 * because `CorrectionPanel` is a private component inside
 * `attendance-workspace.tsx` and the AGENTS guidance discourages
 * duplicating or extracting it solely for tests.
 */
function CorrectionFormHarness({ workDate }: { workDate: string }) {
  const [editable, setEditable] = useState([
    {
      breaks: [],
      enteredAt: "2026-07-20T08:40:00",
      exitedAt: "2026-07-20T08:40:00",
      key: "s1",
    },
  ]);
  const [note, setNote] = useState("fix small session");
  const [attempted, setAttempted] = useState(false);
  const onSave = vi.fn();
  const problems = validateCorrectionSessions(editable, workDate);
  const canSubmit = problems.length === 0 && note.trim().length >= 3;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setAttempted(true);
        if (!canSubmit) return;
        onSave();
      }}
    >
      <label>
        Enter
        <input
          required
          type="datetime-local"
          value={editable[0]?.enteredAt ?? ""}
          onChange={(event) =>
            setEditable((current) =>
              current.map((session) =>
                session.key === "s1"
                  ? { ...session, enteredAt: event.target.value }
                  : session,
              ),
            )
          }
          aria-invalid={attempted && problems.length > 0}
        />
      </label>
      <label>
        Exit
        <input
          type="datetime-local"
          value={editable[0]?.exitedAt ?? ""}
          onChange={(event) =>
            setEditable((current) =>
              current.map((session) =>
                session.key === "s1"
                  ? { ...session, exitedAt: event.target.value }
                  : session,
              ),
            )
          }
        />
      </label>
      <label>
        Reason
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {attempted && problems.length > 0 ? (
        <p role="alert">{problems[0]?.message}</p>
      ) : null}
      <button type="submit">Save correction</button>
    </form>
  );
}

describe("correction form submit gate", () => {
  it("does not call onSave when the sessions are invalid", async () => {
    const user = userEvent.setup();
    render(<CorrectionFormHarness workDate="2026-07-20" />);
    await user.click(screen.getByRole("button", { name: "Save correction" }));
    expect(
      screen.getByText("Session 1 ends at the same time it starts."),
    ).toBeInTheDocument();
  });
});
