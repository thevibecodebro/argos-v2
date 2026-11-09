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
  it("renders people management with inline invite controls and a member table", () => {
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
    // Both workspace rails remain visible at tablet width. Keep complete member
    // cards until xl so the table's role and removal controls cannot be clipped.
    expect(html).toContain("[&amp;&gt;div:first-child]:hidden");
    expect(html).toContain("[&amp;&gt;div:last-child]:block");
    expect(html).toContain("xl:[&amp;&gt;div:first-child]:block");
    expect(html).toContain("xl:[&amp;&gt;div:last-child]:hidden");
    expect(html).toContain('data-forge-mobile-table-cards="true"');
    expect(html).toContain("Search members");
    expect(html).toContain("Role filter");
    expect(html).toContain("Members");
    expect(html.match(/Invite user/g)).toHaveLength(1);
    expect(html).not.toContain("Invite rep");
    expect(html).not.toContain("Invite manager");
    expect(html).not.toContain("Manage workspace access.");
    expect(html).not.toContain("Invite member");
    expect(html).not.toContain("Send invite");
    expect(html).toContain("Pending invites (1)");
    expect(html).toContain('data-people-pending-invites="true"');
    expect(html).not.toContain('data-people-invite-form="true"');
    expect(html).not.toContain("Role for Admin User");
    expect(html).toContain("Role for Riley Stone");
    expect(html).toContain("rep@example.com");
    expect(html).toContain("Riley Stone");
    expect(html).toContain("Protected");
    expect(html).toContain("Remove");
    expect(html).not.toContain("Invite teammates from the rail to add the first member.");
  });

  it.each(["rep", "manager", "executive", "admin"] as const)("preserves the %s invitation deep link and full role choices", (initialInviteRole) => {
    const html = renderToStaticMarkup(
      createElement(PeoplePanel, {
        currentUserId: "user-admin",
        initialInviteRole,
        initialMembers: [],
        initialPendingInvites: [],
        initialTeams: [{ id: "team-a", name: "Closers" }],
      }),
    );

    expect(html).toContain('id="people-invite"');
    expect(html).toContain('data-people-invite-form="true"');
    expect(html).toContain(`value="${initialInviteRole}" selected=""`);
    expect(html).toContain(`Invite ${initialInviteRole}`);
    expect(html).not.toContain("Invite user");
    expect(html).toContain("Rep — records and reviews own calls");
    expect(html).toContain("Manager — coaches team calls");
    expect(html).toContain("Executive — views all team data");
    expect(html).toContain("Admin — full access");
    if (initialInviteRole === "rep" || initialInviteRole === "manager") {
      expect(html).toContain("Teams (optional)");
      expect(html).toContain("Closers");
    } else {
      expect(html).not.toContain("Teams (optional)");
    }
    expect(html).toContain("Email");
  });
});
