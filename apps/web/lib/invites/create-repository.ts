import { DrizzleInvitesRepository } from "./supabase-repository";

export function createInvitesRepository() {
  return new DrizzleInvitesRepository();
}
