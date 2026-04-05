import { DrizzleAccessRepository } from "./repository";
import { SupabaseAccessRepository } from "./supabase-repository";

export function createAccessRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleAccessRepository();
  }

  return new SupabaseAccessRepository();
}
