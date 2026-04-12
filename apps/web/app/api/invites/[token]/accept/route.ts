import { unauthorizedJson, fromServiceResult } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { getDb } from "@argos-v2/db";
import { DrizzleInvitesRepository } from "@/lib/invites/supabase-repository";
import { DrizzleOnboardingRepository } from "@/lib/onboarding/repository";
import { commitInviteAcceptance } from "@/lib/invites/service";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { createOnboardingRepository } from "@/lib/onboarding/create-repository";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { token } = await params;

  // Pre-checks (outside transaction)
  const repo = createInvitesRepository();
  const onboardingRepo = createOnboardingRepository();

  const caller = await onboardingRepo.findCurrentUserByAuthId(authUser.id);

  if (!caller) {
    return fromServiceResult({ ok: false, status: 404, error: "User not found" });
  }

  if (caller.org) {
    return fromServiceResult({ ok: false, status: 400, error: "You already belong to an organization" });
  }

  const invite = await repo.findInviteByToken(token);

  if (!invite) {
    return fromServiceResult({ ok: false, status: 404, error: "Invite not found" });
  }

  if (invite.expiresAt < new Date()) {
    return fromServiceResult({ ok: false, status: 410, error: "This invite has expired" });
  }

  if (invite.acceptedAt) {
    return fromServiceResult({ ok: false, status: 400, error: "Invite has already been accepted" });
  }

  if (caller.email !== invite.email) {
    return fromServiceResult({ ok: false, status: 403, error: "This invite was sent to a different email address" });
  }

  // Mutating steps (inside transaction)
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const txRepo = new DrizzleInvitesRepository(tx);
    const txOnboardingRepo = new DrizzleOnboardingRepository(tx);
    const callerRecord = { id: caller.id, email: caller.email, orgId: caller.org?.id ?? null };
    return commitInviteAcceptance(txRepo, txOnboardingRepo, callerRecord, invite);
  });

  return fromServiceResult(result);
}
