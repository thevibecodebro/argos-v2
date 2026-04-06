import { DrizzleTeamAccessRepository } from "./repository";
import { SupabaseTeamAccessRepository } from "./supabase-repository";

export function createTeamAccessRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleTeamAccessRepository();
  }

  return new SupabaseTeamAccessRepository();
}
