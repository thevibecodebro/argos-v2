import { DrizzleRoleplayRepository } from "./repository";
import { SupabaseRoleplayRepository } from "./supabase-repository";

export function createRoleplayRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleRoleplayRepository();
  }

  return new SupabaseRoleplayRepository();
}
