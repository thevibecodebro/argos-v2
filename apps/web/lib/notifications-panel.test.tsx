import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NotificationsPanel } from "../components/notifications-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("NotificationsPanel", () => {
  it("renders active notification filters instead of a static feed only", () => {
    const html = renderToStaticMarkup(
      createElement(NotificationsPanel, {
        initialUnreadCount: 1,
        initialNotifications: [
          {
            id: "notification-1",
            type: "call_scored",
            title: "Call scored",
            body: "ACME discovery is ready for review.",
            link: "/calls/call-1",
            read: false,
            createdAt: "2026-05-11T20:00:00.000Z",
          },
          {
            id: "notification-2",
            type: "annotation_added",
            title: "Annotation added",
            body: "A coaching note was added.",
            link: "/calls/call-1",
            read: true,
            createdAt: "2026-05-10T20:00:00.000Z",
          },
        ],
      }),
    );

    expect(html).toContain('data-notification-filters="active"');
    expect(html).toContain("All");
    expect(html).toContain("Unread");
    expect(html).toContain("Read");
    expect(html).toContain("Call scored");
  });
});

