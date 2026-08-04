import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("whole-application dependency recovery integration", () => {
  it.each([
    ["Phase 2 projects/settings", "src/lib/phase2/data.ts"],
    ["Phase 3 workers/documents", "src/lib/phase3/data.ts"],
    ["Phase 4 attendance", "src/lib/phase4/data.ts"],
    ["Phase 5 leave", "src/lib/phase5/data.ts"],
    ["Phase 6 payroll", "src/lib/phase6/data.ts"],
    ["Phase 7 reports", "src/lib/phase7/reports.ts"],
  ])("routes %s reads through the shared classifier", (_family, path) => {
    expect(source(path)).toContain("throwDependencyError");
  });

  it.each([
    "src/app/ceo/actions.ts",
    "src/app/ceo/workers/actions.ts",
    "src/app/ceo/payroll/actions.ts",
    "src/app/leave/actions.ts",
  ])("keeps %s mutation recovery explicit", (path) => {
    const contents = source(path);
    expect(contents).toContain("dependencyActionMessage");
    expect(contents).not.toMatch(/from ["']@clerk\/nextjs\/server["']/);
  });

  it.each([
    "src/app/api/attendance/bootstrap/route.ts",
    "src/app/api/attendance/sync/route.ts",
    "src/app/api/imports/commit/route.ts",
    "src/app/api/imports/preview/route.ts",
    "src/app/api/imports/uploads/route.ts",
    "src/app/api/leave-requests/route.ts",
    "src/app/api/leave-requests/[leaveRequestId]/documents/[documentId]/route.ts",
    "src/app/api/reports/[reportId]/export/route.ts",
    "src/app/api/workers/[workerId]/documents/route.ts",
    "src/app/api/workers/[workerId]/documents/[documentId]/route.ts",
  ])("wraps %s with safe authenticated API failures", (path) => {
    expect(source(path)).toContain("withDependencyRouteHandler");
  });

  it("memoizes auth, Supabase client, and access only in request-scoped caches", () => {
    expect(source("src/lib/auth/request-context.ts")).toContain(
      "getRequestAuth = cache",
    );
    expect(source("src/lib/auth/request-context.ts")).toContain(
      "getRequestToken = cache",
    );
    expect(source("src/lib/supabase/server.ts")).toMatch(
      /createServerSupabaseClient = cache/,
    );
    expect(source("src/lib/auth/access.ts")).toMatch(
      /resolveCurrentAccess = cache/,
    );
    expect(source("src/lib/supabase/server.ts")).not.toContain("service_role");
  });

  it("preserves Next.js control-flow errors before classifying Clerk failures", () => {
    const contents = source("src/lib/auth/request-context.ts");
    expect(contents).toContain(
      'import { unstable_rethrow } from "next/navigation"',
    );
    expect(contents.match(/unstable_rethrow\(error\)/g)).toHaveLength(2);
  });

  it("redirects an already signed-in sign-in request before rendering Clerk SignIn", () => {
    const contents = source("src/app/sign-in/[[...sign-in]]/page.tsx");
    expect(contents).toContain("getRequestAuth");
    expect(contents).toContain("signedInDestination");
    expect(contents.indexOf("if (userId)")).toBeLessThan(
      contents.indexOf("<SignIn"),
    );
  });

  it("keeps Foreman offline fallback and attendance storage outside update recovery", () => {
    const worker = source("src/app/sw.ts");
    const update = source("src/components/phase4/service-worker-update.tsx");
    expect(worker).toContain("new NetworkOnly()");
    expect(worker).toContain('matchPrecache("/~offline")');
    expect(update).not.toMatch(/indexedDB|deleteAttendance|clearAttendance/);
  });
});
