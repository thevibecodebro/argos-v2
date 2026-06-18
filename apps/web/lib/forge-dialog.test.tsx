import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ForgeDialog } from "../components/forge-dialog";

const globalsCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

function getCssRule(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globalsCss.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));

  return match?.[1] ?? "";
}

function getAttribute(html: string, attribute: string) {
  return html.match(new RegExp(`${attribute}="([^"]+)"`))?.[1] ?? "";
}

function getClassForDataAttribute(html: string, dataAttribute: string) {
  const elementMarkup = html.match(new RegExp(`<[^>]*${dataAttribute}="true"[^>]*>`))?.[0] ?? "";

  return getAttribute(elementMarkup, "class");
}

describe("ForgeDialog", () => {
  it("renders empty markup when closed", () => {
    const html = renderToStaticMarkup(
      createElement(ForgeDialog, {
        onOpenChange: () => {},
        open: false,
        title: "Generate roleplay",
      }),
    );

    expect(html).toBe("");
  });

  it("renders Forge dialog semantics and warm visual markers when open", () => {
    const html = renderToStaticMarkup(
      createElement(
        ForgeDialog,
        {
          description: "Create a practice scenario from this call.",
          footer: createElement("button", { type: "button" }, "Generate"),
          onOpenChange: () => {},
          open: true,
          title: "Generate roleplay",
        },
        createElement("button", { type: "button" }, "Choose prompt"),
      ),
    );

    expect(html).toContain('data-forge-dialog-overlay="true"');
    expect(html).toContain('data-forge-dialog-panel="true"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');

    const labelledBy = getAttribute(html, "aria-labelledby");
    const describedBy = getAttribute(html, "aria-describedby");
    const titleId = html.match(/<h2[^>]*id="([^"]+)"[^>]*>Generate roleplay<\/h2>/)?.[1];
    const descriptionId = html.match(
      /<p[^>]*id="([^"]+)"[^>]*>Create a practice scenario from this call\.<\/p>/,
    )?.[1];

    expect(labelledBy).toBe(titleId);
    expect(describedBy).toBe(descriptionId);
    expect(html).toContain('aria-label="Close dialog"');
    expect(html).toContain("forge-dialog-overlay");
    expect(html).toContain("forge-dialog-panel");

    const panelClassName = getClassForDataAttribute(html, "data-forge-dialog-panel");

    expect(panelClassName).toContain("flex");
    expect(panelClassName).toContain("flex-col");
    expect(html).toContain("forge-dialog-body");
    expect(getClassForDataAttribute(html, "data-forge-dialog-body")).toContain("min-h-0 overflow-y-auto");
    expect(html).toContain("forge-surface");
    expect(html).toContain("text-[var(--forge-gold)]");
    expect(html).not.toContain("#74b1ff");
    expect(html).not.toContain("#6dddff");
  });

  it("keeps Forge focus foundations token based", () => {
    const focusRingRule = getCssRule(".forge-focus-ring:focus-visible");
    const formControlFocusRule = getCssRule(".forge-form-control:focus-visible");

    expect(focusRingRule).toContain("var(--forge-focus)");
    expect(formControlFocusRule).toContain("var(--forge-focus)");
    expect(focusRingRule).not.toContain("rgba(241, 191, 123");
    expect(formControlFocusRule).not.toContain("rgba(241, 191, 123");
  });
});
