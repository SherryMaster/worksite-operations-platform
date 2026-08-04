import type {
  AttendanceActionType,
  AttendanceIssueKind,
  AttendanceQueueAction,
  AttendanceSnapshot,
} from "@/lib/phase4/types";

/**
 * Heuristics used to interpret a server-returned message and assign a
 * stable issue kind. Centralized here so the same words are recognized
 * whether the action comes from a fresh sync, a legacy IndexedDB row, or
 * a discarded load.
 */
const AUTHORIZATION_PHRASES = [
  "sign in again",
  "no longer have permission",
  "attendance access",
  "action identifier belongs to another user",
  "foreman",
  "another project",
];

const DEPENDENCY_PHRASES = [
  "session could not be found",
  "session not found",
  "open work session",
  "open break could not be found",
  "open break not found",
  "break can only start",
  "end the open break",
];

const VALIDATION_PHRASES = [
  "already exited",
  "invalid interval",
  "overlap",
  "conflicts with the current attendance",
  "inactive",
  "not active on this project",
  "active application user",
  "an active application user",
  "correction reason is required",
  "corrected times",
  "unsupported attendance action",
];

const STORAGE_PHRASES = [
  "this device",
  "device storage",
  "saved on this device",
];

const UNKNOWN_PHRASES = [
  "no server response",
  "server could not process",
  "invalid attendance response",
  "temporarily busy",
];

/**
 * Stable, plain-English reason a Foreman or CEO can act on without
 * reading a technical message. Derived from the server message and the
 * action type so two errors with different wording still surface
 * consistent copy.
 */
export function classifyIssue(
  action: AttendanceQueueAction,
): AttendanceIssueKind {
  const message = (action.message ?? "").toLowerCase();
  const status = action.serverStatus;

  if (status === "CONFLICT") {
    if (
      DEPENDENCY_PHRASES.some((phrase) => message.includes(phrase)) &&
      isDependentAction(action.actionType)
    ) {
      return "DEPENDENCY";
    }
    if (VALIDATION_PHRASES.some((phrase) => message.includes(phrase))) {
      return "VALIDATION";
    }
    return "CONFLICT";
  }

  if (status === "FAILED") {
    if (AUTHORIZATION_PHRASES.some((phrase) => message.includes(phrase))) {
      return "AUTHORIZATION";
    }
    if (
      DEPENDENCY_PHRASES.some((phrase) => message.includes(phrase)) &&
      isDependentAction(action.actionType)
    ) {
      return "DEPENDENCY";
    }
    if (VALIDATION_PHRASES.some((phrase) => message.includes(phrase))) {
      return "VALIDATION";
    }
    if (STORAGE_PHRASES.some((phrase) => message.includes(phrase))) {
      return "LOCAL_STORAGE";
    }
    if (UNKNOWN_PHRASES.some((phrase) => message.includes(phrase))) {
      return "UNKNOWN";
    }
    return "UNKNOWN";
  }

  if (action.state === "RETRYABLE") {
    if (AUTHORIZATION_PHRASES.some((phrase) => message.includes(phrase))) {
      return "AUTHORIZATION";
    }
    if (STORAGE_PHRASES.some((phrase) => message.includes(phrase))) {
      return "LOCAL_STORAGE";
    }
    return "UNKNOWN";
  }

  return "UNKNOWN";
}

function isDependentAction(actionType: AttendanceActionType) {
  return (
    actionType === "EXIT" ||
    actionType === "START_BREAK" ||
    actionType === "END_BREAK"
  );
}

export function issueLabel(kind: AttendanceIssueKind) {
  switch (kind) {
    case "CONFLICT":
      return "Conflict";
    case "VALIDATION":
      return "Validation";
    case "DEPENDENCY":
      return "Dependency";
    case "AUTHORIZATION":
      return "Access";
    case "LOCAL_STORAGE":
      return "Device";
    case "UNKNOWN":
      return "Review";
  }
}

export function issueTone(kind: AttendanceIssueKind) {
  switch (kind) {
    case "CONFLICT":
    case "VALIDATION":
    case "DEPENDENCY":
    case "UNKNOWN":
      return "red" as const;
    case "AUTHORIZATION":
      return "amber" as const;
    case "LOCAL_STORAGE":
      return "slate" as const;
  }
}

/**
 * Structured problem for a proposed correction. The form previews
 * inline errors beside the affected field; the issue drawer uses the
 * same text to explain a previously rejected correction.
 */
export type CorrectionProblem = {
  breakIndex?: number;
  field: "enter" | "exit" | "breakStart" | "breakEnd";
  message: string;
  sessionIndex: number;
};

