import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

import { getRequestToken } from "@/lib/auth/request-context";
import { serverEnvironment } from "@/lib/env/server";
import type { Database } from "@/types/database";

export const createServerSupabaseClient = cache(async () => {
  return createClient<Database>(
    serverEnvironment.NEXT_PUBLIC_SUPABASE_URL,
    serverEnvironment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      accessToken: getRequestToken,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
});
