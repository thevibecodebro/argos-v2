import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import { consumeVoiceMinutes } from "@/lib/billing/voice-entitlements";
import { createEffectiveTenantBillingRepository } from "@/lib/platform/effective-request";
import { createRoleplayRepository } from "@/lib/roleplay/create-repository";
import { getAuthorizedMutableSession } from "@/lib/roleplay/service";
import { createVoiceSegmentsRepository, settleVoiceSegments } from "@/lib/roleplay/voice-segments";
import { readRequestTextWithLimit } from "@/lib/security/request-body";

export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAuthenticatedManagedCapability("roleplay_voice");
  if (!access.ok) return access.response;
  const { id } = await params;
  const session = await getAuthorizedMutableSession(createRoleplayRepository(), access.user.id, id);
  if (!session.ok) return Response.json({ error: session.error }, { status: session.status });
  const body = await readRequestTextWithLimit(request, 1024);
  if (!body.ok) return Response.json({ error: "Body too large" }, { status: 400 });
  let input: { segmentId?: string; action?: string };
  try { input = JSON.parse(body.text); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!input || typeof input.segmentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.segmentId) || !["stop", "heartbeat"].includes(input.action ?? "")) {
    return Response.json({ error: "A valid segmentId and action are required" }, { status: 400 });
  }
  const segments = createVoiceSegmentsRepository();
  const now = new Date();
  if (input.action === "heartbeat") {
    if (session.data.status !== "active") return Response.json({ error: "Roleplay session is already complete" }, { status: 409 });
    const segment = await segments.heartbeat(id, input.segmentId, now);
    if (session.data.status !== "active" || segment.stoppedAt || !segment.leaseExpiresAt || segment.leaseExpiresAt <= new Date()) {
      return Response.json({ error: "Voice session expired. Start again." }, { status: 409 });
    }
    return Response.json({ ok: true });
  }
  await segments.stop(id, input.segmentId, now);
  const recorded = await segments.list(id);
  const billing = await createEffectiveTenantBillingRepository(new DrizzleBillingRepository(), access.user.id);
  const result = await settleVoiceSegments(id, recorded, access.user.id, (userId, usage) => consumeVoiceMinutes(billing, userId, usage));
  return result.ok ? Response.json({ ok: true }) : Response.json({ error: result.error }, { status: result.status });
}
