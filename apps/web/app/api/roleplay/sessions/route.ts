import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { createRoleplaySession, listRoleplaySessions } from "@/lib/roleplay/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const repository = await createEffectiveTenantRepository(createRoleplayRepository(), authUser.id);
  const result = await listRoleplaySessions(repository, authUser.id);
  return fromServiceResult(result);
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const body = (await request.json().catch(() => null)) as { personaId?: string } | null;
  const personaId = body?.personaId?.trim();

  if (!personaId) {
    return Response.json({ error: "personaId is required" }, { status: 400 });
  }

  const repository = await createEffectiveTenantRepository(createRoleplayRepository(), authUser.id);
  const result = await createRoleplaySession(repository, authUser.id, personaId);
  return fromServiceResult(result);
}
