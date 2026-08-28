import { Resend } from "resend";
import type { AppUserRole } from "@/lib/users/roles";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required environment variable: RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

function getInviteFrom() {
  return (
    process.env.ARGOS_ONBOARDING_FROM?.trim() ||
    process.env.ARGOS_FEEDBACK_FROM?.trim() ||
    "Argos <onboarding@resend.dev>"
  );
}

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  orgName: string,
  role: AppUserRole,
  options: { authMethod?: "google" | "magic-link" } = {},
): Promise<void> {
  const escapedEmail = escapeHtml(to);
  const escapedInviteUrl = escapeHtml(inviteUrl);
  const escapedOrgName = escapeHtml(orgName);
  const escapedRole = escapeHtml(role);
  const authInstructions =
    options.authMethod === "google"
      ? `<p>Continue with Google using ${escapedEmail}.</p>`
      : "";
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: getInviteFrom(),
    to,
    subject: `You've been invited to join ${orgName} on Argos`,
    html: `
      <p>You've been invited to join <strong>${escapedOrgName}</strong> as a <strong>${escapedRole}</strong>.</p>
      ${authInstructions}
      <p><a href="${escapedInviteUrl}">Accept your invite</a></p>
      <p>This link expires in 7 days.</p>
    `,
  });

  if (error) {
    console.error("[Resend] send error:", JSON.stringify(error));
    throw new Error(`Resend error [${(error as { name?: string }).name ?? "unknown"}]: ${error.message}`);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
