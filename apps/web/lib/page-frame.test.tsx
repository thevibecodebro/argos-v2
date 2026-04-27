import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageFrame } from "../components/page-frame";

describe("PageFrame", () => {
  it("renders header copy by default", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Training",
        description:
          "Review assigned modules, complete lessons, and guide practice from one training surface.",
        eyebrow: "Training",
        actions: [{ href: "/highlights", label: "Open highlights" }],
        children: createElement("div", null, "Training body"),
      }),
    );

    expect(html).toContain("Training");
    expect(html).toContain(
      "Review assigned modules, complete lessons, and guide practice from one training surface.",
    );
    expect(html).toContain("Open highlights");
    expect(html).toContain("Training body");
  });

  it("renders the shared forge page header treatment", () => {
    const html = renderToStaticMarkup(
      createElement(PageFrame, {
        title: "Calls",
        description: "Review scored calls, transcripts, coaching moments, and processing status.",
        eyebrow: "Call intake",
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
});
