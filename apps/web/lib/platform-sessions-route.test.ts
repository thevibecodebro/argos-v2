import { beforeEach, describe, expect, it, vi } from "vitest";

const createPlatformRepository = vi.fn();
const createPlatformSwitchSession = vi.fn();
const endPlatformSwitchSession = vi.fn();
const getPlatformApiAccess = vi.fn();
const getPlatformSessionCookieValue = vi.fn();

vi.mock("@/lib/platform/create-repository", () => ({
  createPlatformRepository,
}));

vi.mock("@/lib/platform/auth", () => ({
  getPlatformApiAccess,
}));

vi.mock("@/lib/platform/effective-actor", () => ({
  PLATFORM_SESSION_COOKIE_NAME: "argos_platform_session",
  getPlatformSessionCookieValue,
}));

vi.mock("@/lib/platform/sessions", () => ({
  createPlatformSwitchSession,
  endPlatformSwitchSession,
}));

describe("platform sessions route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    createPlatformRepository.mockReset();
    createPlatformSwitchSession.mockReset();
    endPlatformSwitchSession.mockReset();
    getPlatformApiAccess.mockReset();
    getPlatformSessionCookieValue.mockReset();

    createPlatformRepository.mockReturnValue({ name: "platform-repository" });
    getPlatformApiAccess.mockResolvedValue({
      ok: true,
      staff: { role: "operator", userId: "staff-1" },
      user: { id: "staff-1" },
    });
    createPlatformSwitchSession.mockResolvedValue({
      ok: true,
      data: {
        auditEvent: { id: "audit-1" },
        session: { id: "session-1" },
      },
    });
    endPlatformSwitchSession.mockResolvedValue({
      ok: true,
      data: { ended: true },
    });
    getPlatformSessionCookieValue.mockReturnValue("session-1");
  });

  it("denies nonstaff platform session creation", async () => {
    getPlatformApiAccess.mockResolvedValueOnce({
      ok: false,
      status: 403,
      error: "Platform access required",
    });

    const route = await import("../app/api/platform/sessions/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/platform/sessions", {
        method: "POST",
        body: JSON.stringify({ orgId: "org-1", reason: "Support request" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(createPlatformSwitchSession).not.toHaveBeenCalled();
  });

  it("sets the platform session cookie after an audited org switch", async () => {
    const route = await import("../app/api/platform/sessions/route");
    const response = await route.POST(
      new Request("http://localhost:3000/api/platform/sessions", {
        method: "POST",
        body: JSON.stringify({ orgId: "org-1", reason: "Support request" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("argos_platform_session=session-1");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(createPlatformSwitchSession).toHaveBeenCalledWith(
      { name: "platform-repository" },
      { role: "operator", userId: "staff-1" },
      { orgId: "org-1", reason: "Support request" },
    );
  });

  it("clears the platform session cookie after ending the session", async () => {
    const route = await import("../app/api/platform/sessions/route");
    const response = await route.DELETE(
      new Request("http://localhost:3000/api/platform/sessions", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("argos_platform_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(endPlatformSwitchSession).toHaveBeenCalledWith(
      { name: "platform-repository" },
      { sessionId: "session-1", staffUserId: "staff-1" },
    );
  });
});
