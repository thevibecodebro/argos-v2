import { extractBuyerPersonalityFromTranscript } from "@argos-v2/call-processing";
import { requireAnyAuthenticatedManagedCapability, requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail } from "@/lib/calls/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { checkRateLimitForPolicy, rateLimitExceededResponse } from "@/lib/rate-limit/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const recordingAccess = await requireAnyAuthenticatedManagedCapability(["call_upload", "call_ingestion"]);
  if (!recordingAccess.ok) return recordingAccess.response;
  const roleplayAccess = await requireAuthenticatedManagedCapability("roleplay");
  if (!roleplayAccess.ok) return roleplayAccess.response;
  const scenarioAccess = await requireAuthenticatedManagedCapability("custom_scenarios");
  if (!scenarioAccess.ok) return scenarioAccess.response;

  const rateLimit = await checkRateLimitForPolicy("buyerPersonality", { type: "user", id: recordingAccess.user.id });
  if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit);

  const body = await request.json().catch(() => null) as { buyerSpeakerLabel?: unknown } | null;
  const buyerSpeakerLabel = typeof body?.buyerSpeakerLabel === "string" ? body.buyerSpeakerLabel.trim() : "";
  if (!buyerSpeakerLabel) return Response.json({ error: "A buyer speaker is required." }, { status: 400 });

  const { id } = await params;
  const repository = await createEffectiveTenantRepository(createCallsRepository(), recordingAccess.user.id);
  const detail = await getCallDetail(repository, recordingAccess.user.id, id);
  if (!detail.ok) return Response.json({ error: detail.error }, { status: detail.status });
  if (!detail.data.transcript?.length || !detail.data.durationSeconds) {
    return Response.json({ code: "transcript_not_ready", error: "The recording transcript is not ready." }, { status: 409 });
  }
  if (!detail.data.transcript.some((line) => line.speaker === buyerSpeakerLabel)) {
    return Response.json({ code: "invalid_buyer_speaker", error: "That speaker is not present in this transcript." }, { status: 422 });
  }

  try {
    const extracted = await extractBuyerPersonalityFromTranscript({
      buyerSpeakerOverride: buyerSpeakerLabel,
      callTopic: detail.data.callTopic,
      durationSeconds: detail.data.durationSeconds,
      transcript: detail.data.transcript,
    });
    await repository.updateBuyerPersonalityProfile({
      callId: id,
      generatedAt: new Date(),
      model: extracted.model,
      profile: extracted.profile,
      status: extracted.profile.confidence === "low" ? "needs_review" : "ready",
    });
    return Response.json({ profile: extracted.profile, status: extracted.profile.confidence === "low" ? "needs_review" : "ready" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to rebuild the buyer personality.";
    const evidenceError = /evidence|speaker/i.test(message);
    return Response.json(
      { error: evidenceError ? message : "Unable to rebuild the buyer personality with the configured provider." },
      { status: evidenceError ? 422 : 502 },
    );
  }
}
