import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import {
  assertRoleplayContentAllowed,
  roleplayContentPolicyResponse,
} from "@/lib/roleplay/content-policy";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { appendRoleplayTranscriptMessage } from "@/lib/roleplay/service";
import {
  MAX_ROLEPLAY_TEXT_CONTENT_LENGTH,
  readRoleplayTextJsonBody,
  roleplayTextContentTooLargeResponse,
} from "@/lib/roleplay/text-route-guardrails";
import type { RoleplayMessage } from "@/lib/roleplay/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const bodyResult = await readRoleplayTextJsonBody(request);

  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const rateLimit = await checkRateLimitForPolicy("roleplayTranscript", {
    type: "user",
    id: authUser.id,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const { id } = await params;
  const body = bodyResult.body as { role?: RoleplayMessage["role"]; content?: string } | null;
  const content = body?.content?.trim();

  if (!content || (body?.role !== "assistant" && body?.role !== "user")) {
    return Response.json({ error: "role and content are required" }, { status: 400 });
  }

  if (content.length > MAX_ROLEPLAY_TEXT_CONTENT_LENGTH) {
    return roleplayTextContentTooLargeResponse();
  }

  const contentPolicy = await assertRoleplayContentAllowed({
    content,
    surface: "roleplay_transcript",
  });

  if (!contentPolicy.ok) {
    return roleplayContentPolicyResponse(contentPolicy);
  }

  const repository = await createEffectiveTenantRepository(createRoleplayRepository(), authUser.id);
  const result = await appendRoleplayTranscriptMessage(
    repository,
    authUser.id,
    id,
    {
      role: body.role,
      content,
    },
  );

  return fromServiceResult(result);
}
