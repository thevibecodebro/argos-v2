import { NextResponse } from "next/server";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { getRoleplayPersonas } from "@/lib/roleplay/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const capabilityAccess = await requireAuthenticatedManagedCapability("roleplay");
  if (!capabilityAccess.ok) return capabilityAccess.response;

  return NextResponse.json(
    { personas: getRoleplayPersonas() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
