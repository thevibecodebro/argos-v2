import { Resend } from "resend";
import type { AppUserRole } from "@/lib/users/roles";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required environment variable: RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  orgName: string,
  role: AppUserRole,
): Promise<void> {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: "Argos <onboarding@resend.dev>",
    to,
    subject: `You've been invited to join ${orgName} on Argos`,
    html: `
      <p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
      <p><a href="${inviteUrl}">Accept your invite</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });

  if (error) {
    console.error("[Resend] send error:", JSON.stringify(error));
    throw new Error(`Resend error [${(error as { name?: string }).name ?? "unknown"}]: ${error.message}`);
  }
}
