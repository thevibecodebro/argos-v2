import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsWorkspacePanel } from "../components/settings-workspace-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("SettingsWorkspacePanel", () => {
  it("renders the archived profile, org, team, and integrations sections", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsWorkspacePanel, {
        initialCompliance: {
          canManage: true,
          consentedAt: null,
          hasConsented: false,
        },
        initialIntegrations: {
          canManage: true,
          ghl: {
            available: false,
            connectPath: "/api/integrations/ghl/connect",
            connected: false,
            connectedAt: null,
            disconnectPath: "/api/integrations/ghl/disconnect",
            locationId: null,
            locationName: null,
          },
          zoom: {
            available: true,
            connectPath: "/api/integrations/zoom/connect",
            connected: true,
            connectedAt: "2026-04-03T00:00:00.000Z",
            disconnectPath: "/api/integrations/zoom/disconnect",
            zoomUserId: "zoom-user-7",
          },
        },
        initialManagers: [{ id: "manager-1", name: "Morgan Lane" }],
        initialMembers: [
          {
            id: "user-2",
            email: "rep@argos.ai",
            firstName: "Riley",
            lastName: "Stone",
            profileImageUrl: null,
            role: "rep",
            callCount: 3,
            joinedAt: "2026-04-03T00:00:00.000Z",
          },
        ],
        initialReps: [
          { id: "user-2", name: "Riley Stone", primaryManagerId: "manager-1" },
        ],
        initialTeams: [
          { id: "team-1", name: "Closers", description: null, status: "active" },
        ],
        initialUser: {
          id: "user-1",
          email: "jared@argos.ai",
          firstName: "Jared",
          lastName: "Newman",
          profileImageUrl: null,
          role: "admin",
          orgId: "org-1",
          displayNameSet: true,
          org: {
            id: "org-1",
            name: "Argos",
            slug: "argos",
            plan: "trial",
            createdAt: "2026-04-03T00:00:00.000Z",
          },
        },
        notices: ["Integration connected successfully."],
      }),
    );

    expect(html).toContain("Your Profile");
    expect(html).toContain("Organization");
    expect(html).toContain("Team Members");
    expect(html).toContain("Team Access");
    expect(html).toContain("Compliance &amp; Recording");
    expect(html).toContain("Integration connected successfully.");
    expect(html).toContain("Zoom");
    expect(html).toContain("Go High Level");
  });
});
