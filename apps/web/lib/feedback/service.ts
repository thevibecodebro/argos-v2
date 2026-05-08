import { Resend } from "resend";
import type { AppUserRole } from "@/lib/users/roles";

export type FeedbackCategory = "bug" | "feedback" | "question";

export type NormalizedFeedback = {
  category: FeedbackCategory;
  message: string;
  pagePath: string | null;
  subject: string | null;
};

export type FeedbackEmailClient = {
  emails: {
    send(input: {
      from: string;
      html: string;
      replyTo: string;
      subject: string;
      text: string;
      to: string;
    }): Promise<{
      data?: { id?: string | null } | null;
      error?: { message?: string; name?: string } | null;
    }>;
  };
};

type FeedbackEmailEnv = {
  ARGOS_FEEDBACK_FROM?: string | undefined;
  ARGOS_FEEDBACK_TO?: string | undefined;
  RESEND_API_KEY?: string | undefined;
  [key: string]: string | undefined;
};

type NormalizedFeedbackResult =
  | { ok: true; data: NormalizedFeedback }
  | {
      ok: false;
      status: 400;
      code: "invalid_feedback";
      error: string;
    };

type SendFeedbackEmailInput = {
  feedback: NormalizedFeedback;
  request: {
    userAgent: string | null;
  };
  user: {
    email: string;
    fullName: string;
    id: string;
    orgName?: string | null;
    role: AppUserRole | null;
  };
};

const feedbackCategoryLabels: Record<FeedbackCategory, string> = {
  bug: "Bug",
  feedback: "Feedback",
  question: "Question",
};

function invalidFeedback(error: string): NormalizedFeedbackResult {
  return {
    code: "invalid_feedback",
    error,
    ok: false,
    status: 400,
  };
}

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return payload as Record<string, unknown>;
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getOptionalString(
  value: unknown,
  options: { maxLength: number },
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = collapseWhitespace(value);
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, options.maxLength);
}

export function normalizeFeedbackPayload(
  payload: unknown,
): NormalizedFeedbackResult {
  const input = asRecord(payload);

  if (!input) {
    return invalidFeedback("Feedback details are required.");
  }

  const category = input.category;
  if (category !== "bug" && category !== "feedback" && category !== "question") {
    return invalidFeedback("Choose bug, feedback, or question.");
  }

  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (message.length < 10) {
    return invalidFeedback("Feedback must be at least 10 characters.");
  }

  if (message.length > 4000) {
    return invalidFeedback("Feedback must be 4000 characters or less.");
  }

  const subject = getOptionalString(input.subject, { maxLength: 140 });
  const pagePath = getOptionalString(input.pagePath, { maxLength: 300 });

  return {
    ok: true,
    data: {
      category,
      message,
      pagePath,
      subject,
    },
  };
}

function getRequiredEnvValue(env: FeedbackEmailEnv, key: keyof FeedbackEmailEnv) {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getFeedbackEmailConfig(env: FeedbackEmailEnv = process.env) {
  return {
    from: getRequiredEnvValue(env, "ARGOS_FEEDBACK_FROM"),
    to: getRequiredEnvValue(env, "ARGOS_FEEDBACK_TO"),
  };
}

function getFeedbackEmailClient(
  env: FeedbackEmailEnv = process.env,
): FeedbackEmailClient {
  const apiKey = getRequiredEnvValue(env, "RESEND_API_KEY");
  return new Resend(apiKey) as FeedbackEmailClient;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMultilineHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function buildFeedbackEmailSubject(feedback: NormalizedFeedback) {
  const label = feedbackCategoryLabels[feedback.category];
  const summary = feedback.subject ?? collapseWhitespace(feedback.message).slice(0, 80);

  return `[Argos] ${label}: ${summary}`;
}

function formatUserLine(user: SendFeedbackEmailInput["user"]) {
  return `${user.fullName} <${user.email}>`;
}

function buildFeedbackText(input: SendFeedbackEmailInput) {
  const label = feedbackCategoryLabels[input.feedback.category];
  const contextLines = [
    `Category: ${label}`,
    `Subject: ${input.feedback.subject ?? "No subject"}`,
    `From: ${formatUserLine(input.user)}`,
    `Organization: ${input.user.orgName ?? "Unknown organization"}`,
    `Role: ${input.user.role ?? "Unknown role"}`,
    `User ID: ${input.user.id}`,
    `Page: ${input.feedback.pagePath ?? "Not provided"}`,
    `User agent: ${input.request.userAgent ?? "Not provided"}`,
  ];

  return `${contextLines.join("\n")}\n\n${input.feedback.message}`;
}

function buildFeedbackHtml(input: SendFeedbackEmailInput) {
  const label = feedbackCategoryLabels[input.feedback.category];
  const rows = [
    ["Category", label],
    ["Subject", input.feedback.subject ?? "No subject"],
    ["From", formatUserLine(input.user)],
    ["Organization", input.user.orgName ?? "Unknown organization"],
    ["Role", input.user.role ?? "Unknown role"],
    ["User ID", input.user.id],
    ["Page", input.feedback.pagePath ?? "Not provided"],
    ["User agent", input.request.userAgent ?? "Not provided"],
  ];

  const rowsHtml = rows
    .map(
      ([labelText, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;color:#6b7280;font-size:13px;vertical-align:top;">${escapeHtml(labelText)}</td>
          <td style="padding:6px 0;color:#111827;font-size:13px;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <h1 style="font-size:18px;line-height:1.3;margin:0 0 16px;">New Argos ${escapeHtml(label.toLowerCase())}</h1>
      <table style="border-collapse:collapse;margin:0 0 20px;">${rowsHtml}</table>
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
        <p style="margin:0;white-space:normal;">${formatMultilineHtml(input.feedback.message)}</p>
      </div>
    </div>
  `;
}

export async function sendFeedbackEmail(
  input: SendFeedbackEmailInput,
  options: {
    client?: FeedbackEmailClient;
    env?: FeedbackEmailEnv;
  } = {},
) {
  const env = options.env ?? process.env;
  const config = getFeedbackEmailConfig(env);
  const client = options.client ?? getFeedbackEmailClient(env);
  const { data, error } = await client.emails.send({
    from: config.from,
    html: buildFeedbackHtml(input),
    replyTo: input.user.email,
    subject: buildFeedbackEmailSubject(input.feedback),
    text: buildFeedbackText(input),
    to: config.to,
  });

  if (error) {
    console.error("[Resend] feedback send error:", JSON.stringify(error));
    throw new Error(
      `Resend error [${error.name ?? "unknown"}]: ${error.message ?? "Unknown error"}`,
    );
  }

  return { id: data?.id ?? null };
}