export type EditableCorrectionBreak = {
  endedAt: string;
  startedAt: string;
};

export type EditableCorrectionSession = {
  breaks: EditableCorrectionBreak[];
  enteredAt: string;
  exitedAt: string;
};

const TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

function malaysiaDateOf(input: string, workDate: string) {
  // Accept `YYYY-MM-DDTHH:mm` and `YYYY-MM-DDTHH:mm:ss`. The form sends
  // values as local `datetime-local` strings, so the date prefix must
  // match the selected Malaysia work date.
  if (!TIME_REGEX.test(input)) return null;
  return input.slice(0, 10) === workDate;
}

function malaysiaTimeValid(input: string) {
  if (!TIME_REGEX.test(input)) return false;
  const timePart = input.slice(11);
  const [hour = "0", minute = "0", second = "0"] = timePart.split(":");
  const h = Number(hour);
  const m = Number(minute);
  const s = Number(second);
  return (
    Number.isInteger(h) &&
    Number.isInteger(m) &&
    Number.isInteger(s) &&
    h >= 0 &&
    h < 24 &&
    m >= 0 &&
    m < 60 &&
    s >= 0 &&
    s < 60
  );
}

function malaysiaTimestamp(input: string) {
  // Parse the `YYYY-MM-DDTHH:mm[:ss]` value as Malaysia local time
  // and return the absolute epoch milliseconds.
  const [datePart, timePart = "00:00:00"] = input.split("T");
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined
  ) {
    return null;
  }
  const utc = Date.UTC(year, month - 1, day, hour - 8, minute, second);
  return Number.isFinite(utc) ? utc : null;
}

function sessionLabel(index: number) {
  return `Session ${index + 1}`;
}

function breakLabel(index: number) {
  return `Break ${index + 1}`;
}

/**
 * Pure validation for a correction editor. Returns one
 * `CorrectionProblem` per invalid field so the form can highlight
 * exactly what to change and the issue drawer can show the same text
 * for a previously rejected correction.
 */
