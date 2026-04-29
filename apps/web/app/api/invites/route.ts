import { NextResponse } from "next/server";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { createUsersRepository } from "@/lib/users/create-repository";
import { sendInvite, listPendingInvites } from "@/lib/invites/service";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const usersRepository = createUsersRepository();
  const caller = await usersRepository.findCurrentUserByAuthId(authUser.id);

  if (!caller) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!caller.orgId) {
    return NextResponse.json(
      { error: "You are not part of an organization" },
      { status: 400 },
    );
  }

  if (caller.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can send invites" },
      { status: 403 },
    );
  }

  const rateLimit = await checkRateLimitForPolicy("invites", {
    type: "org",
    id: caller.orgId,
  });

  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit);
  }

  const payload = (await request.json()) as {
    email?: unknown;
    role?: unknown;
    teamIds?: unknown;
  };

  try {
    const result = await sendInvite(
      createInvitesRepository(),
      usersRepository,
      authUser.id,
      payload,
      { caller },
    );
    return fromServiceResult(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to send invite:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const result = await listPendingInvites(
    createInvitesRepository(),
    createUsersRepository(),
    authUser.id,
  );

  return fromServiceResult(result);
}
