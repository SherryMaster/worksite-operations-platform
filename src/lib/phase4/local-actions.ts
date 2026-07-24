import type {
  AttendanceQueueAction,
  AttendanceSession,
  AttendanceSnapshot,
} from "@/lib/phase4/types";

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function applyLocalAttendanceAction(
  snapshot: AttendanceSnapshot,
  action: AttendanceQueueAction,
): AttendanceSnapshot {
  const payload = action.payload;
  const updatedAt = new Date().toISOString();

  if (action.actionType === "SET_DAY_TYPE") {
    const dayType = payload.dayType;
    if (
      dayType === "NORMAL" ||
      dayType === "SUNDAY" ||
      dayType === "PUBLIC_HOLIDAY"
    ) {
      return { ...snapshot, dayType, updatedAt };
    }
    return snapshot;
  }

  if (action.actionType === "ENTER") {
    const session: AttendanceSession = {
      breaks: [],
      enteredAt: stringValue(payload.occurredAt),
      exitedAt: null,
      id: stringValue(payload.sessionId),
      workerId: stringValue(payload.workerId),
    };
    return {
      ...snapshot,
      sessions: [...snapshot.sessions, session],
      updatedAt,
    };
  }

  if (action.actionType === "EXIT") {
    return {
      ...snapshot,
      sessions: snapshot.sessions.map((session) =>
        session.id === payload.sessionId
          ? { ...session, exitedAt: stringValue(payload.occurredAt) }
          : session,
      ),
      updatedAt,
    };
  }

  if (action.actionType === "START_BREAK") {
    return {
      ...snapshot,
      sessions: snapshot.sessions.map((session) =>
        session.id === payload.sessionId
          ? {
              ...session,
              breaks: [
                ...session.breaks,
                {
                  endedAt: null,
                  id: stringValue(payload.breakId),
                  startedAt: stringValue(payload.occurredAt),
                },
              ],
            }
          : session,
      ),
      updatedAt,
    };
  }

  if (action.actionType === "END_BREAK") {
    return {
      ...snapshot,
      sessions: snapshot.sessions.map((session) => ({
        ...session,
        breaks: session.breaks.map((attendanceBreak) =>
          attendanceBreak.id === payload.breakId
            ? {
                ...attendanceBreak,
                endedAt: stringValue(payload.occurredAt),
              }
            : attendanceBreak,
        ),
      })),
      updatedAt,
    };
  }

  if (action.actionType === "CORRECT_DAY") {
    const sessions = Array.isArray(payload.sessions)
      ? (payload.sessions as AttendanceSession[])
      : [];
    const workerId = stringValue(payload.workerId);
    return {
      ...snapshot,
      sessions: [
        ...snapshot.sessions.filter((session) => session.workerId !== workerId),
        ...sessions.map((session) => ({ ...session, workerId })),
      ],
      updatedAt,
    };
  }

  return snapshot;
}
