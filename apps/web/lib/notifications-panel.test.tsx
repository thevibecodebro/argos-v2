// @vitest-environment jsdom
import { act, createElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
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

  it("hydrates UTC day groups across timezone and minute boundaries, then restores local grouping and relative times", async () => {
    const NativeDateTimeFormat = Intl.DateTimeFormat;
    let zone = "UTC";
    const formatter = vi.spyOn(Intl, "DateTimeFormat").mockImplementation((locales, options) =>
      new NativeDateTimeFormat(locales, { timeZone: zone, ...options }));
    const now = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-11-07T06:30:59.900Z"));
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const event = { type: "call_scored", title: "Synthetic call scored", body: "Synthetic event.", link: null, read: false };
    const element = createElement(NotificationsPanel, { initialUnreadCount: 3, initialNotifications: [
      { ...event, id: "old", createdAt: "2026-11-06T03:30:00.000Z" },
      { ...event, id: "recent", createdAt: "2026-11-07T06:30:00.000Z" },
      { ...event, id: "invalid", createdAt: "invalid" },
    ] });
    let root: Root | undefined;
    const container = document.createElement("div");
    const errors = vi.fn();
    try {
      const server = renderToString(element);
      zone = "America/Chicago";
      now.mockReturnValue(Date.parse("2026-11-07T06:31:01.900Z"));
      expect(renderToString(element)).toBe(server);
      expect(server).toContain("Friday, November 6, 2026");
      expect(server).not.toContain("Thursday, November 5, 2026");
      expect(server).toContain("Nov 7, 2026, 6:30 AM");
      container.innerHTML = server;
      document.body.append(container);
      await act(async () => { root = hydrateRoot(container, element, { onRecoverableError: errors }); });
      expect(errors).not.toHaveBeenCalled();
      expect(container.textContent).toContain("Thursday, November 5, 2026");
      expect(container.textContent).toContain("Saturday, November 7, 2026");
      expect(container.textContent).toContain("Nov 5, 2026, 9:30 PM");
      expect(container.textContent).toContain("1m ago");
      expect(container.textContent).toContain("Date unavailable");
    } finally {
      if (root) await act(async () => root!.unmount());
      container.remove();
      formatter.mockRestore();
      now.mockRestore();
    }
  });

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
    expect(html).toContain(new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" }).format(new Date("2026-05-11T20:00:00.000Z")));
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

