import "server-only";

export type LogContext = Record<
  string,
  boolean | number | string | null | undefined
>;

const sensitiveKey =
  /authorization|body|claim|cookie|email|file(name)?|identity|key$|objectPath|password|payload|phone|secret|token|userId/i;

export function sanitizeLogContext(context: LogContext): LogContext {
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
    ...sanitizeLogContext(context),
    timestamp: new Date().toISOString(),
    level,
    event,
    vercelEnv: process.env.VERCEL_ENV,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA,
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
