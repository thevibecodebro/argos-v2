import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { normalizeFeedbackPayload, sendFeedbackEmail } from "@/lib/feedback/service";
import { unauthorizedJson } from "@/lib/http";
import { createEffectiveTenantUsersRepository } from "@/lib/platform/effective-request";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { createUsersRepository } from "@/lib/users/create-repository";

export const dynamic = "force-dynamic";

function formatFullName(user: {
  email: string;
  firstName?: string | null;
  fullName?: string | null;
  lastName?: string | null;
}) {
  const fromParts = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  if (fromParts) {
    return fromParts;
  }

  return user.fullName?.trim() || user.email;
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const rateLimit = await checkRateLimitForPolicy("feedback", {
    type: "user",
    id: authUser.id,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const usersRepository = await createEffectiveTenantUsersRepository(
    createUsersRepository(),
    authUser.id,
  );
  const caller = await usersRepository.findCurrentUserByAuthId(authUser.id);

  if (!caller) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => null);
  const feedback = normalizeFeedbackPayload(payload);

  if (!feedback.ok) {
    return NextResponse.json(
      {
        code: feedback.code,
        error: feedback.error,
      },
      { status: feedback.status },
    );
  }

  try {
    await sendFeedbackEmail({
      feedback: feedback.data,
      request: {
        userAgent: request.headers.get("user-agent"),
      },
      user: {
        email: caller.email,
        fullName: formatFullName(caller),
        id: caller.id,
        orgName: caller.org?.name ?? null,
        role: caller.role,
      },
    });
  } catch (error) {
    console.error("Failed to send feedback email", error);
    return NextResponse.json(
      {
        code: "feedback_send_failed",
        error: "Feedback could not be sent right now.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
