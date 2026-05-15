import { Resend } from "resend";
import type { BillingPlan } from "./plans";

const PRODUCT_NAME = "Argos Revenue Command";
const PRODUCT_URL = "https://argosrevenuecommand.com";

type EmailSendResult = {
  data?: { id?: string | null } | null;
  error?: { message?: string; name?: string } | null;
};

export type BillingOnboardingEmailClient = {
  emails: {
    send(input: {
      from: string;
      html: string;
      subject: string;
      text: string;
      to: string;
    }): Promise<EmailSendResult>;
  };
};

type BillingOnboardingEmailEnv = {
  ARGOS_FEEDBACK_FROM?: string | undefined;
  ARGOS_ONBOARDING_URL?: string | undefined;
  ARGOS_ONBOARDING_FROM?: string | undefined;
  RESEND_API_KEY?: string | undefined;
  [key: string]: string | undefined;
};

export type SendBillingOnboardingEmailInput = {
  checkoutSessionId: string | null;
  email: string;
  fullName: string | null;
  orgName: string | null;
  plan: BillingPlan;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
};

function getRequiredEnvValue(env: BillingOnboardingEmailEnv, key: keyof BillingOnboardingEmailEnv) {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getOnboardingEmailClient(
  env: BillingOnboardingEmailEnv = process.env,
): BillingOnboardingEmailClient {
  const apiKey = getRequiredEnvValue(env, "RESEND_API_KEY");
  return new Resend(apiKey) as BillingOnboardingEmailClient;
}

function normalizeUrl(url: string) {
  const withProtocol = url.startsWith("http") ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, "");
}

function getSiteUrl(env: BillingOnboardingEmailEnv) {
  const rawSiteUrl = env.ARGOS_ONBOARDING_URL;

  return rawSiteUrl ? normalizeUrl(rawSiteUrl) : PRODUCT_URL;
}

