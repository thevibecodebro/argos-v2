import { beforeEach, describe, expect, it, vi } from "vitest";

const createGhlWebhookRepository = vi.fn();
const processGhlWebhookRequest = vi.fn();
const checkRateLimitForPolicy = vi.fn();

vi.mock("@/lib/integrations/create-ghl-webhook-repository", () => ({
  createGhlWebhookRepository,
}));

vi.mock("@/lib/integrations/ghl-webhook", () => ({
  processGhlWebhookRequest,
}));

vi.mock("@/lib/rate-limit/service", () => ({
  checkRateLimitForPolicy,
  rateLimitExceededResponse: (result: { retryAfterSeconds: number }) =>
    Response.json(
      {
        code: "rate_limit_exceeded",
        error: "Too many requests. Try again later.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSeconds) },
      },
    ),
}));

describe("GHL webhook route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createGhlWebhookRepository.mockReset();
    processGhlWebhookRequest.mockReset();
    checkRateLimitForPolicy.mockReset();
    createGhlWebhookRepository.mockReturnValue({});
    processGhlWebhookRequest.mockResolvedValue({
      status: 200,
      body: { received: true },
    });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      limit: 120,
      remaining: 119,
      requestCount: 1,
      retryAfterSeconds: 60,
      resetAt: new Date("2026-06-18T10:16:00.000Z"),
      bucketKey: "ghlWebhook:ip:hash",
    });
  });

  it("accepts the shared webhook token from the Marketplace URL query string", async () => {
    const route = await import("../app/api/webhooks/ghl/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/webhooks/leadconnector?token=secret-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-forwarded-for": "198.51.100.22, 10.0.0.2",
        },
        body: JSON.stringify({ type: "InboundMessage" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(processGhlWebhookRequest).toHaveBeenCalledWith(
      {},
      {
        headers: { token: "secret-token" },
        rawBody: JSON.stringify({ type: "InboundMessage" }),
      },
    );
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("ghlWebhook", {
      type: "ip",
      id: "198.51.100.22",
    });
  });
});
