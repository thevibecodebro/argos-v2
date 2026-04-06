import { DrizzleTrainingRepository } from "./repository";
import { SupabaseTrainingRepository } from "./supabase-repository";

export function createTrainingRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleTrainingRepository();
  }

  return new SupabaseTrainingRepository();
}
