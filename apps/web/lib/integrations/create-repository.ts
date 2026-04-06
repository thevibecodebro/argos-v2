import { DrizzleIntegrationsRepository } from "./repository";
import { SupabaseIntegrationsRepository } from "./supabase-repository";

export function createIntegrationsRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleIntegrationsRepository();
  }

  return new SupabaseIntegrationsRepository();
}
