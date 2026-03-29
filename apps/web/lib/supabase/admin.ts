import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/server-env";
import type { Database } from "@/lib/supabase/database.types";

function buildAdminClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let adminClient: ReturnType<typeof buildAdminClient> | undefined;

export function createSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  adminClient = buildAdminClient();

  return adminClient;
}