export function validateCorrectionSessions(
  sessions: EditableCorrectionSession[],
  workDate: string,
): CorrectionProblem[] {
  const problems: CorrectionProblem[] = [];
  type ParsedSession = {
    end: number | null;
    endInput: string;
    enter: number;
    enterInput: string;
    parsedBreaks: Array<{
      end: number | null;
      endInput: string;
      index: number;
      start: number | null;
      startInput: string;
    }>;
    sessionEnd: number | null;
  };

  const parsed: ParsedSession[] = sessions.map((session) => {
    const enter =
      malaysiaTimeValid(session.enteredAt) && session.enteredAt
        ? malaysiaTimestamp(session.enteredAt)
        : null;
    const exitedAt = session.exitedAt;
    const exit =
      exitedAt && malaysiaTimeValid(exitedAt)
        ? malaysiaTimestamp(exitedAt)
        : null;
    const parsedBreaks = session.breaks.map((attendanceBreak, index) => ({
      end:
        attendanceBreak.endedAt && malaysiaTimeValid(attendanceBreak.endedAt)
          ? malaysiaTimestamp(attendanceBreak.endedAt)
          : null,
      endInput: attendanceBreak.endedAt,
      index,
      start:
        attendanceBreak.startedAt &&
        malaysiaTimeValid(attendanceBreak.startedAt)
          ? malaysiaTimestamp(attendanceBreak.startedAt)
          : null,
      startInput: attendanceBreak.startedAt,
    }));
    return {
      end: exit,
      endInput: exitedAt,
      enter: enter ?? Number.NaN,
      enterInput: session.enteredAt,
      parsedBreaks,
      sessionEnd: exit,
    };
  });

  parsed.forEach((session, index) => {
    if (!session.enterInput || !malaysiaTimeValid(session.enterInput)) {
      problems.push({
        field: "enter",
        message: `${sessionLabel(index)} needs a valid start time.`,
        sessionIndex: index,
      });
      return;
    }
    if (!malaysiaDateOf(session.enterInput, workDate)) {
      problems.push({
        field: "enter",
        message: `${sessionLabel(index)} start must be on ${workDate}.`,
        sessionIndex: index,
      });
      return;
    }
    if (session.end !== null) {
      if (session.end === session.enter) {
        problems.push({
          field: "exit",
          message: `${sessionLabel(index)} ends at the same time it starts.`,
          sessionIndex: index,
        });
      } else if (session.end < session.enter) {
        problems.push({
          field: "exit",
          message: `${sessionLabel(index)} ends before it starts.`,
          sessionIndex: index,
        });
      }
    }
  });

  // Overlap and open-session checks. Only consider sessions whose enter
  // and exit were both parseable so the wording points at the real
  // overlap, not the missing-time errors above.
  const usable = parsed
    .map((session, index) => ({
      end: session.sessionEnd,
      index,
      start: session.enter,
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.start) &&
        (entry.end === null || Number.isFinite(entry.end)),
    )
    .sort((left, right) => left.start - right.start);

  for (let leftIdx = 0; leftIdx < usable.length; leftIdx += 1) {
    for (let rightIdx = leftIdx + 1; rightIdx < usable.length; rightIdx += 1) {
      const left = usable[leftIdx]!;
      const right = usable[rightIdx]!;
      if (right.start >= (left.end ?? Number.POSITIVE_INFINITY)) break;
      // The open-session check below reports the "is still open" problem
      // for any open session followed by another session, so we only
      // record the overlap problem for the later session here.
      problems.push({
        field: "enter",
        message: `${sessionLabel(right.index)} overlaps ${sessionLabel(
          left.index,
        )}.`,
        sessionIndex: right.index,
      });
    }
  }
  // At most one session may be open, and an open session must be the
  // final chronological session.
  const openIndex = parsed.findIndex((session) => session.sessionEnd === null);
  if (openIndex !== -1) {
    const later = parsed
      .slice(openIndex + 1)
      .find((session) => Number.isFinite(session.enter));
    if (later) {
      problems.push({
        field: "exit",
        message: `${sessionLabel(
          openIndex,
        )} is still open. Close it before adding another session.`,
        sessionIndex: openIndex,
      });
    }
  }

  // Break checks per session.
  parsed.forEach((session, sessionIndex) => {
    if (!Number.isFinite(session.enter)) return;
    if (session.end !== null && session.end <= session.enter) return;
    const sessionStart = session.enter;
    const sessionEnd = session.sessionEnd ?? Number.POSITIVE_INFINITY;
    const completedBreaks: Array<{
      end: number;
      index: number;
      start: number;
    }> = [];
    session.parsedBreaks.forEach((attendanceBreak) => {
      if (
        !attendanceBreak.startInput ||
        !malaysiaTimeValid(attendanceBreak.startInput)
      ) {
        problems.push({
          breakIndex: attendanceBreak.index,
          field: "breakStart",
          message: `${breakLabel(attendanceBreak.index)} needs a valid start time.`,
          sessionIndex,
        });
        return;
      }
      const breakStart = attendanceBreak.start;
      if (breakStart === null) {
        // Already reported via the malaysiaTimeValid check above.
        return;
      }
      if (!malaysiaDateOf(attendanceBreak.startInput, workDate)) {
        problems.push({
          breakIndex: attendanceBreak.index,
          field: "breakStart",
          message: `${breakLabel(
            attendanceBreak.index,
          )} start must be on ${workDate}.`,
          sessionIndex,
        });
        return;
      }
      if (breakStart <= sessionStart) {
        problems.push({
          breakIndex: attendanceBreak.index,
          field: "breakStart",
          message: `${breakLabel(
            attendanceBreak.index,
          )} must start after ${sessionLabel(sessionIndex)} starts.`,
          sessionIndex,
        });
        return;
      }
      if (breakStart >= sessionEnd) {
        problems.push({
          breakIndex: attendanceBreak.index,
          field: "breakStart",
          message: `${breakLabel(
            attendanceBreak.index,
          )} must start before ${sessionLabel(sessionIndex)} ends.`,
          sessionIndex,
        });
        return;
      }
      if (
        attendanceBreak.endInput &&
        !malaysiaTimeValid(attendanceBreak.endInput)
      ) {
        problems.push({
          breakIndex: attendanceBreak.index,
          field: "breakEnd",
          message: `${breakLabel(attendanceBreak.index)} needs a valid end time.`,
          sessionIndex,
        });
        return;
      }
      if (attendanceBreak.end !== null) {
        if (attendanceBreak.end === breakStart) {
          problems.push({
            breakIndex: attendanceBreak.index,
            field: "breakEnd",
            message: `${breakLabel(attendanceBreak.index)} ends at the same time it starts.`,
            sessionIndex,
          });
          return;
        }
        if (attendanceBreak.end < breakStart) {
          problems.push({
            breakIndex: attendanceBreak.index,
            field: "breakEnd",
            message: `${breakLabel(attendanceBreak.index)} ends before it starts.`,
            sessionIndex,
          });
          return;
        }
        if (attendanceBreak.end > sessionEnd) {
          problems.push({
            breakIndex: attendanceBreak.index,
            field: "breakEnd",
            message: `${breakLabel(
              attendanceBreak.index,
            )} must end before ${sessionLabel(sessionIndex)} ends.`,
            sessionIndex,
          });
          return;
        }
        completedBreaks.push({
          end: attendanceBreak.end,
          index: attendanceBreak.index,
          start: breakStart,
        });
      } else if (sessionEnd !== Number.POSITIVE_INFINITY) {
        problems.push({
          breakIndex: attendanceBreak.index,
          field: "breakEnd",
          message: `${sessionLabel(sessionIndex)} is closed. Close ${breakLabel(
            attendanceBreak.index,
          )} or leave the session open.`,
          sessionIndex,
        });
      }
    });
    completedBreaks.sort((left, right) => left.start - right.start);
    for (let leftIdx = 0; leftIdx < completedBreaks.length; leftIdx += 1) {
      for (
        let rightIdx = leftIdx + 1;
        rightIdx < completedBreaks.length;
        rightIdx += 1
      ) {
        const left = completedBreaks[leftIdx]!;
        const right = completedBreaks[rightIdx]!;
        if (right.start >= left.end) break;
        if (right.start < left.end) {
          problems.push({
            breakIndex: right.index,
            field: "breakEnd",
            message: `${breakLabel(right.index)} overlaps ${breakLabel(
              left.index,
            )}.`,
            sessionIndex,
          });
        }
      }
    }
  });

  return problems;
}

type CorrectionSessionLike = {
  breaks: Array<{ endedAt: string | null; startedAt: string }>;
  enteredAt: string;
  exitedAt: string | null;
};

/**
 * Parse a `CORRECT_DAY` action payload into the same `CorrectionSessionLike`
 * shape used by both the issue drawer and the validation helper. The
 * resulting index aligns with `CorrectionProblem.sessionIndex` because
 * invalid entries are filtered out in the same way as the validator.
 */
export function correctionFromPayload(
  action: AttendanceQueueAction,
): CorrectionSessionLike[] {
  const raw = action.payload.sessions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Record<string, unknown>;
      const enteredAt =
        typeof candidate.enteredAt === "string" ? candidate.enteredAt : null;
      if (!enteredAt) return null;
      const exitedAt =
        typeof candidate.exitedAt === "string" ? candidate.exitedAt : null;
      const breaks = Array.isArray(candidate.breaks)
        ? candidate.breaks
            .map((breakEntry) => {
              if (!breakEntry || typeof breakEntry !== "object") return null;
              const candidateBreak = breakEntry as Record<string, unknown>;
              const startedAt =
                typeof candidateBreak.startedAt === "string"
                  ? candidateBreak.startedAt
                  : null;
              if (!startedAt) return null;
              const endedAt =
                typeof candidateBreak.endedAt === "string"
                  ? candidateBreak.endedAt
                  : null;
              return { endedAt, startedAt };
            })
            .filter(
              (value): value is { endedAt: string | null; startedAt: string } =>
                value !== null,
            )
        : [];
      return { breaks, enteredAt, exitedAt };
    })
    .filter((value): value is CorrectionSessionLike => value !== null);
}

