import "server-only";

import { throwDependencyError } from "@/lib/server/dependency-error";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function listMigrationBatches() {
  const supabase = await createServerSupabaseClient();
  const response = await supabase
    .from("migration_batches")
    .select(
      "id,file_name,file_checksum,status,issues,summary,created_at,committed_at",
    )
    .order("created_at", { ascending: false })
    .limit(20);
  if (response.error) {
    throwDependencyError(response.error, {
      dependency: "SUPABASE_DATA",
      operation: "migration_batches",
      operationKind: "read",
      routeFamily: "/ceo/imports",
      surface: "server_component",
    });
  }
  return response.data;
}
