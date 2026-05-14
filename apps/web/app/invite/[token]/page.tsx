import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { normalizeInviteEmail } from "@/lib/invites/service";
import { checkRateLimitForPolicy } from "@/lib/rate-limit/service";
import {
  InviteAccessShell,
  InviteActionPanel,
  InvitePrimaryLink,
  InvitePrimarySignOutButton,
  InviteSecondaryLink,
} from "@/components/invite/invite-access-shell";
import { InviteAcceptButton } from "./invite-accept-button";

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
      <InviteAccessShell
        description="We paused this invite lookup to protect the workspace."
        heading="Invite temporarily unavailable"
        note="Try this invite link again later."
        showInviteChips={false}
      >
        <InviteActionPanel
          description="Too many invite checks were made from this network. Wait a few minutes, then reopen the invite link."
          title="Invite lookup paused"
          tone="muted"
        />
      </InviteAccessShell>
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
      <InviteAccessShell
        description="This invite link is invalid or has already been used."
        heading="Invite not found"
        note="Ask your admin to send a new invite."
        showInviteChips={false}
      >
        <InviteActionPanel
          description="We could not match this link to an active Argos workspace invitation."
          title="Invite no longer valid"
          tone="danger"
        />
      </InviteAccessShell>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <InviteAccessShell
        description="This invite is past its expiration window."
        heading="Invite expired"
        note="Ask your admin to send a new invite."
        role={invite.role}
      >
        <InviteActionPanel
          description="For workspace security, expired invite links cannot be accepted."
          title="Invite expired"
          tone="danger"
        />
      </InviteAccessShell>
    );
  }

  if (invite.acceptedAt) {
    return (
      <InviteAccessShell
        description="This invite has already been used."
        heading="Already accepted"
        note="Sign in with the accepted account to continue."
        role={invite.role}
      >
        <InviteActionPanel
          description="The invite token is closed. Use the account that accepted this invitation, or ask your admin for a fresh link."
          title="Invite already accepted"
          tone="muted"
        >
          <InvitePrimaryLink href="/login">Go to login</InvitePrimaryLink>
        </InviteActionPanel>
      </InviteAccessShell>
    );
  }

  // Unauthenticated
  if (!user) {
    const next = encodeURIComponent(`/invite/${token}`);
    return (
      <InviteAccessShell
        description="Use the work email your admin invited. If you're setting up Argos for your organization, choose a plan instead."
        heading="Sign in to accept this invite"
        note="No invite yet? Ask your admin or start an organization by signing up."
        role={invite.role}
      >
        <InviteActionPanel
          description="Use the email your admin invited. We'll return you to this invite after authentication."
          title="Accept your invite"
        >
          <InvitePrimaryLink href={`/login?next=${next}`}>Sign in to accept</InvitePrimaryLink>
          <InviteSecondaryLink href="/login">Use a different email</InviteSecondaryLink>
        </InviteActionPanel>
      </InviteAccessShell>
    );
  }

  // Email mismatch
  if (normalizeInviteEmail(user.email ?? "") !== normalizeInviteEmail(invite.email)) {
    return (
      <InviteAccessShell
        description="This invite was sent to a different email address."
        heading="Wrong account"
        note="Sign out, then use the email address your admin invited."
        role={invite.role}
      >
        <InviteActionPanel
          description="The current signed-in email does not match this invite. Use the invited email to protect workspace access."
          title="Email does not match"
          tone="danger"
        >
          <InvitePrimarySignOutButton>Use a different email</InvitePrimarySignOutButton>
        </InviteActionPanel>
      </InviteAccessShell>
    );
  }

  // Ready to accept
  return (
    <InviteAccessShell
      description="We found a matching invitation for your signed-in email."
      heading="Joining your workspace"
      note="Redirecting to the dashboard."
      role={invite.role}
    >
      <InviteActionPanel
        description={`Accepting your ${invite.role} invite now.`}
        title="Invite confirmed"
      >
        <div className="flex justify-center">
          <InviteAcceptButton autoAccept token={token} />
        </div>
      </InviteActionPanel>
    </InviteAccessShell>
  );
}
