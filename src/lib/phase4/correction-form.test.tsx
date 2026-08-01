import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { validateCorrectionSessions } from "@/lib/phase4/sync-issues";

afterEach(cleanup);

/**
 * A minimal harness that mirrors the submit logic of the real
 * `CorrectionPanel`: validate, then enqueue. We test the harness
 * because `CorrectionPanel` is a private component inside
 * `attendance-workspace.tsx` and the AGENTS guidance discourages
 * duplicating or extracting it solely for tests.
 */
function CorrectionFormHarness({
  onSave,
  workDate,
}: {
  onSave: () => void;
  workDate: string;
}) {
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
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const problems = validateCorrectionSessions(editable, workDate);
  const noteTrimmedLength = note.trim().length;
  const noteError = attempted && noteTrimmedLength < 3;
  const canSubmit = problems.length === 0 && noteTrimmedLength >= 3;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setAttempted(true);
        if (!canSubmit) {
          if (problems.length === 0) {
            noteRef.current?.focus();
          }
          return;
        }
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
          ref={noteRef}
          aria-invalid={noteError || undefined}
          aria-describedby={noteError ? "note-error" : undefined}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {noteError ? (
        <p id="note-error" role="alert">
          Add a reason of at least 3 characters so the audit history is useful.
        </p>
      ) : null}
      {attempted && problems.length > 0 ? (
        <p role="alert">{problems[0]?.message}</p>
      ) : null}
      <button type="submit">Save correction</button>
    </form>
  );
}

/**
 * A second harness for the reason-only path: sessions are valid so
 * the form must focus the empty reason textarea on submit and never
 * call onSave.
 */
function ReasonOnlyHarness({ onSave }: { onSave: () => void }) {
  const [editable] = useState([
    {
      breaks: [],
      enteredAt: "2026-07-20T08:00:00",
      exitedAt: "2026-07-20T17:00:00",
      key: "s1",
    },
  ]);
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const problems = validateCorrectionSessions(editable, "2026-07-20");
  const noteTrimmedLength = note.trim().length;
  const noteError = attempted && noteTrimmedLength < 3;
  const canSubmit = problems.length === 0 && noteTrimmedLength >= 3;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setAttempted(true);
        if (!canSubmit) {
          if (problems.length === 0) {
            noteRef.current?.focus();
          }
          return;
        }
        onSave();
      }}
    >
      <textarea
        ref={noteRef}
        aria-label="Reason for correction"
        aria-invalid={noteError || undefined}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      {noteError ? (
        <p role="alert">
          Add a reason of at least 3 characters so the audit history is useful.
        </p>
      ) : null}
      <button type="submit">Save correction</button>
    </form>
  );
}

describe("correction form submit gate", () => {
  it("does not call onSave when the sessions are invalid", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const view = render(
      <CorrectionFormHarness onSave={onSave} workDate="2026-07-20" />,
    );
    await user.click(view.getByRole("button", { name: "Save correction" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      view.getByText("Session 1 ends at the same time it starts."),
    ).toBeInTheDocument();
  });

  it("does not call onSave and focuses the reason when the reason is empty", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const view = render(<ReasonOnlyHarness onSave={onSave} />);
    const textarea = view.getByLabelText(
      "Reason for correction",
    ) as HTMLTextAreaElement;
    await user.click(view.getByRole("button", { name: "Save correction" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(
      view.getByText(
        "Add a reason of at least 3 characters so the audit history is useful.",
      ),
    ).toBeInTheDocument();
    expect(document.activeElement).toBe(textarea);
  });
});
