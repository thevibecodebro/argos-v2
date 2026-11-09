import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const focusedRoutes = [
  {
    marker: 'data-upload-route="capture-workflow"',
    path: "../components/upload-workspace.tsx",
    route: "upload",
  },
  {
    marker: 'data-notifications-route="account-inbox"',
    path: "../components/notifications-workspace.tsx",
    route: "notifications",
  },
  {
    marker: 'data-training-route="operational-workspace"',
    path: "../components/training/training-pages.tsx",
    route: "training",
  },
];

describe("focused authenticated route readability", () => {
  it.each(focusedRoutes)("$route keeps process metrics out of the primary route chrome", ({ marker, path }) => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");

    expect(source).toContain(marker);
    expect(source).not.toContain("OperationalMetricStrip");
  });

  it("keeps notifications focused on a single inbox", () => {
    const source = readFileSync(
      new URL("../components/notifications-workspace.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('data-notifications-route="account-inbox"');
    expect(source).toContain("Notification inbox");
    expect(source).not.toContain("selectedNotification");
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
      new URL("../components/upload-workspace.tsx", import.meta.url),
      "utf8",
    );
    const notifications = readFileSync(
      new URL("../components/notifications-workspace.tsx", import.meta.url),
      "utf8",
    );

    expect(upload).not.toContain("OperationalPreviewDrawer");
    expect(notifications).not.toContain("selectedNotification");
    expect(notifications).not.toContain("OperationalPreviewDrawer");
    expect(notifications).not.toContain("selected?.link");
  });
});
