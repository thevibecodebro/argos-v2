import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createNotificationsRepository } from "@/lib/notifications/create-repository";
import { getNotifications } from "@/lib/notifications/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const repository = await createEffectiveTenantRepository(createNotificationsRepository(), authUser.id);
  const result = await getNotifications(repository, authUser.id);
  return fromServiceResult(result);
}
