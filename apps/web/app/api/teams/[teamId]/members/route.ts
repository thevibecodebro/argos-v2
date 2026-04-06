import { NextResponse } from "next/server";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createTeamAccessRepository } from "@/lib/team-access/create-repository";
import {
  addTeamManagerMembership,
  addTeamRepMembership,
  removeTeamMembership,
} from "@/lib/team-access/service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ teamId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { teamId } = await context.params;
  const payload = (await request.json()) as {
    membershipType?: unknown;
    userId?: unknown;
  };

  if (payload.membershipType === "manager") {
    return fromServiceResult(
      await addTeamManagerMembership(createTeamAccessRepository(), authUser.id, {
        teamId,
        userId: payload.userId,
      }),
    );
  }

  if (payload.membershipType !== "rep") {
    return NextResponse.json({ error: "membershipType must be manager or rep" }, { status: 400 });
  }

  return fromServiceResult(
    await addTeamRepMembership(createTeamAccessRepository(), authUser.id, {
      teamId,
      userId: payload.userId,
    }),
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { teamId } = await context.params;
  const payload = (await request.json()) as {
    membershipType?: unknown;
    userId?: unknown;
  };

  return fromServiceResult(
    await removeTeamMembership(createTeamAccessRepository(), authUser.id, {
      teamId,
      userId: payload.userId,
      membershipType: payload.membershipType,
    }),
  );
}
