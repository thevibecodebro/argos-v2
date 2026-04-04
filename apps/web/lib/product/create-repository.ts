import { DrizzleProductRepository } from "./repository";
import { SupabaseProductRepository } from "./supabase-repository";

export function createProductRepository() {
  if (process.env.DATABASE_URL) {
    return new DrizzleProductRepository();
  }

  return new SupabaseProductRepository();
}
