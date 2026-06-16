import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { appendRoleplayMessage } from "@/lib/roleplay/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { content?: string } | null;
  const content = body?.content?.trim();

  if (!content) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  const repository = await createEffectiveTenantRepository(createRoleplayRepository(), authUser.id);
  const result = await appendRoleplayMessage(repository, authUser.id, id, {
    content,
  });
  return fromServiceResult(result);
}
