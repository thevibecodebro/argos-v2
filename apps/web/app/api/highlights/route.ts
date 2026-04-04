import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listHighlights } from "@/lib/calls/service";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await listHighlights(createCallsRepository(), authUser.id);
  return fromServiceResult(result);
}