function editableFromCorrection(
  sessions: CorrectionSessionLike[],
): EditableCorrectionSession[] {
  return sessions.map((session) => ({
    breaks: session.breaks.map((attendanceBreak) => ({
      endedAt: malaysiaInputFromIso(attendanceBreak.endedAt),
      startedAt: malaysiaInputFromIso(attendanceBreak.startedAt),
    })),
    enteredAt: malaysiaInputFromIso(session.enteredAt),
    exitedAt: malaysiaInputFromIso(session.exitedAt),
  }));
}

/**
 * Format an ISO timestamp as an Asia/Kuala_Lumpur `datetime-local` string
 * (`YYYY-MM-DDTHH:mm:ss`). The form already sends Malaysia local time so
 * we trim the timezone and preserve seconds so editors can fix sub-minute
 * sessions like `08:40:16–08:40:34` without losing precision.
 */
export function malaysiaInputFromIso(iso: string | null) {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
  }).formatToParts(parsed);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

export function malaysiaIsoFromInput(value: string) {
  const separator = value.indexOf("T");
  const timePart = separator >= 0 ? value.slice(separator + 1) : "";
  const segments = timePart.split(":");
  if (segments.length === 2) segments.push("00");
  const normalized = `${value.slice(0, separator + 1)}${segments.join(":")}`;
  return new Date(`${normalized}+08:00`).toISOString();
}

/**
 * Single source of truth for what the worker row and the issue drawer
 * show about a failed or pending action. Both the row and the drawer
 * must read from this helper so they never disagree on category.
 */
