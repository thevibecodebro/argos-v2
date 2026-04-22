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
