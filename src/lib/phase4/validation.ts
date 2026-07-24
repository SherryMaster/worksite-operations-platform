import { z } from "zod";

const uuid = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const workDate = z.iso.date();

const common = {
  capturedOffline: z.boolean().optional(),
};

const setDayTypePayload = z.object({
  ...common,
  dayType: z.enum(["NORMAL", "SUNDAY", "PUBLIC_HOLIDAY"]),
  note: z.string().trim().max(500).optional(),
  workDate,
});

const enterPayload = z.object({
  ...common,
  occurredAt: timestamp,
  sessionId: uuid,
  workerId: uuid,
  workDate,
});

const exitPayload = z.object({
  ...common,
  occurredAt: timestamp,
  sessionId: uuid,
});

const startBreakPayload = z.object({
  ...common,
  breakId: uuid,
  occurredAt: timestamp,
  sessionId: uuid,
});

const endBreakPayload = z.object({
  ...common,
  breakId: uuid,
  occurredAt: timestamp,
});

const correctedBreak = z.object({
  endedAt: timestamp.nullable(),
  id: uuid,
  startedAt: timestamp,
});

const correctedSession = z.object({
  breaks: z.array(correctedBreak).max(12),
  enteredAt: timestamp,
  exitedAt: timestamp.nullable(),
  id: uuid,
});

const correctDayPayload = z.object({
  ...common,
  note: z.string().trim().min(3).max(500),
  sessions: z.array(correctedSession).max(12),
  workerId: uuid,
  workDate,
});

export const attendanceActionSchema = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("SET_DAY_TYPE"),
    clientActionId: uuid,
    payload: setDayTypePayload,
    projectId: uuid,
  }),
  z.object({
    actionType: z.literal("ENTER"),
    clientActionId: uuid,
    payload: enterPayload,
    projectId: uuid,
  }),
  z.object({
    actionType: z.literal("EXIT"),
    clientActionId: uuid,
    payload: exitPayload,
    projectId: uuid,
  }),
  z.object({
    actionType: z.literal("START_BREAK"),
    clientActionId: uuid,
    payload: startBreakPayload,
    projectId: uuid,
  }),
  z.object({
    actionType: z.literal("END_BREAK"),
    clientActionId: uuid,
    payload: endBreakPayload,
    projectId: uuid,
  }),
  z.object({
    actionType: z.literal("CORRECT_DAY"),
    clientActionId: uuid,
    payload: correctDayPayload,
    projectId: uuid,
  }),
]);

export const attendanceSyncRequestSchema = z.object({
  actions: z.array(attendanceActionSchema).min(1).max(50),
});
