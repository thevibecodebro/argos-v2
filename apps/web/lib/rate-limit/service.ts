import { createHmac } from "node:crypto";
import { createRateLimitRepository } from "./create-repository";

export type RateLimitWindow = "minute" | "hour" | "day";

export type RateLimitPolicyName =
  | "invites"
  | "uploadDirect"
  | "uploadPrepare"
  | "uploadComplete"
  | "zoomWebhook"
  | "zoomWebhookAccount"
  | "trainingAi"
  | "roleplayTts"
  | "roleplayRealtime";

export type RateLimitSubject = {
  type: "org" | "user" | "ip";
  id: string;
};

export type RateLimitBucketInput = {
  bucketKey: string;
  windowStart: Date;
  windowSeconds: number;
};

export type RateLimitBucketIncrement = {
  requestCount: number;
  windowStart: Date;
  windowSeconds: number;
};

export interface RateLimitRepository {
  incrementBucket(input: RateLimitBucketInput): Promise<RateLimitBucketIncrement>;
}

export type RateLimitResult = {
  allowed: boolean;
  bucketKey: string;
  limit: number;
  remaining: number;
  requestCount: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

export const RATE_LIMIT_POLICIES = {
  invites: { limit: 10, window: "hour" },
  uploadDirect: { limit: 20, window: "hour" },
  uploadPrepare: { limit: 20, window: "hour" },
  uploadComplete: { limit: 20, window: "hour" },
  zoomWebhook: { limit: 300, window: "minute" },
  zoomWebhookAccount: { limit: 300, window: "minute" },
  trainingAi: { limit: 20, window: "day" },
  roleplayTts: { limit: 60, window: "hour" },
  roleplayRealtime: { limit: 60, window: "hour" },
} satisfies Record<RateLimitPolicyName, { limit: number; window: RateLimitWindow }>;

const WINDOW_SECONDS: Record<RateLimitWindow, number> = {
  minute: 60,
  hour: 60 * 60,
  day: 24 * 60 * 60,
};

function floorToWindow(date: Date, window: RateLimitWindow) {
  const windowMs = WINDOW_SECONDS[window] * 1000;
  return new Date(Math.floor(date.getTime() / windowMs) * windowMs);
}

function buildBucketKey(policy: RateLimitPolicyName, subject: RateLimitSubject) {
  const secret =
    process.env.ARGOS_RATE_LIMIT_HASH_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "argos-rate-limit-local-development";
  const digest = createHmac("sha256", secret)
    .update(`${subject.type}:${subject.id}`)
    .digest("hex");

  return `${policy}:${subject.type}:${digest}`;
}

export async function checkRateLimit(
  repository: RateLimitRepository,
  input: {
    limit: number;
    now?: Date;
    policy: RateLimitPolicyName;
    subject: RateLimitSubject;
    window: RateLimitWindow;
  },
): Promise<RateLimitResult> {
  const now = input.now ?? new Date();
  const windowSeconds = WINDOW_SECONDS[input.window];
  const windowStart = floorToWindow(now, input.window);
  const resetAt = new Date(windowStart.getTime() + windowSeconds * 1000);
  const bucketKey = buildBucketKey(input.policy, input.subject);
  const bucket = await repository.incrementBucket({
    bucketKey,
    windowSeconds,
    windowStart,
  });
  const remaining = Math.max(input.limit - bucket.requestCount, 0);

  return {
    allowed: bucket.requestCount <= input.limit,
    bucketKey,
    limit: input.limit,
    remaining,
    requestCount: bucket.requestCount,
    resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
  };
}

export async function checkRateLimitForPolicy(
  policy: RateLimitPolicyName,
  subject: RateLimitSubject,
  options: {
    now?: Date;
    repository?: RateLimitRepository;
  } = {},
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_POLICIES[policy];

  return checkRateLimit(options.repository ?? createRateLimitRepository(), {
    limit: config.limit,
    now: options.now,
    policy,
    subject,
    window: config.window,
  });
}

export function rateLimitExceededResponse(result: RateLimitResult) {
  return Response.json(
    {
      code: "rate_limit_exceeded",
      error: "Too many requests. Try again later.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}
