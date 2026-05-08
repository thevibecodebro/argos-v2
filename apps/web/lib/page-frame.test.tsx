import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageFrame } from "../components/page-frame";
import { AuthenticatedPageContainer } from "../components/authenticated-page-container";

describe("PageFrame", () => {
  it("renders header copy by default", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Training",
        description: "Review assigned modules and complete the next lesson.",
        eyebrow: "Training",
        actions: [{ href: "/highlights", label: "Open highlights" }],
        children: createElement("div", null, "Training body"),
      }),
    );

    expect(html).toContain("Training");
    expect(html).toContain("Review assigned modules and complete the next lesson.");
    expect(html).toContain("Open highlights");
    expect(html).toContain("Training body");
  });

  it("renders the shared forge page header treatment", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Calls",
        description: "Review scored calls, transcripts, coaching moments, and processing status.",
        eyebrow: "Calls",
        actions: [{ href: "/upload", label: "Upload call" }],
        children: createElement("div", null, "Calls body"),
      }),
    );

    expect(html).toContain('data-page-header="forge"');
    expect(html).toContain("forge-page-header");
    expect(html).toContain("Upload call");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#10131a");
  });

  it("keeps route actions while hiding the hero copy in hidden mode", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Leaderboard",
        description: "Compare top-quality, top-volume, and most-improved slices across your team.",
        eyebrow: "Performance",
        headerMode: "hidden",
        actions: [{ href: "/team", label: "Open team view" }],
        children: createElement("div", null, "Leaderboard body"),
      }),
    );

    expect(html).toContain("Leaderboard body");
    expect(html).toContain("Open team view");
    expect(html).not.toContain(
      "Compare top-quality, top-volume, and most-improved slices across your team.",
    );
    expect(html).not.toContain("Performance");
    expect(html).not.toContain(">Leaderboard<");
  });

  it("supports one primary action, secondary actions, status chips, and a compact workflow slot", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Training",
        description: "Build, assign, and monitor readiness work.",
        eyebrow: "Curriculum",
        primaryAction: { href: "/training/new", label: "Create module", icon: "add" },
        secondaryActions: [{ href: "/training/archive", label: "Archive" }],
        statusChips: [
          { label: "AI ready", tone: "success", icon: "check_circle" },
          { label: "4 drafts", tone: "gold" },
        ],
        workflowSlot: createElement("span", null, "Manager workflow"),
        children: createElement("div", null, "Training body"),
      }),
    );

    expect(html).toContain('data-page-header="forge"');
    expect(html).toContain('data-page-primary-action="true"');
    expect(html).toContain('data-page-secondary-actions="true"');
    expect(html).toContain('data-page-status-chips="true"');
    expect(html).toContain('data-page-workflow-slot="true"');
    expect(html).toContain('data-forge-button="primary"');
    expect(html).toContain("Create module");
    expect(html).toContain("Archive");
    expect(html).toContain("AI ready");
    expect(html).toContain("Manager workflow");
  });

  it("standardizes authenticated page container gutters and widths", () => {
    const standardHtml = renderToStaticMarkup(
      createElement(
        AuthenticatedPageContainer,
        null,
        createElement(PageFrame, {
          title: "Dashboard",
          description: "Review performance.",
          children: createElement("div", null, "Dashboard body"),
        }),
      ),
    );
    const wideHtml = renderToStaticMarkup(
      createElement(AuthenticatedPageContainer, { size: "wide" }, "Call detail"),
    );

    expect(standardHtml).toContain('data-authenticated-page-container="standard"');
    expect(standardHtml).toContain("px-4 py-6 sm:px-6 lg:px-8");
    expect(standardHtml).toContain("max-w-7xl");
    expect(wideHtml).toContain('data-authenticated-page-container="wide"');
    expect(wideHtml).toContain("max-w-[1600px]");
  });

  it("keeps simple actions compatibility as secondary header actions", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Calls",
        description: "Review scored calls.",
        actions: [
          { href: "/upload", label: "Upload call" },
          { href: "/calls/export", label: "Export" },
        ],
        children: createElement("div", null, "Calls body"),
      }),
    );

    expect(html).toContain('data-page-secondary-actions="true"');
    expect(html).toContain('href="/upload"');
    expect(html).toContain('href="/calls/export"');
    expect(html).not.toContain('data-page-primary-action="true"');
  });

  it("renders duplicate status chip labels without dropping chips", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Calls",
        description: "Review scored calls.",
        statusChips: [
          { label: "Active", tone: "gold" },
          { label: "Active", tone: "gold" },
        ],
        children: createElement("div", null, "Calls body"),
      }),
    );

    expect(html.match(/Active/g)).toHaveLength(2);
    expect(html).toContain('data-page-status-chips="true"');
  });
});
