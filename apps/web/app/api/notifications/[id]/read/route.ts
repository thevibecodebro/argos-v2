import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createNotificationsRepository } from "@/lib/notifications/create-repository";
import { markNotificationRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { id } = await params;
  const result = await markNotificationRead(createNotificationsRepository(), authUser.id, id);
  return fromServiceResult(result);
}
