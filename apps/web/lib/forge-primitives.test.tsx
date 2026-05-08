import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ForgeActionBar,
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeErrorState,
  ForgeIcon,
  ForgeManagementTable,
  ForgeMetric,
  ForgeMobileTableCards,
  ForgeReadinessPanel,
  ForgeSettingsGroup,
  ForgeSegmentedTab,
  ForgeSegmentedTabs,
  ForgeSidePanelShell,
  ForgeSkeleton,
  ForgeScoreMeter,
  ForgeStatCard,
  ForgeStatusPanel,
  ForgeSurface,
  ForgeTableShell,
  ForgeWorkspaceLayout,
  ForgeWorkspaceRail,
  ForgeWorkspaceRailAction,
  ForgeWorkspaceRailGroup,
  ForgeWidget,
} from "../components/forge";

describe("forge primitives", () => {
  it("renders disciplined forge surfaces without legacy blue tokens", () => {
    const html = renderToStaticMarkup(
      createElement(
        ForgeSurface,
        { as: "article", variant: "panel" },
        createElement("p", null, "Call ledger"),
      ),
    );

    expect(html).toContain('data-forge-surface="panel"');
    expect(html).toContain("forge-surface");
    expect(html).toContain("Call ledger");
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
    expect(buttonHtml).toContain("<button");
    expect(buttonHtml).toContain('data-forge-button="secondary"');
    expect(linkHtml).toContain('data-forge-icon-name="cloud_upload"');
    expect(buttonHtml).toContain('data-forge-icon-name="filter_list"');
    expect(linkHtml).not.toContain(">cloud_upload<");
    expect(buttonHtml).not.toContain(">filter_list<");
  });

  it("renders icons from codepoints so unknown ligatures do not leak raw text", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ForgeIcon, { name: "cloud_upload" }),
        createElement(ForgeIcon, { name: "not_in_subset_yet" }),
      ),
    );

    expect(html).toContain('data-forge-icon-name="cloud_upload"');
    expect(html).toContain('data-forge-icon-name="not_in_subset_yet"');
    expect(html).toContain("material-symbols-outlined");
    expect(html).not.toContain(">cloud_upload<");
    expect(html).not.toContain(">not_in_subset_yet<");
    expect(html).not.toContain('data-forge-icon-codepoint="e887"');
    expect(html).not.toContain('role="status"');
  });

  it("uses a known-present icon codepoint as the unknown fallback", () => {
    const html = renderToStaticMarkup(
      createElement(ForgeIcon, { name: "future_unbundled_symbol" }),
    );

    expect(html).toContain('data-forge-icon-name="future_unbundled_symbol"');
    expect(html).toContain('data-forge-icon-codepoint="e0f0"');
    expect(html).not.toContain(">future_unbundled_symbol<");
  });

  it("maps forge icon names used by authenticated workspaces to distinct codepoints", () => {
    const mappedIcons = [
      "account_tree",
      "analytics",
      "chevron_right",
      "fingerprint",
      "history",
      "play_arrow",
      "subject",
      "summarize",
    ];
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        ...mappedIcons.map((name) => createElement(ForgeIcon, { key: name, name })),
      ),
    );

    for (const name of mappedIcons) {
      expect(html).toContain(`data-forge-icon-name="${name}"`);
      expect(html).not.toContain(`>${name}<`);
    }
    expect(html).not.toContain('data-forge-icon-codepoint="e0f0"');
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
    expect(html).toContain("<dl");
    expect(html).toContain("<dt");
    expect(html).toContain("<dd");
    expect(html).toContain('<dt class="forge-metric-label">Team score</dt>');
    expect(html).toContain('<dt class="sr-only">Team score change</dt>');
    expect(html).toContain("font-variant-numeric:tabular-nums");
    expect(html).toContain("Processing");
    expect(html).toContain("+4.2");
  });

  it("provides shared stat cards and score meters", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ForgeStatCard, {
          description: "Average across completed calls.",
          icon: "monitoring",
          label: "Average score",
          tone: "success",
          value: "91",
        }),
        createElement(ForgeScoreMeter, {
          label: "Average score meter",
          showValue: true,
          tone: "success",
          value: 91,
        }),
      ),
    );

    expect(html).toContain('data-forge-stat-card="success"');
    expect(html).toContain('data-forge-score-meter="success"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Average score meter"');
    expect(html).toContain('aria-valuenow="91"');
    expect(html).toContain('aria-valuetext="91 out of 100"');
    expect(html).toContain("Average across completed calls.");
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
        createElement(ForgeSkeleton, { label: "Loading calls", lines: 3 }),
      ),
    );

    expect(html).toContain('data-forge-action-bar="true"');
    expect(html).toContain('data-forge-table="true"');
    expect(html).toContain('data-forge-empty-state="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading calls"');
    expect(html).toContain("Loading calls");
    expect(html).toContain("No calls yet");
    expect(html).toContain('href="/upload"');
  });

  it("provides consistent status, error, segmented tab, readiness, and mobile table primitives", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ForgeStatusPanel, {
          action: { href: "/calls", label: "Open calls" },
          description: "Processing will continue in the background.",
          icon: "pending",
          tone: "cyan",
          title: "Processing call",
          announce: "polite",
        }),
        createElement(ForgeErrorState, {
          action: { href: "/upload", label: "Try again" },
          description: "The upload could not be processed.",
          title: "Upload failed",
        }),
        createElement(
          ForgeSegmentedTabs,
          { label: "Training views" },
          createElement(ForgeSegmentedTab, { active: true, href: "/training" }, "Assigned"),
          createElement(ForgeSegmentedTab, { href: "/training/manage" }, "Manage"),
        ),
        createElement(ForgeReadinessPanel, {
          description: "Ready for the next coaching pass.",
          items: [
            { label: "Modules", value: "12" },
            { label: "Ready", value: "8" },
          ],
          label: "Readiness",
          tone: "success",
          value: "82%",
        }),
        createElement(
          ForgeManagementTable,
          {
            mobileCards: createElement(
              ForgeMobileTableCards,
              null,
              createElement("article", null, "Mobile row"),
            ),
          },
          createElement("table", null, createElement("tbody", null)),
        ),
      ),
    );

    expect(html).toContain('data-forge-status-panel="cyan"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('data-forge-error-state="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('data-forge-segmented-tabs="true"');
    expect(html).toContain('data-forge-segmented-tab-active="true"');
    expect(html).toContain('data-forge-readiness-panel="success"');
    expect(html).toContain('data-forge-management-table="true"');
    expect(html).toContain('data-forge-mobile-table-cards="true"');
    expect(html).toContain("Processing call");
    expect(html).toContain("Upload failed");
    expect(html).toContain("82%");
    expect(html).toContain("Mobile row");
  });

  it("keeps status defaults and fallbacks inside the local icon subset", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ForgeStatusPanel, {
          description: "Status details",
          title: "Default status",
        }),
        createElement(ForgeErrorState, {
          description: "Error details",
          title: "Default error",
        }),
        createElement(ForgeIcon, { name: "unknown_future_symbol" }),
      ),
    );

    expect(html).not.toContain(">info<");
    expect(html).not.toContain(">error<");
    expect(html).not.toContain(">help<");
    expect(html).not.toContain(">unknown_future_symbol<");
    expect(html).not.toContain('data-forge-icon-name="info"');
    expect(html).not.toContain('data-forge-icon-name="error"');
    expect(html).not.toContain('data-forge-icon-codepoint="e88e"');
    expect(html).not.toContain('data-forge-icon-codepoint="e000"');
    expect(html).not.toContain('data-forge-icon-codepoint="e887"');
  });

  it("keeps management table content visible on mobile when no card fallback is supplied", () => {
    const html = renderToStaticMarkup(
      createElement(
        ForgeManagementTable,
        null,
        createElement("table", null, createElement("tbody", null, createElement("tr", null, "Desktop row"))),
      ),
    );

    expect(html).toContain("Desktop row");
    expect(html).toContain('data-forge-management-table="true"');
    expect(html).not.toContain('class="hidden md:block"');
  });

  it("does not hardcode readiness status copy", () => {
    const genericHtml = renderToStaticMarkup(
      createElement(ForgeReadinessPanel, {
        label: "Completion",
        value: "67%",
      }),
    );
    const statusHtml = renderToStaticMarkup(
      createElement(ForgeReadinessPanel, {
        label: "Completion",
        statusLabel: "Needs review",
        statusTone: "ember",
        value: "67%",
      }),
    );

    expect(genericHtml).not.toContain("Ready");
    expect(statusHtml).toContain("Needs review");
    expect(statusHtml).toContain('data-forge-chip="ember"');
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
            title: "Dashboard",
          },
          createElement("p", null, "Widget content"),
        ),
        createElement(
          ForgeSettingsGroup,
          {
            description: "Configure the account.",
            title: "Settings",
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
    expect(html).toContain("Dashboard");
    expect(html).toContain("Settings");
    expect(html).toContain("Edit user");
  });

  it("provides structural workspace rails that match the settings rail model", () => {
    const html = renderToStaticMarkup(
      createElement(
        ForgeWorkspaceLayout,
        {
          railCount: 2,
          rails: [
            createElement(
              ForgeWorkspaceRail,
              {
                description: "Create, edit, and assign modules.",
                eyebrow: "Admin controls",
                key: "admin",
                title: "Builder controls",
              },
              createElement(
                ForgeWorkspaceRailGroup,
                { label: "Actions" },
                createElement(
                  ForgeWorkspaceRailAction,
                  { icon: "add", type: "button" },
                  "Create module",
                ),
              ),
            ),
            createElement(
              ForgeWorkspaceRail,
              {
                description: "Choose the active module.",
                eyebrow: "Course structure",
                key: "structure",
                title: "Curriculum map",
              },
              createElement("p", null, "Discovery"),
            ),
          ],
        },
        createElement("main", null, "Workspace stage"),
      ),
    );

    expect(html).toContain('data-forge-workspace-layout="two-rails"');
    expect(html).toContain('data-forge-workspace-placement="left"');
    expect(html).toContain("forge-workspace-layout");
    expect(html).toContain("forge-workspace-rail");
    expect(html).toContain("forge-symbol-icon");
    expect(html).toContain('data-forge-workspace-rail="true"');
    expect(html).toContain('data-forge-workspace-main="true"');
    expect(html).toContain("Admin controls");
    expect(html).toContain("Builder controls");
    expect(html).toContain("Course structure");
    expect(html).toContain("Curriculum map");
    expect(html).toContain("Create module");
    expect(html).not.toContain("#74b1ff");
  });

  it("infers two-rail workspace layout from a rails array", () => {
    const html = renderToStaticMarkup(
      createElement(
        ForgeWorkspaceLayout,
        {
          rails: [
            createElement(ForgeWorkspaceRail, { key: "left", title: "Left rail" }),
            createElement(ForgeWorkspaceRail, { key: "right", title: "Right rail" }),
          ],
        },
        createElement("section", null, "Inferred workspace"),
      ),
    );

    expect(html).toContain('data-forge-workspace-layout="two-rails"');
    expect(html).toContain("Left rail");
    expect(html).toContain("Right rail");
    expect(html).toContain("Inferred workspace");
  });

  it("renders a safe one-rail workspace composition without manual rail count", () => {
    const html = renderToStaticMarkup(
      createElement(
        ForgeWorkspaceLayout,
        {
          rails: createElement(ForgeWorkspaceRail, { title: "Filters" }),
        },
        createElement("section", null, "Workspace stage"),
      ),
    );

    expect(html).toContain('data-forge-workspace-layout="one-rail"');
    expect(html).toContain('data-forge-workspace-main="true"');
    expect(html).toContain("Filters");
    expect(html).toContain("Workspace stage");
  });

  it("adds accessible active semantics and safe button defaults to workspace rail actions", () => {
    const linkHtml = renderToStaticMarkup(
      createElement(ForgeWorkspaceRailAction, { active: true, href: "/training" }, "Training"),
    );
    const buttonHtml = renderToStaticMarkup(
      createElement(ForgeWorkspaceRailAction, { active: true }, "Current filter"),
    );
    const explicitButtonHtml = renderToStaticMarkup(
      createElement(
        ForgeWorkspaceRailAction,
        { active: true, "aria-pressed": false, type: "submit" },
        "Submit filter",
      ),
    );

    expect(linkHtml).toContain('aria-current="page"');
    expect(buttonHtml).toContain('aria-pressed="true"');
    expect(buttonHtml).toContain('type="button"');
    expect(explicitButtonHtml).toContain('aria-pressed="false"');
    expect(explicitButtonHtml).toContain('type="submit"');
  });

  it("renders collapsible workspace rails with icon-only action labels preserved for assistive tech", () => {
    const html = renderToStaticMarkup(
      createElement(
        ForgeWorkspaceRail,
        {
          collapsible: true,
          defaultCollapsed: true,
          title: "Builder controls",
        },
        createElement(
          ForgeWorkspaceRailGroup,
          { label: "Actions" },
          createElement(
            ForgeWorkspaceRailAction,
            { icon: "add", type: "button" },
            "Create module",
          ),
        ),
      ),
    );

    expect(html).toContain('data-forge-workspace-rail-collapsible="true"');
    expect(html).toContain('data-forge-workspace-rail-collapsed-default="true"');
    expect(html).toContain("Expand Builder controls");
    expect(html).toContain('data-forge-workspace-rail-action-label="true"');
    expect(html).toContain('aria-label="Create module"');
  });
});
