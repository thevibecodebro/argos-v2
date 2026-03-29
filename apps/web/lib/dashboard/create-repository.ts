import { DrizzleDashboardRepository } from "./repository";
import { SupabaseDashboardRepository } from "./supabase-repository";

export function createDashboardRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleDashboardRepository();
  }

  return new SupabaseDashboardRepository();
}
