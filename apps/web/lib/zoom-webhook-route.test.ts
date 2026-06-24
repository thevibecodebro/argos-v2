import { beforeEach, describe, expect, it, vi } from "vitest";

const createZoomWebhookRepository = vi.fn();
const processZoomWebhookRequest = vi.fn();
const checkRateLimitForPolicy = vi.fn();

vi.mock("@/lib/integrations/create-zoom-webhook-repository", () => ({
  createZoomWebhookRepository,
}));

vi.mock("@/lib/integrations/zoom-webhook", () => ({
  processZoomWebhookRequest,
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

describe("Zoom webhook route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createZoomWebhookRepository.mockReset();
    processZoomWebhookRequest.mockReset();
    checkRateLimitForPolicy.mockReset();
    createZoomWebhookRepository.mockReturnValue({});
    processZoomWebhookRequest.mockResolvedValue({
      status: 200,
      body: { received: true },
    });
    checkRateLimitForPolicy.mockResolvedValue({
      allowed: true,
      limit: 300,
      remaining: 299,
      requestCount: 1,
      retryAfterSeconds: 60,
      resetAt: new Date("2026-04-28T10:16:00.000Z"),
      bucketKey: "zoomWebhook:ip:hash",
    });
  });

  it("returns 429 before processing when the IP webhook limit is exceeded", async () => {
    checkRateLimitForPolicy.mockResolvedValueOnce({
      allowed: false,
      limit: 300,
      remaining: 0,
      requestCount: 301,
      retryAfterSeconds: 18,
      resetAt: new Date("2026-04-28T10:16:00.000Z"),
      bucketKey: "zoomWebhook:ip:hash",
    });

    const route = await import("../app/api/webhooks/zoom/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/webhooks/zoom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          "x-real-ip": "198.51.100.1",
        },
        body: JSON.stringify({ event: "recording.completed" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("18");
    await expect(response.json()).resolves.toMatchObject({
      code: "rate_limit_exceeded",
      retryAfterSeconds: 18,
    });
    expect(checkRateLimitForPolicy).toHaveBeenCalledWith("zoomWebhook", {
      type: "route",
      id: "public",
    });
    expect(createZoomWebhookRepository).not.toHaveBeenCalled();
    expect(processZoomWebhookRequest).not.toHaveBeenCalled();
  });

  it("does not derive the pre-auth rate-limit subject from forwarding headers", async () => {
    const route = await import("../app/api/webhooks/zoom/route");
    const body = JSON.stringify({ event: "recording.completed" });

    const firstResponse = await route.POST(
      new Request("http://localhost:3100/api/webhooks/zoom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.250, 10.0.0.1",
          "x-real-ip": "198.51.100.9",
          "x-vercel-forwarded-for": "198.51.100.22, 10.0.0.2",
        },
        body,
      }),
    );
    const secondResponse = await route.POST(
      new Request("http://localhost:3100/api/webhooks/zoom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          "x-real-ip": "198.51.100.1",
          "x-vercel-forwarded-for": "198.51.100.44, 10.0.0.2",
        },
        body,
      }),
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(checkRateLimitForPolicy).toHaveBeenNthCalledWith(1, "zoomWebhook", {
      type: "route",
      id: "public",
    });
    expect(checkRateLimitForPolicy).toHaveBeenNthCalledWith(2, "zoomWebhook", {
      type: "route",
      id: "public",
    });
  });

  it("forwards post-signature account/org limit responses from the Zoom processor", async () => {
    processZoomWebhookRequest.mockResolvedValueOnce({
      status: 429,
      body: {
        code: "rate_limit_exceeded",
        error: "Too many requests. Try again later.",
        retryAfterSeconds: 12,
      },
      headers: { "Retry-After": "12" },
    });

    const route = await import("../app/api/webhooks/zoom/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/webhooks/zoom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "198.51.100.9",
        },
        body: JSON.stringify({ event: "recording.completed" }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
    await expect(response.json()).resolves.toMatchObject({
      code: "rate_limit_exceeded",
      retryAfterSeconds: 12,
    });
  });

  it("rejects oversized bodies before reading or processing the Zoom webhook", async () => {
    const route = await import("../app/api/webhooks/zoom/route");
    const request = new Request("http://localhost:3100/api/webhooks/zoom", {
      method: "POST",
      headers: {
        "Content-Length": "200000",
        "Content-Type": "application/json",
        "x-real-ip": "198.51.100.9",
      },
      body: JSON.stringify({ event: "recording.completed" }),
    });
    const textSpy = vi.spyOn(request, "text");
    const response = await route.POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: "Zoom webhook payload is too large.",
    });
    expect(textSpy).not.toHaveBeenCalled();
    expect(processZoomWebhookRequest).not.toHaveBeenCalled();
  });

  it("returns a generic 500 when Zoom webhook processing throws", async () => {
    processZoomWebhookRequest.mockRejectedValueOnce(new Error("zoom secret leaked"));

    const route = await import("../app/api/webhooks/zoom/route");
    const response = await route.POST(
      new Request("http://localhost:3100/api/webhooks/zoom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-real-ip": "198.51.100.9",
        },
        body: JSON.stringify({ event: "recording.completed" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
    });
  });
});