export type AttendanceIssuePresentation = {
  correctionProblems: CorrectionProblem[];
  explanation: string;
  label: string;
  resolution: string;
  rowSummary: string;
  tone: "red" | "amber" | "slate";
};

function enterConflictPresentation(): AttendanceIssuePresentation {
  return {
    correctionProblems: [],
    explanation:
      "The entrance could not be added because attendance already exists or overlaps on the server for this worker and date.",
    label: "Conflicting entrance",
    resolution:
      "Open the attendance record, correct it against the current server data, or discard this entrance.",
    rowSummary: "Entrance could not be added to the server",
    tone: "red",
  };
}

function exitMissingPresentation(): AttendanceIssuePresentation {
  return {
    correctionProblems: [],
    explanation:
      "The exit refers to a work session that is no longer on the server for this worker and date.",
    label: "Exit for missing session",
    resolution:
      "Open the attendance record to record the exit against the current server data, or discard the change.",
    rowSummary: "Exit could not find the original session",
    tone: "red",
  };
}

function breakMissingPresentation(
  action: AttendanceQueueAction,
): AttendanceIssuePresentation {
  if (action.actionType === "START_BREAK") {
    return {
      correctionProblems: [],
      explanation:
        "The break could not start because the work session is missing or no longer open on the server.",
      label: "Break start needs an open session",
      resolution:
        "Open the attendance record, add the break against the current server data, or discard the change.",
      rowSummary: "Break start needs an open session",
      tone: "red",
    };
  }
  return {
    correctionProblems: [],
    explanation:
      "The break could not end because the open break is missing on the server.",
    label: "Break end needs an open break",
    resolution:
      "Open the attendance record, end the break against the current server data, or discard the change.",
    rowSummary: "Break end needs an open break",
    tone: "red",
  };
}

function authorizationPresentation(): AttendanceIssuePresentation {
  return {
    correctionProblems: [],
    explanation:
      "This device no longer has access to the project. Attendance for this project cannot be saved until access is restored.",
    label: "Project access lost",
    resolution: "Sign in again or restore project access, then retry.",
    rowSummary: "This device no longer has project access",
    tone: "amber",
  };
}

function localStoragePresentation(): AttendanceIssuePresentation {
  return {
    correctionProblems: [],
    explanation:
      "The change was not safely stored on this device. The original server attendance has not been changed.",
    label: "Device storage error",
    resolution:
      "Check this device storage and try the change again, or discard it.",
    rowSummary: "Device storage could not save the change",
    tone: "slate",
  };
}

function unknownPresentation(
  action: AttendanceQueueAction,
): AttendanceIssuePresentation {
  return {
    correctionProblems: [],
    explanation:
      action.message ??
      "The device change could not be applied to the server. See technical details for the exact server message.",
    label: "Review needed",
    resolution:
      "Open the attendance record to correct it against the current server data, or discard the change.",
    rowSummary: "Device change could not be applied",
    tone: "red",
  };
}

function actionSpecificFallback(
  action: AttendanceQueueAction,
): AttendanceIssuePresentation {
  switch (action.actionType) {
    case "ENTER":
      return enterConflictPresentation();
    case "EXIT":
      return exitMissingPresentation();
    case "START_BREAK":
    case "END_BREAK":
      return breakMissingPresentation(action);
    case "CORRECT_DAY":
      return {
        correctionProblems: [],
        explanation: "The correction could not be saved by the server.",
        label: "Correction not saved",
        resolution:
          "Open the attendance record to correct it against the current server data, or discard the change.",
        rowSummary: "Correction could not be saved",
        tone: "red",
      };
    case "SET_DAY_TYPE":
      return {
        correctionProblems: [],
        explanation: "The day type could not be saved by the server.",
        label: "Day type not saved",
        resolution: "Try setting the day type again, or discard the change.",
        rowSummary: "Day type could not be saved",
        tone: "red",
      };
  }
}

function correctionPresentation(
  action: AttendanceQueueAction,
  workDate: string,
): AttendanceIssuePresentation | null {
  if (action.actionType !== "CORRECT_DAY") return null;
  const sessions = correctionFromPayload(action);
  if (sessions.length === 0) return null;
  const editable = editableFromCorrection(sessions);
  const problems = validateCorrectionSessions(editable, workDate);
  if (problems.length === 0) {
    return {
      correctionProblems: [],
      explanation: action.message ?? "The correction could not be saved.",
      label: "Correction not saved",
      resolution:
        "Open the attendance record to correct it against the current server data, or discard the change.",
      rowSummary: "Correction could not be saved",
      tone: "red",
    };
  }
  const problemMessages = problems
    .map((problem) => problem.message)
    .filter((value, index, list) => list.indexOf(value) === index);
  return {
    correctionProblems: problems,
    explanation: problemMessages.join(" "),
    label: "Invalid correction",
    resolution:
      "Correct the highlighted times, then save the correction again.",
    rowSummary: "Correction has invalid session times",
    tone: "red",
  };
}

