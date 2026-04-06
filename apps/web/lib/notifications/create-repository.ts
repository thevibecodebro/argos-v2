import { DrizzleNotificationsRepository } from "./repository";
import { SupabaseNotificationsRepository } from "./supabase-repository";

export function createNotificationsRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleNotificationsRepository();
  }

  return new SupabaseNotificationsRepository();
}
