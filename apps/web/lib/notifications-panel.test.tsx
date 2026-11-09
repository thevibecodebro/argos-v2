import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationsPanel, requestNotificationRead } from "../components/notifications-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("NotificationsPanel", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects failed read updates so the inbox can retain its unread state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Please try again." }), { status: 503 })));
    await expect(requestNotificationRead("/api/notifications/read-all")).rejects.toThrow("Please try again.");
  });

  it("accepts a confirmed empty response without requiring a JSON body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(requestNotificationRead("/api/notifications/notification-1/read")).resolves.toBeUndefined();
  });

  it("reports an unavailable service when the failure has no readable body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })));
    await expect(requestNotificationRead("/api/notifications/read-all")).rejects.toThrow("Could not update notifications. Try again.");
  });

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
    expect(html).toContain(new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date("2026-05-11T20:00:00.000Z")));
  });

  it("keeps the inbox usable when an event date is unavailable", () => {
    const html = renderToStaticMarkup(createElement(NotificationsPanel, {
      initialUnreadCount: 1,
      initialNotifications: [{ id: "notification-invalid", type: "call_scored", title: "Call ready", body: "Review the call.", link: null, read: false, createdAt: "invalid" }],
    }));
    expect(html).toContain("Date unavailable");
    expect(html).toContain("Call ready");
  });
});

