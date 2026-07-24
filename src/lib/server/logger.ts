import "server-only";

type LogContext = Record<string, boolean | number | string | null | undefined>;

const sensitiveKey = /email|password|secret|token|document|identity/i;

function sanitize(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

function write(
  level: "error" | "info" | "warn",
  event: string,
  context: LogContext = {},
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitize(context),
  });

  if (level === "error") {
    console.error(entry);
    return;
  }

  if (level === "warn") {
    console.warn(entry);
    return;
  }

  console.info(entry);
}

export const logger = {
  error: (event: string, context?: LogContext) =>
    write("error", event, context),
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
};
