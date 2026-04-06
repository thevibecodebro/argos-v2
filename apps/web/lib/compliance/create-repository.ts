import { DrizzleComplianceRepository } from "./repository";
import { SupabaseComplianceRepository } from "./supabase-repository";

export function createComplianceRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleComplianceRepository();
  }

  return new SupabaseComplianceRepository();
}
