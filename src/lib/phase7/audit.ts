import "server-only";

import { throwDependencyError } from "@/lib/server/dependency-error";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export async function recordPhase7AuditEvent(input: {
  action: "exports.report" | "imports.commit" | "imports.preview";
  afterData: Json;
  entityId: string;
  module: "exports" | "imports";
}) {
  const supabase = await createServerSupabaseClient();
  const response = await supabase.from("audit_entries").insert({
    action: input.action,
    after_data: input.afterData,
    entity_id: input.entityId,
    entity_type: input.module === "exports" ? "reports" : "migration_batches",
    module: input.module,
    source: "ONLINE",
  });
  if (response.error) {
    throwDependencyError(response.error, {
      dependency: "SUPABASE_DATA",
      operation: `phase_7_audit_${input.module}`,
      operationKind: "write",
      routeFamily: "/api/reports|imports",
      surface: "route_handler",
    });
  }
}
