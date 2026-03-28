import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWebEnv } from "@/lib/env";

let browserClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getWebEnv();

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