/**
 * One source of truth for the explanation shown in the worker row and
 * the issue drawer. The optional workDate lets the helper inspect a
 * queued `CORRECT_DAY` payload and pinpoint the exact invalid fields.
 *
 * Authorization and storage failures are reported even when the stored
 * `CORRECT_DAY` payload is locally invalid; a user with no project access
 * or a corrupt device row must see the access/storage message first.
 */
export function presentAttendanceIssue(
  action: AttendanceQueueAction,
  workDate?: string,
): AttendanceIssuePresentation {
  const date = workDate ?? action.workDate;
  const kind = action.issueKind ?? classifyIssue(action);
  if (kind === "AUTHORIZATION") return authorizationPresentation();
  if (kind === "LOCAL_STORAGE") return localStoragePresentation();

  const correction = correctionPresentation(action, date);
  if (correction) return correction;

  switch (kind) {
    case "CONFLICT":
      if (action.actionType === "ENTER") {
        return enterConflictPresentation();
      }
      return actionSpecificFallback(action);
    case "VALIDATION":
      if (action.actionType === "ENTER") {
        return enterConflictPresentation();
      }
      return actionSpecificFallback(action);
    case "DEPENDENCY":
      if (
        action.actionType === "EXIT" ||
        action.actionType === "START_BREAK" ||
        action.actionType === "END_BREAK"
      ) {
        return breakMissingPresentation(action);
      }
      return actionSpecificFallback(action);
    case "UNKNOWN":
      return unknownPresentation(action);
  }
}

const DEPENDENCY_DESCRIPTIONS: Record<AttendanceActionType, string> = {
  EXIT: "The exit could not find the work session it referred to.",
  START_BREAK:
    "The break could not start because the work session was missing.",
  END_BREAK: "The break could not end because the break was missing.",
  ENTER: "The entrance could not be recorded.",
  SET_DAY_TYPE: "The day type could not be saved.",
  CORRECT_DAY: "The correction could not be saved.",
};

const ROOT_DESCRIPTIONS: Partial<Record<AttendanceIssueKind, string>> = {
  CONFLICT: "Device changes conflict with the current server record.",
  VALIDATION: "Device changes are not valid for the current attendance.",
  DEPENDENCY:
    "Earlier device changes failed, so later actions for the same worker and date could not be applied.",
  AUTHORIZATION: "This device no longer has access to the project.",
  LOCAL_STORAGE: "The device could not save one or more changes locally.",
  UNKNOWN: "The device change could not be applied to the server.",
};

/**
 * Concise user-facing summary for a single issue group. Two sentences max,
 * written for non-technical company staff.
 */
export function groupSummary(
  root: AttendanceQueueAction,
  kind: AttendanceIssueKind,
  dependentCount: number,
): string {
  if (kind === "DEPENDENCY" && dependentCount > 0) {
    return (
      DEPENDENCY_DESCRIPTIONS[root.actionType] ??
      ROOT_DESCRIPTIONS.DEPENDENCY ??
      "Earlier device changes failed, so later actions could not be applied."
    );
  }
  return (
    ROOT_DESCRIPTIONS[kind] ??
    "The device change could not be applied to the server."
  );
}

/**
 * Single short reason for a worker row. Kept short enough to fit on one
 * line beside the worker name on mobile. Delegates to the shared
 * presentation helper so the row and drawer can never disagree.
 */
export function shortReason(
  root: AttendanceQueueAction,
  kind: AttendanceIssueKind,
): string {
  return presentAttendanceIssue({ ...root, issueKind: kind }, root.workDate)
    .rowSummary;
}

export type AttendanceSyncIssueGroup = {
  actionIds: string[];
  actionCount: number;
  issueKind: AttendanceIssueKind;
  primaryMessage: string;
  projectId: string;
  rootAction: AttendanceQueueAction;
  technicalActions: AttendanceQueueAction[];
  workerId: string | null;
  workDate: string;
};

/**
 * Stable, deterministic key for an issue group. Both the workspace
 * (which uses it to remember the focused group) and the issue drawer
 * (which uses it for keyboard focus) must compute the same value, so
 * the primary form joins the action ids and a single shared fallback
 * is used when no action ids are present.
 */
