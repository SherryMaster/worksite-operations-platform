import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import { serverEnvironment } from "@/lib/env/server";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  const { getToken } = await auth();

  return createClient<Database>(
    serverEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    serverEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      accessToken: async () => getToken(),
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
