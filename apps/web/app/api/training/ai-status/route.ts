import { NextResponse } from "next/server";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { getTrainingAiStatus } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const capabilityAccess = await requireAuthenticatedManagedCapability("training");
  if (!capabilityAccess.ok) return capabilityAccess.response;

  const status = getTrainingAiStatus();
  return NextResponse.json({ available: status.available });
}
