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

  it("rejects webhook tokens supplied in the URL query string", async () => {
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
        headers: { token: null },
        rawBody: JSON.stringify({ type: "InboundMessage" }),
      },
    );
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("ghlWebhook", {
      type: "route",
      id: "public",
    });
  });

  it("does not derive the pre-auth rate-limit subject from forwarding headers", async () => {
    const route = await import("../app/api/webhooks/ghl/route");
    const body = JSON.stringify({ type: "InboundMessage" });

    const firstResponse = await route.POST(
      new Request("http://localhost:3100/api/webhooks/leadconnector", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          "x-real-ip": "198.51.100.1",
          "x-vercel-forwarded-for": "198.51.100.22, 10.0.0.2",
        },
        body,
      }),
    );
    const secondResponse = await route.POST(
      new Request("http://localhost:3100/api/webhooks/leadconnector", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.250, 10.0.0.1",
          "x-real-ip": "198.51.100.99",
          "x-vercel-forwarded-for": "198.51.100.44, 10.0.0.2",
        },
        body,
      }),
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(checkRateLimitForPolicy).toHaveBeenNthCalledWith(1, "ghlWebhook", {
      type: "route",
      id: "public",
    });
    expect(checkRateLimitForPolicy).toHaveBeenNthCalledWith(2, "ghlWebhook", {
      type: "route",
      id: "public",
    });
  });

  it("rejects alternate query credential names", async () => {
    const route = await import("../app/api/webhooks/ghl/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/webhooks/leadconnector?auth=secret-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "InboundMessage" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(processGhlWebhookRequest).toHaveBeenCalledWith(
      {},
      {
        headers: { token: null },
        rawBody: JSON.stringify({ type: "InboundMessage" }),
      },
    );
  });

  it("passes the webhook token from the dedicated header", async () => {
    const route = await import("../app/api/webhooks/ghl/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/webhooks/leadconnector", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ghl-webhook-token": "secret-token",
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
  });

  it("passes the token from the LeadConnector Marketplace path-token route", async () => {
    const route = await import("../app/api/webhooks/leadconnector/[token]/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/webhooks/leadconnector/secret-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "InboundMessage" }),
      }),
      { params: Promise.resolve({ token: "secret-token" }) },
    );

    expect(response.status).toBe(200);
    expect(processGhlWebhookRequest).toHaveBeenCalledWith(
      {},
      {
        headers: { token: "secret-token" },
        rawBody: JSON.stringify({ type: "InboundMessage" }),
      },
    );
  });
});
