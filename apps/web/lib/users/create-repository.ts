import { DrizzleUsersRepository } from "./repository";
import { SupabaseUsersRepository } from "./supabase-repository";

export function createUsersRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleUsersRepository();
  }

  return new SupabaseUsersRepository();
}
