import { NextResponse } from "next/server";
import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { activateRecordingConsent } from "@/lib/compliance/service";
import { createComplianceRepository } from "@/lib/compliance/create-repository";

export const dynamic = "force-dynamic";

function getIpAddress(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const payload = (await request.json()) as {
      eventType?: unknown;
      tosVersion?: unknown;
      metadata?: Record<string, unknown>;
    };

    return fromServiceResult(
      await activateRecordingConsent(createComplianceRepository(), authUser.id, {
        ...payload,
        ipAddress: getIpAddress(request.headers),
        userAgent: request.headers.get("user-agent") ?? "unknown",
      }),
    );
  } catch (error) {
    console.error("Failed to activate recording consent", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
