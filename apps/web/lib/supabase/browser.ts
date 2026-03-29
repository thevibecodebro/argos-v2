import { createBrowserClient } from "@supabase/ssr";
import { getWebEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

function buildBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getWebEnv();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

let browserClient: ReturnType<typeof buildBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  browserClient = buildBrowserClient();
  return browserClient;
}
