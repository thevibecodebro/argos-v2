import { DrizzleCallsRepository } from "./repository";
import { SupabaseCallsRepository } from "./supabase-repository";

export function createCallsRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleCallsRepository();
  }

  return new SupabaseCallsRepository();
}
