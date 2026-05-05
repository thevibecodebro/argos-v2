import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PeoplePanel } from "../components/settings/people-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("PeoplePanel", () => {
  it("renders people management with a compact drawer and member table", () => {
    const html = renderToStaticMarkup(
      createElement(PeoplePanel, {
        currentUserId: "user-admin",
        initialTeams: [{ id: "team-a", name: "Closers" }],
        initialPendingInvites: [
          {
            id: "invite-1",
            orgId: "org-1",
            email: "rep@example.com",
            role: "rep",
            token: "token-1",
            teamIds: ["team-a"],
            expiresAt: new Date("2026-05-01T00:00:00.000Z"),
            acceptedAt: null,
            createdAt: new Date("2026-04-24T00:00:00.000Z"),
          },
        ],
        initialMembers: [
          {
            id: "user-admin",
            email: "admin@example.com",
            firstName: "Admin",
            lastName: "User",
            profileImageUrl: null,
            role: "admin",
            callCount: 3,
            joinedAt: "2026-04-01T00:00:00.000Z",
            primaryManagerId: null,
          },
          {
            id: "user-rep",
            email: "rep@example.com",
            firstName: "Riley",
            lastName: "Stone",
            profileImageUrl: null,
            role: "rep",
            callCount: 7,
            joinedAt: "2026-04-02T00:00:00.000Z",
            primaryManagerId: null,
          },
        ],
      }),
    );

    expect(html).toContain('data-people-workspace="management"');
    expect(html).toContain('data-settings-editor-workbench="people"');
    expect(html).toContain('data-people-invite-drawer=""');
    expect(html).toContain('data-people-member-table=""');
    expect(html).not.toContain('data-forge-workspace-layout=');
    expect(html).not.toContain('data-forge-workspace-rail=');
    expect(html).toContain('data-forge-management-table="true"');
    expect(html).toContain('data-forge-mobile-table-cards="true"');
    expect(html).toContain("Search members");
    expect(html).toContain("Role filter");
    expect(html).toContain("Member management");
    expect(html).toContain("Invite member");
    expect(html).toContain("Pending invites");
    expect(html).toContain("rep@example.com");
    expect(html).toContain("Riley Stone");
    expect(html).toContain("Protected");
    expect(html).toContain("Remove");
    expect(html).not.toContain("Invite teammates from the rail to add the first member.");
  });
});
