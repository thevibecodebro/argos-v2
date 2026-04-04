import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createNotificationsRepository } from "@/lib/notifications/create-repository";
import { markAllNotificationsRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function POST() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await markAllNotificationsRead(createNotificationsRepository(), authUser.id);
  return fromServiceResult(result);
}
