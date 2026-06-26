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
import { appendRoleplayMessage } from "@/lib/roleplay/service";
import {
  MAX_ROLEPLAY_TEXT_CONTENT_LENGTH,
  readRoleplayTextJsonBody,
  roleplayTextContentTooLargeResponse,
} from "@/lib/roleplay/text-route-guardrails";

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

  const rateLimit = await checkRateLimitForPolicy("roleplayMessage", {
    type: "user",
    id: authUser.id,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const { id } = await params;
  const body = bodyResult.body as { content?: string } | null;
  const content = body?.content?.trim();

  if (!content) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  if (content.length > MAX_ROLEPLAY_TEXT_CONTENT_LENGTH) {
    return roleplayTextContentTooLargeResponse();
  }

  const contentPolicy = await assertRoleplayContentAllowed({
    content,
    surface: "roleplay_message",
  });

  if (!contentPolicy.ok) {
    return roleplayContentPolicyResponse(contentPolicy);
  }

  const repository = await createEffectiveTenantRepository(createRoleplayRepository(), authUser.id);
  const result = await appendRoleplayMessage(repository, authUser.id, id, {
    content,
  });
  return fromServiceResult(result);
}