function getOnboardingFrom(env: BillingOnboardingEmailEnv) {
  return (
    env.ARGOS_ONBOARDING_FROM?.trim() ||
    env.ARGOS_FEEDBACK_FROM?.trim() ||
    `${PRODUCT_NAME} <onboarding@resend.dev>`
  );
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getGreetingName(input: SendBillingOnboardingEmailInput) {
  const name = input.fullName ? collapseWhitespace(input.fullName) : "";

  if (!name) {
    return "there";
  }

  return name.split(" ")[0] ?? "there";
}

function getOnboardingSteps(plan: BillingPlan) {
  if (plan.metadata.plan === "team") {
    return [
      "Invite your team from Settings > People.",
      `Upload a real sales call so ${PRODUCT_NAME} can score the conversation.`,
      "Use Roleplay to practice the next version of the pitch.",
    ];
  }

  return [
    `Upload a real sales call so ${PRODUCT_NAME} can score the conversation.`,
    "Review the strongest moments and the biggest missed opportunities.",
    "Use Roleplay to practice the next version of the pitch.",
  ];
}

function isTeamPlan(plan: BillingPlan) {
  return plan.metadata.plan === "team";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getWorkspaceIntroText(input: SendBillingOnboardingEmailInput) {
  const orgName = input.orgName ? collapseWhitespace(input.orgName) : "";

  return orgName
    ? `You're in. ${orgName} is set up on ${PRODUCT_NAME}.`
    : `You're in. Your ${PRODUCT_NAME} workspace is ready.`;
}

function getWorkspaceIntroHtml(input: SendBillingOnboardingEmailInput) {
  const orgName = input.orgName ? collapseWhitespace(input.orgName) : "";

  return orgName
    ? `You're in. ${escapeHtml(orgName)} is set up on ${escapeHtml(PRODUCT_NAME)}.`
    : `You're in. Your ${escapeHtml(PRODUCT_NAME)} workspace is ready.`;
}

function getFirstMoveText(plan: BillingPlan) {
  const audience = isTeamPlan(plan) ? "your team" : "you";

  return `The best first move is simple: upload one real sales call. ${PRODUCT_NAME} will score the conversation, pull out the moments that matter, and give ${audience} a roleplay path to practice from.`;
}

function getSetupNote(plan: BillingPlan) {
  if (isTeamPlan(plan)) {
    return "If you're setting this up for your team, start with one call from a real rep. That gives everyone something concrete to review instead of landing in an empty workspace.";
  }

  return "Start with a recent call while the details are still fresh. The first scorecard gives you a practical coaching path instead of another blank dashboard.";
}

function buildTextEmail(input: SendBillingOnboardingEmailInput, dashboardUrl: string) {
  const steps = getOnboardingSteps(input.plan)
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");

  return [
    `Hi ${getGreetingName(input)},`,
    "",
    getWorkspaceIntroText(input),
    "",
    getFirstMoveText(input.plan),
    "",
    "Start here:",
    steps,
    "",
    `Open your workspace: ${dashboardUrl}`,
    "",
    getSetupNote(input.plan),
    "",
    PRODUCT_NAME,
    "",
    `You received this because this email was used to start a paid subscription to ${PRODUCT_NAME}.`,
  ].join("\n");
}

function buildHtmlEmail(input: SendBillingOnboardingEmailInput, dashboardUrl: string) {
  const steps = getOnboardingSteps(input.plan)
    .map((step) => `<li style="margin:0 0 10px;">${escapeHtml(step)}</li>`)
    .join("");
  const previewText = "Start with one sales call. Turn it into coaching, scoring, and roleplay.";

  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(previewText)}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f3f4f6;margin:0;padding:0;width:100%;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;max-width:640px;overflow:hidden;width:100%;">
            <tr>
              <td style="background:#080b12;padding:28px 32px;">
                <div style="color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:700;letter-spacing:0;">
                  ${escapeHtml(PRODUCT_NAME)}
                </div>
                <div style="color:#9ca3af;font-family:Arial,sans-serif;font-size:13px;margin-top:6px;">
                  Sales calls into coaching, scoring, and roleplay.
                </div>
              </td>
            </tr>
            <tr>
              <td style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;padding:32px;">
                <p style="font-size:15px;margin:0 0 16px;">Hi ${escapeHtml(getGreetingName(input))},</p>
                <h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#111827;font-weight:700;">Your workspace is ready.</h1>
                <p style="font-size:16px;margin:0 0 16px;">${getWorkspaceIntroHtml(input)}</p>
                <p style="font-size:16px;margin:0 0 22px;">${escapeHtml(getFirstMoveText(input.plan))}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 28px;">
                  <tr>
                    <td style="background:#111827;border-radius:8px;">
                      <a href="${escapeHtml(dashboardUrl)}" style="color:#ffffff;display:inline-block;font-family:Arial,sans-serif;font-size:15px;font-weight:700;padding:13px 18px;text-decoration:none;">Open your workspace</a>
                    </td>
                  </tr>
                </table>
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:0 0 22px;">
                  <p style="font-size:14px;font-weight:700;margin:0 0 10px;color:#111827;">Start here</p>
                  <ol style="font-size:14px;margin:0;padding-left:20px;color:#374151;">${steps}</ol>
                </div>
                <p style="font-size:14px;margin:0;color:#4b5563;">${escapeHtml(getSetupNote(input.plan))}</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e5e7eb;color:#6b7280;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;padding:20px 32px;">
                <p style="margin:0 0 6px;">${escapeHtml(PRODUCT_NAME)}</p>
                <p style="margin:0;">You received this because this email was used to start a paid subscription to ${escapeHtml(PRODUCT_NAME)}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

export async function sendBillingOnboardingEmail(
  input: SendBillingOnboardingEmailInput,
  options: {
    client?: BillingOnboardingEmailClient;
    env?: BillingOnboardingEmailEnv;
  } = {},
) {
  const env = options.env ?? process.env;
  const dashboardUrl = `${getSiteUrl(env)}/dashboard`;
  const client = options.client ?? getOnboardingEmailClient(env);
  const { data, error } = await client.emails.send({
    from: getOnboardingFrom(env),
    html: buildHtmlEmail(input, dashboardUrl),
    subject: `Your ${PRODUCT_NAME} workspace is ready`,
    text: buildTextEmail(input, dashboardUrl),
    to: input.email,
  });

  if (error) {
    console.error("[Resend] billing onboarding send error:", JSON.stringify(error));
    throw new Error(
      `Resend error [${error.name ?? "unknown"}]: ${error.message ?? "Unknown error"}`,
    );
  }

  return { id: data?.id ?? null };
}
