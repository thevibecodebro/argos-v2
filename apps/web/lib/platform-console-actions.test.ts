import { describe, expect, it, vi } from "vitest";
import {
  CREATE_ORGANIZATION_ENDPOINT,
  ORGANIZATION_ENDPOINT,
  PLATFORM_SESSION_ENDPOINT,
  PLATFORM_STAFF_ENDPOINT,
  buildArchiveOrganizationPayload,
  buildCreateOrganizationPayload,
  buildGrantStaffPayload,
  buildRevokeStaffPayload,
  submitArchiveOrganization,
  buildSessionPayload,
  submitCreateOrganization,
  submitCreateSession,
  submitEndSession,
  submitGrantStaff,
  submitRevokeStaff,
} from "../components/platform/platform-console-actions";

function createFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  return formData;
}

describe("platform console actions", () => {
  it("normalizes create organization payloads before posting JSON", async () => {
    const formData = createFormData({
      adminEmail: " Owner@Example.COM ",
      name: " Acme Health ",
      plan: " trial ",
      reason: " Customer onboarding ",
      slug: " Acme Health! ",
    });
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        invite: { email: "owner@example.com" },
        organization: { id: "org-1" },
      }),
    );

    await expect(submitCreateOrganization(fetcher, formData)).resolves.toMatchObject({
      invite: { email: "owner@example.com" },
      organization: { id: "org-1" },
    });
    expect(buildCreateOrganizationPayload(formData)).toEqual({
      adminEmail: "Owner@Example.COM",
      name: "Acme Health",
      plan: "trial",
      reason: "Customer onboarding",
      slug: "acme-health",
    });
    expect(fetcher).toHaveBeenCalledWith(
      CREATE_ORGANIZATION_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify({
          adminEmail: "Owner@Example.COM",
          name: "Acme Health",
          plan: "trial",
          reason: "Customer onboarding",
          slug: "acme-health",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
  });

  it("posts platform session requests without requiring a manual audit reason", async () => {
    const formData = createFormData({ orgId: "" });
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ error: "reason is required" }, { status: 400 }),
    );

    expect(buildSessionPayload(formData, "org-1")).toEqual({
      orgId: "org-1",
    });
    await expect(submitCreateSession(fetcher, formData, "org-1")).rejects.toThrow("reason is required");
    expect(fetcher).toHaveBeenCalledWith(
      PLATFORM_SESSION_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify({ orgId: "org-1" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
  });

  it("posts organization archive requests with trimmed confirmation fields", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        archived: true,
        detachedUserCount: 2,
        endedSessionCount: 1,
        organization: { id: "org-1" },
      }),
    );

    await expect(
      submitArchiveOrganization(fetcher, {
        confirmationSlug: " acme ",
        orgId: "org-1",
        reason: " Duplicate workspace ",
      }),
    ).resolves.toMatchObject({
      archived: true,
      organization: { id: "org-1" },
    });

    expect(
      buildArchiveOrganizationPayload({
        confirmationSlug: " acme ",
        orgId: "org-1",
        reason: " Duplicate workspace ",
      }),
    ).toEqual({
      confirmationSlug: "acme",
      orgId: "org-1",
      reason: "Duplicate workspace",
    });
    expect(fetcher).toHaveBeenCalledWith(
      CREATE_ORGANIZATION_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify({
          confirmationSlug: "acme",
          orgId: "org-1",
          reason: "Duplicate workspace",
        }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
    );
  });

  it("posts self-service organization archive requests without an org id", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ archived: true }));

    await expect(
      submitArchiveOrganization(
        fetcher,
        {
          confirmationSlug: " acme ",
          reason: " Closing account ",
        },
        { selfService: true },
      ),
    ).resolves.toMatchObject({ archived: true });

    expect(fetcher).toHaveBeenCalledWith(
      ORGANIZATION_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify({
          confirmationSlug: "acme",
          reason: "Closing account",
        }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
    );
  });

  it("posts staff grant and revoke requests without exposing invite tokens", async () => {
    const grantFormData = createFormData({
      email: " Operator@Example.com ",
      reason: " SOC coverage ",
      role: "operator",
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          staff: {
            createdAt: "2026-06-11T12:00:00.000Z",
            email: "operator@example.com",
            role: "operator",
            status: "active",
            updatedAt: "2026-06-11T12:00:00.000Z",
            userId: "staff-2",
          },
        }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }));

    await expect(submitGrantStaff(fetcher, grantFormData)).resolves.toMatchObject({
      staff: {
        email: "operator@example.com",
        userId: "staff-2",
      },
    });
    await expect(submitRevokeStaff(fetcher, "staff-2", " Offboarded ")).resolves.toBeUndefined();

    expect(buildGrantStaffPayload(grantFormData)).toEqual({
      email: "Operator@Example.com",
      reason: "SOC coverage",
      role: "operator",
    });
    expect(buildRevokeStaffPayload("staff-2", " Offboarded ")).toEqual({
      reason: "Offboarded",
      userId: "staff-2",
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      PLATFORM_STAFF_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify({
          email: "Operator@Example.com",
          reason: "SOC coverage",
          role: "operator",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      PLATFORM_STAFF_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify({
          reason: "Offboarded",
          userId: "staff-2",
        }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      }),
    );
  });

  it("calls the session DELETE endpoint when ending platform access", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ended: true }));

    await expect(submitEndSession(fetcher)).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith(PLATFORM_SESSION_ENDPOINT, { method: "DELETE" });
  });
});
