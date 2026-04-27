import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ForgeActionBar,
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeMetric,
  ForgeSettingsGroup,
  ForgeSidePanelShell,
  ForgeSkeleton,
  ForgeSurface,
  ForgeTableShell,
  ForgeWidget,
} from "../components/forge";

describe("forge primitives", () => {
  it("renders disciplined forge surfaces without legacy blue tokens", () => {
    const html = renderToStaticMarkup(
      createElement(
        ForgeSurface,
        { as: "article", variant: "panel" },
        createElement("p", null, "Call intake ledger"),
      ),
    );

    expect(html).toContain('data-forge-surface="panel"');
    expect(html).toContain("forge-surface");
    expect(html).toContain("Call intake ledger");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
  });

  it("renders link and button actions with Material Symbols only", () => {
    const linkHtml = renderToStaticMarkup(
      createElement(
        ForgeButton,
        { href: "/upload", icon: "cloud_upload", variant: "primary" },
        "Upload call",
      ),
    );
    const buttonHtml = renderToStaticMarkup(
      createElement(
        ForgeButton,
        { icon: "filter_list", type: "button", variant: "secondary" },
        "Filter",
      ),
    );

    expect(linkHtml).toContain('href="/upload"');
    expect(linkHtml).toContain('data-forge-button="primary"');
    expect(linkHtml).toContain("material-symbols-outlined");
    expect(linkHtml).toContain("cloud_upload");
    expect(buttonHtml).toContain("<button");
    expect(buttonHtml).toContain('data-forge-button="secondary"');
    expect(buttonHtml).toContain("filter_list");
  });

  it("standardizes chips and metric emphasis by forge tone", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ForgeChip, { tone: "cyan" }, "Processing"),
        createElement(ForgeMetric, {
          label: "Team score",
          value: "87.4",
          tone: "cyan",
          delta: "+4.2",
        }),
      ),
    );

    expect(html).toContain('data-forge-chip="cyan"');
    expect(html).toContain('data-forge-metric="cyan"');
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain("Processing");
    expect(html).toContain("+4.2");
  });

  it("provides empty, action bar, table, and skeleton patterns", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ForgeActionBar, null, createElement("label", null, "Search")),
        createElement(ForgeTableShell, null, createElement("table", null, createElement("tbody", null))),
        createElement(ForgeEmptyState, {
          action: { href: "/upload", label: "Upload call" },
          description: "Upload a call to start scoring.",
          icon: "attach_file",
          title: "No calls yet",
        }),
        createElement(ForgeSkeleton, { lines: 3 }),
      ),
    );

    expect(html).toContain('data-forge-action-bar="true"');
    expect(html).toContain('data-forge-table="true"');
    expect(html).toContain('data-forge-empty-state="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("No calls yet");
    expect(html).toContain('href="/upload"');
  });

  it("provides workspace widgets, settings groups, and side-panel shells", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(
          ForgeWidget,
          {
            action: { href: "/calls", label: "Open ledger" },
            eyebrow: "Dashboard OS",
            title: "Operating pulse",
          },
          createElement("p", null, "Widget content"),
        ),
        createElement(
          ForgeSettingsGroup,
          {
            description: "Configure the workspace.",
            title: "Workspace",
          },
          createElement("p", null, "Settings content"),
        ),
        createElement(
          ForgeSidePanelShell,
          {
            description: "Edit this record in context.",
            title: "Edit user",
          },
          createElement("button", null, "Save"),
        ),
      ),
    );

    expect(html).toContain('data-forge-widget="true"');
    expect(html).toContain('data-forge-settings-group="true"');
    expect(html).toContain('data-forge-side-panel="true"');
    expect(html).toContain("Operating pulse");
    expect(html).toContain("Workspace");
    expect(html).toContain("Edit user");
  });
});
