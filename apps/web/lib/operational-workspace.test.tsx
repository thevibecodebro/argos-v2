import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  OperationalMetricStrip,
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "../components/operational-workspace";

describe("operational workspace primitives", () => {
  it("renders compact toolbar, metric strip, and preview drawer primitives", () => {
    const html = renderToStaticMarkup(
      createElement(
        OperationalWorkspace,
        null,
        createElement(
          OperationalToolbar,
          {
            actions: [{ href: "/upload", icon: "attach_file", label: "Upload call", variant: "primary" }],
            description: "Review scored calls without leaving the list.",
            status: { label: "Filters applied", tone: "ember" },
            title: "Calls",
          },
          createElement("div", null, "Saved views"),
        ),
        createElement(OperationalMetricStrip, {
          metrics: [
            { label: "Records", value: "218" },
            { label: "Avg score", tone: "cyan", value: "84" },
          ],
        }),
        createElement(
          OperationalPreviewDrawer,
          {
            actions: [{ href: "/calls/call-1", label: "Open detail", variant: "primary" }],
            description: "Selected call summary.",
            eyebrow: "Preview",
            title: "Discovery call",
          },
          createElement("p", null, "Preview body"),
        ),
      ),
    );

    expect(html).toContain('data-operational-workspace="true"');
    expect(html).toContain('data-operational-toolbar="true"');
    expect(html).toContain('data-operational-metric-strip="true"');
    expect(html).toContain('data-operational-preview-drawer="true"');
    expect(html).toContain("Calls");
    expect(html).toContain("Saved views");
    expect(html).toContain("Discovery call");
    expect(html).toContain('href="/upload"');
    expect(html).toContain('href="/calls/call-1"');
    expect(html).not.toContain("forge-page-header");
  });
});
