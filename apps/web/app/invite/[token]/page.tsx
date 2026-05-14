import { LegacyAuthShell } from "@/components/legacy-shell";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { normalizeInviteEmail } from "@/lib/invites/service";
import { checkRateLimitForPolicy } from "@/lib/rate-limit/service";
import { InviteAcceptButton } from "./invite-accept-button";

const inviteHeadingClass = "font-[var(--font-display)] text-3xl font-semibold text-[var(--forge-text)]";
const inviteBodyClass = "mt-4 text-[var(--forge-muted)]";
const inviteLinkClass = "forge-button forge-button-primary forge-focus-ring mt-6 inline-flex px-6 py-3 text-sm";

async function getInviteLookupClientIp() {
  const requestHeaders = await headers();
  const vercelForwardedFor = requestHeaders.get("x-vercel-forwarded-for");
  const vercelIp = vercelForwardedFor?.split(",")[0]?.trim();

  if (vercelIp) {
    return vercelIp;
  }

  const realIp = requestHeaders.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();

  if (forwardedIp) {
    return forwardedIp;
  }

  return "unknown";
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const rateLimit = await checkRateLimitForPolicy("inviteLookup", {
    type: "ip",
    id: await getInviteLookupClientIp(),
  });

  if (!rateLimit.allowed) {
    return (
      <LegacyAuthShell note="Too many invite checks.">
        <div className="text-center">
          <h1 className={inviteHeadingClass}>Invite Temporarily Unavailable</h1>
          <p className={inviteBodyClass}>Try this invite link again later.</p>
        </div>
      </LegacyAuthShell>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const repo = createInvitesRepository();
  const invite = await repo.findInviteByToken(token);

  // Invalid / expired / accepted states
  if (!invite) {
    return (
      <LegacyAuthShell note="This invite is no longer valid.">
        <div className="text-center">
          <h1 className={inviteHeadingClass}>Invite Not Found</h1>
          <p className={inviteBodyClass}>This invite link is invalid or has already been used.</p>
        </div>
      </LegacyAuthShell>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <LegacyAuthShell note="This invite has expired.">
        <div className="text-center">
          <h1 className={inviteHeadingClass}>Invite Expired</h1>
          <p className={inviteBodyClass}>Ask your admin to send a new invite.</p>
        </div>
      </LegacyAuthShell>
    );
  }

  if (invite.acceptedAt) {
    return (
      <LegacyAuthShell note="This invite has already been accepted.">
        <div className="text-center">
          <h1 className={inviteHeadingClass}>Already Accepted</h1>
          <p className={inviteBodyClass}>This invite has already been used.</p>
        </div>
      </LegacyAuthShell>
    );
  }

  // Unauthenticated
  if (!user) {
    const next = encodeURIComponent(`/invite/${token}`);
    return (
      <LegacyAuthShell note={`You've been invited to join as a ${invite.role}.`}>
        <div className="text-center">
          <h1 className={inviteHeadingClass}>You&apos;re Invited</h1>
          <p className={inviteBodyClass}>Sign in to accept your invite.</p>
          <a
            className={inviteLinkClass}
            href={`/login?next=${next}`}
          >
            Sign In to Accept
          </a>
        </div>
      </LegacyAuthShell>
    );
  }

  // Email mismatch
  if (normalizeInviteEmail(user.email ?? "") !== normalizeInviteEmail(invite.email)) {
    return (
      <LegacyAuthShell note="Wrong account.">
        <div className="text-center">
          <h1 className={inviteHeadingClass}>Wrong Account</h1>
          <p className={inviteBodyClass}>
            This invite was sent to a different email address.
          </p>
        </div>
      </LegacyAuthShell>
    );
  }

  // Ready to accept
  return (
    <LegacyAuthShell note={`You've been invited to join as a ${invite.role}.`}>
      <div className="text-center">
        <h1 className={inviteHeadingClass}>You&apos;re Invited</h1>
        <p className={inviteBodyClass}>
          Accept your invite to join as a <strong className="text-[var(--forge-text)]">{invite.role}</strong>.
        </p>
        <div className="mt-6">
          <InviteAcceptButton token={token} />
        </div>
      </div>
    </LegacyAuthShell>
  );
}