export function issueGroupKey(group: AttendanceSyncIssueGroup): string {
  return (
    group.actionIds.join(":") ||
    `${group.workerId ?? "unknown"}::${group.workDate}`
  );
}

/**
 * Choose the root action of a group. Prefers the newest failed
 * `CORRECT_DAY` so the latest user-facing decision wins, otherwise
 * falls back to the legacy heuristic of picking the earliest
 * conflict/validation so dependent failures are explained.
 */
export function selectGroupRoot(
  actions: AttendanceQueueAction[],
): AttendanceQueueAction | null {
  if (actions.length === 0) return null;
  const failedCorrections = actions
    .filter(
      (action) =>
        action.actionType === "CORRECT_DAY" &&
        (action.serverStatus === "CONFLICT" ||
          action.serverStatus === "FAILED"),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  if (failedCorrections[0]) return failedCorrections[0];
  const ordered = [...actions].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  return (
    ordered.find(
      (action) =>
        action.serverStatus === "CONFLICT" ||
        classifyIssue(action) === "VALIDATION",
    ) ??
    ordered[0] ??
    null
  );
}

/**
 * Build the display model consumed by the issue center. Groups every
 * `REVIEW_REQUIRED` action by `projectId + workDate + workerId`, picks
 * the newest failed `CORRECT_DAY` (or the legacy root) as the root, and
 * rolls the rest into the technical-details disclosure.
 *
 * The grouping is purely client-side and does not touch the server.
 */
export function buildAttendanceIssueGroups(
  actions: AttendanceQueueAction[],
): AttendanceSyncIssueGroup[] {
  const reviewable = actions.filter(
    (action) => action.state === "REVIEW_REQUIRED",
  );
  if (reviewable.length === 0) return [];

  const groups = new Map<string, AttendanceQueueAction[]>();
  for (const action of reviewable) {
    const key = `${action.projectId}:${action.workDate}:${action.workerId ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(action);
    } else {
      groups.set(key, [action]);
    }
  }

  const result: AttendanceSyncIssueGroup[] = [];
  for (const [, groupActions] of groups) {
    const ordered = [...groupActions].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    const root = selectGroupRoot(ordered);
    if (!root) continue;
    const kind = classifyIssue(root);
    const summary = groupSummary(root, kind, ordered.length - 1);
    // Build group metadata from the root action so the values are
    // authoritative. The map key is only a grouping handle and its
    // segments are not safe to parse back into business fields.
    result.push({
      actionIds: ordered.map((action) => action.clientActionId),
      actionCount: ordered.length,
      issueKind: kind,
      primaryMessage: summary,
      projectId: root.projectId,
      rootAction: root,
      technicalActions: ordered,
      workerId: root.workerId,
      workDate: root.workDate,
    });
  }

  return result.sort((left, right) => {
    const leftTime = left.rootAction.createdAt;
    const rightTime = right.rootAction.createdAt;
    return rightTime.localeCompare(leftTime);
  });
}

/**
 * Select the action ids that may be resent because the server never
 * returned a terminal verdict for the same id. Conflicts and deterministic
 * FAILED verdicts are excluded so retries cannot loop forever.
 */
export function selectRetryableActionIds(
  actions: AttendanceQueueAction[],
): string[] {
  return actions
    .filter((action) => action.state === "RETRYABLE")
    .map((action) => action.clientActionId);
}

/**
 * Normalize legacy IndexedDB records by inferring the workerId and
 * workDate from sibling ENTER / START_BREAK actions. The new build stores
 * these on every action at creation time, but rows written by an earlier
 * client may still be present on real devices. The original rows are
 * persisted back so a reload does not require inference again.
 */
export function inferLegacyActionMetadata(
  actions: AttendanceQueueAction[],
  snapshot: AttendanceSnapshot,
): { actions: AttendanceQueueAction[]; inferred: boolean } {
  const sessionToWorker = new Map<
    string,
    { workerId: string; workDate: string }
  >();
  const breakToSession = new Map<string, string>();

  for (const action of actions) {
    if (action.actionType === "ENTER") {
      const workerId =
        action.workerId ??
        (typeof action.payload.workerId === "string"
          ? action.payload.workerId
          : null);
      const workDate =
        action.workDate ||
        (typeof action.payload.workDate === "string"
          ? action.payload.workDate
          : "");
      const sessionId =
        typeof action.payload.sessionId === "string"
          ? action.payload.sessionId
          : null;
      if (workerId && sessionId) {
        sessionToWorker.set(sessionId, { workDate, workerId });
      }
    } else if (action.actionType === "START_BREAK") {
      const sessionId =
        typeof action.payload.sessionId === "string"
          ? action.payload.sessionId
          : null;
      const breakId =
        typeof action.payload.breakId === "string"
          ? action.payload.breakId
          : null;
      if (sessionId && breakId) {
        breakToSession.set(breakId, sessionId);
      }
    }
  }

  let inferred = false;
  const next = actions.map((action) => {
    // Seed with the existing values so a valid existing workerId is
    // never overwritten by a snapshot lookup.
    let workerId: string | null = action.workerId;
    let workDate: string = action.workDate;
    let changed = false;

    if (action.actionType === "EXIT" || action.actionType === "START_BREAK") {
      const sessionId =
        typeof action.payload.sessionId === "string"
          ? action.payload.sessionId
          : null;
      const map = sessionId ? sessionToWorker.get(sessionId) : undefined;
      if (map) {
        if (!workerId) {
          workerId = map.workerId;
          changed = true;
        }
        if (!workDate) {
          workDate = map.workDate;
          changed = true;
        }
      }
    } else if (action.actionType === "END_BREAK") {
      const breakId =
        typeof action.payload.breakId === "string"
          ? action.payload.breakId
          : null;
      const sessionId = breakId ? breakToSession.get(breakId) : null;
      const map = sessionId ? sessionToWorker.get(sessionId) : undefined;
      if (map) {
        if (!workerId) {
          workerId = map.workerId;
          changed = true;
        }
        if (!workDate) {
          workDate = map.workDate;
          changed = true;
        }
      }
    }

    if (!workerId || !workDate) {
      // Fall back to the current snapshot: search for the session/break id
      // before the snapshot refresh wiped the optimistic local record.
      const lookup = findWorkerInSnapshot(action, snapshot);
      if (!workerId && lookup.workerId) {
        workerId = lookup.workerId;
        changed = true;
      }
      if (!workDate && lookup.workDate) {
        workDate = lookup.workDate;
        changed = true;
      }
    }

    if (!changed) {
      return action;
    }
    inferred = true;
    return { ...action, workDate, workerId };
  });

  return { actions: next, inferred };
}

function findWorkerInSnapshot(
  action: AttendanceQueueAction,
  snapshot: AttendanceSnapshot,
): { workDate: string; workerId: string | null } {
  const sessionId =
    typeof action.payload.sessionId === "string"
      ? action.payload.sessionId
      : null;
  const breakId =
    typeof action.payload.breakId === "string" ? action.payload.breakId : null;
  for (const session of snapshot.sessions) {
    if (sessionId && session.id === sessionId) {
      return { workDate: snapshot.workDate, workerId: session.workerId };
    }
    for (const breakRecord of session.breaks) {
      if (breakId && breakRecord.id === breakId) {
        return { workDate: snapshot.workDate, workerId: session.workerId };
      }
    }
  }
  return { workDate: "", workerId: null };
}

/**
 * Worker-facing summary for a day's device attempts: how many raw device
 * actions are pending, syncing, retryable, or review-required.
 */
export function summarizeDeviceActionCounts(actions: AttendanceQueueAction[]) {
  let pending = 0;
  let retryable = 0;
  let review = 0;
  for (const action of actions) {
    if (action.state === "PENDING" || action.state === "SYNCING") pending += 1;
    if (action.state === "RETRYABLE") retryable += 1;
    if (action.state === "REVIEW_REQUIRED") review += 1;
  }
  return { pending, retryable, review };
}

/**
 * After a successful CORRECT_DAY action for a worker/date we want to
 * delete every older REVIEW_REQUIRED action for the same project/worker/date
 * so the issue card disappears. New CORRECT_DAY actions are intentionally
 * excluded — they are the resolution, not the original problem.
 */
export function selectResolutionsAfterCorrection(
  actions: AttendanceQueueAction[],
  correctionAction: AttendanceQueueAction,
): string[] {
  return actions
    .filter(
      (action) =>
        action.clientActionId !== correctionAction.clientActionId &&
        action.state === "REVIEW_REQUIRED" &&
        action.projectId === correctionAction.projectId &&
        action.workDate === correctionAction.workDate &&
        action.workerId === correctionAction.workerId,
    )
    .map((action) => action.clientActionId);
}

/**
 * Reasonable default for the queue item displayed in the worker row when
 * a worker has multiple per-day issues. We surface the root cause so the
 * row shows the real reason and not a downstream chain failure.
 */
export function primaryReviewAction(
  actions: AttendanceQueueAction[],
): AttendanceQueueAction | null {
  const reviewable = actions.filter(
    (action) => action.state === "REVIEW_REQUIRED",
  );
  if (reviewable.length === 0) return null;
  return selectGroupRoot(reviewable);
}
