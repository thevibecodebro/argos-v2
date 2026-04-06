import { LegacyAuthShell } from "@/components/legacy-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createInvitesRepository } from "@/lib/invites/create-repository";
import { InviteAcceptButton } from "./invite-accept-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
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
          <h1 className="text-3xl font-semibold text-white">Invite Not Found</h1>
          <p className="mt-4 text-[#8696ba]">This invite link is invalid or has already been used.</p>
        </div>
      </LegacyAuthShell>
    );
  }

  if (invite.expiresAt < new Date()) {
    return (
      <LegacyAuthShell note="This invite has expired.">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Invite Expired</h1>
          <p className="mt-4 text-[#8696ba]">Ask your admin to send a new invite.</p>
        </div>
      </LegacyAuthShell>
    );
  }

  if (invite.acceptedAt) {
    return (
      <LegacyAuthShell note="This invite has already been accepted.">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Already Accepted</h1>
          <p className="mt-4 text-[#8696ba]">This invite has already been used.</p>
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
          <h1 className="text-3xl font-semibold text-white">You&apos;re Invited</h1>
          <p className="mt-4 text-[#8696ba]">Sign in to accept your invite.</p>
          <a
            className="mt-6 inline-block rounded-[1.1rem] bg-[#2c63f6] px-6 py-3 text-base font-semibold text-white hover:bg-[#4476ff]"
            href={`/login?next=${next}`}
          >
            Sign In to Accept
          </a>
        </div>
      </LegacyAuthShell>
    );
  }

  // Email mismatch
  if (user.email !== invite.email) {
    return (
      <LegacyAuthShell note="Wrong account.">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white">Wrong Account</h1>
          <p className="mt-4 text-[#8696ba]">
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
        <h1 className="text-3xl font-semibold text-white">You&apos;re Invited</h1>
        <p className="mt-4 text-[#8696ba]">
          Accept your invite to join as a <strong className="text-white">{invite.role}</strong>.
        </p>
        <div className="mt-6">
          <InviteAcceptButton token={token} />
        </div>
      </div>
    </LegacyAuthShell>
  );
}
