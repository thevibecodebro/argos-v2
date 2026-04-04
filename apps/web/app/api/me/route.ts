import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails, updateCurrentUserProfile } from "@/lib/users/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    return fromServiceResult(await getCurrentUserDetails(createUsersRepository(), authUser.id));
  } catch (error) {
    console.error("Failed to load current user profile", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const payload = (await request.json()) as { firstName?: unknown; lastName?: unknown };

    return fromServiceResult(
      await updateCurrentUserProfile(createUsersRepository(), authUser.id, payload),
    );
  } catch (error) {
    console.error("Failed to update current user profile", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
