import "server-only";

import { logger } from "@/lib/server/logger";
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
    logger.error("migration_batches_query_failed", {
      code: response.error.code,
    });
    throw new Error("Import history could not be loaded.");
  }
  return response.data;
}
