import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createNotificationsRepository } from "@/lib/notifications/create-repository";
import { getNotifications } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await getNotifications(createNotificationsRepository(), authUser.id);
  return fromServiceResult(result);
}
