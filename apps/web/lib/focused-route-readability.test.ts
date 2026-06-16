import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const focusedRoutes = [
  {
    marker: 'data-upload-route="capture-workflow"',
    path: "../app/(authenticated)/upload/page.tsx",
    route: "upload",
  },
  {
    marker: 'data-notifications-route="account-inbox"',
    path: "../app/(authenticated)/notifications/page.tsx",
    route: "notifications",
  },
  {
    marker: 'data-training-route="operational-workspace"',
    path: "../app/(authenticated)/training/page.tsx",
    route: "training",
  },
];

describe("focused authenticated route readability", () => {
  it.each(focusedRoutes)("$route keeps process metrics out of the primary route chrome", ({ marker, path }) => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");

    expect(source).toContain(marker);
    expect(source).not.toContain("OperationalMetricStrip");
  });

  it("keeps notifications focused on the inbox and selected notification context", () => {
    const source = readFileSync(
      new URL("../app/(authenticated)/notifications/page.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('data-notifications-route="account-inbox"');
    expect(source).toContain("NotificationsPanel");
    expect(source).toContain("unreadCount");
    expect(source).toContain("selectedNotification");
    expect(source).not.toContain("selected?.link");
    expect(source).not.toContain("Mark all read");
    expect(source).not.toContain('href: "/notifications"');
    expect(source).not.toContain("callItems");
    expect(source).not.toContain("assignments");
    expect(source).not.toContain('label="Calls"');
    expect(source).not.toContain('label="Assignments"');
  });

  it("keeps upload and notifications from using always-on preview drawers", () => {
    const upload = readFileSync(
      new URL("../app/(authenticated)/upload/page.tsx", import.meta.url),
      "utf8",
    );
    const notifications = readFileSync(
      new URL("../app/(authenticated)/notifications/page.tsx", import.meta.url),
      "utf8",
    );

    expect(upload).not.toContain("OperationalPreviewDrawer");
    expect(notifications).toContain("selectedNotification");
    expect(notifications).not.toContain("selected?.link");
  });
});
