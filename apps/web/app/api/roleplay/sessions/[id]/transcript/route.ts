import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { appendRoleplayTranscriptMessage } from "@/lib/roleplay/service";
import type { RoleplayMessage } from "@/lib/roleplay/types";

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
  const body = (await request.json().catch(() => null)) as
    | { role?: RoleplayMessage["role"]; content?: string }
    | null;
  const content = body?.content?.trim();

  if (!content || (body?.role !== "assistant" && body?.role !== "user")) {
    return Response.json({ error: "role and content are required" }, { status: 400 });
  }

  const result = await appendRoleplayTranscriptMessage(
    createRoleplayRepository(),
    authUser.id,
    id,
    {
      role: body.role,
      content,
    },
  );

  return fromServiceResult(result);
}
