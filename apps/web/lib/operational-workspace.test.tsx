import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  OperationalMetricStrip,
  OperationalPreviewDrawer,
  OperationalToolbar,
  OperationalWorkspace,
} from "../components/operational-workspace";

type ToolbarExposesVariant =
  "variant" extends keyof Parameters<typeof OperationalToolbar>[0]
    ? true
    : false;
type DrawerExposesVariant =
  "variant" extends keyof Parameters<typeof OperationalPreviewDrawer>[0]
    ? true
    : false;

describe("operational workspace primitives", () => {
  it("keeps selected-object actions outside the expandable details", () => {
    const html = renderToStaticMarkup(createElement(OperationalPreviewDrawer, {title: "Selected call", actions: [{href:"/calls/1",label:"Open call",variant:"primary"}]}, createElement("p", null, "Longer evidence")));
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html.indexOf('href="/calls/1"')).toBeLessThan(html.indexOf("<details"));
    expect(html).toContain("Longer evidence");
  });
  it("renders quiet product toolbar, metric strip, and preview drawer primitives", () => {
    const html = renderToStaticMarkup(
      createElement(
        OperationalWorkspace,
        null,
        createElement(
          OperationalToolbar,
          {
            actions: [
              {
                href: "/upload",
                icon: "attach_file",
                label: "Upload call",
                variant: "primary",
              },
            ],
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
            actions: [
              {
                href: "/calls/call-1",
                label: "Open detail",
                variant: "primary",
              },
            ],
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

  it("keeps toolbar and drawer props stable without variant APIs", () => {
    const toolbarExposesVariant: ToolbarExposesVariant = false;
    const drawerExposesVariant: DrawerExposesVariant = false;

    expect(toolbarExposesVariant).toBe(false);
    expect(drawerExposesVariant).toBe(false);
  });

  it("uses calm product chrome for toolbars and selected-object drawers", () => {
    const toolbarHtml = renderToStaticMarkup(
      createElement(OperationalToolbar, {
        eyebrow: "Review",
        title: "Calls",
        description: "Find and review scored calls.",
        status: { label: "Manager view", tone: "muted" },
      }),
    );
    const drawerHtml = renderToStaticMarkup(
      createElement(OperationalPreviewDrawer, {
        eyebrow: "Selected call",
        title: "ACME discovery",
        description: "Summary only.",
      }),
    );

    expect(toolbarHtml).toContain('data-operational-toolbar="true"');
    expect(toolbarHtml).toContain(
      'data-operational-toolbar-density="compact"',
    );
    expect(toolbarHtml).not.toContain("font-black");
    expect(toolbarHtml).not.toContain("tracking-[0.24em]");
    expect(drawerHtml).toContain('data-operational-preview-drawer="true"');
    expect(drawerHtml).toContain(
      'data-operational-preview-drawer-purpose="selected-object"',
    );
    expect(drawerHtml).not.toContain("rounded-3xl");
  });
});
