// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformOrganizationSwitcher } from "../components/platform/platform-organization-switcher";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External effects are blocked in presentation tests"); }));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("platform switcher presentation", () => {
  it("scopes automatic compact labels to the tenant tablet rail", async () => {
    await act(async () => root.render(createElement(PlatformOrganizationSwitcher, {
      activeSession: null, organizations: [],
    })));
    expect(container.querySelector("[data-platform-switcher-label]")).not.toBeNull();
    expect(container.querySelector("[data-platform-switcher-chevron]")).not.toBeNull();
    const css = readFileSync(resolve(process.cwd(), "components/platform/platform-console.module.css"), "utf8");
    expect(css).toMatch(/@media\s*\(min-width:\s*768px\)\s*and\s*\(max-width:\s*1023px\)/);
    expect(css).toContain(':global(#auth-navigation) .switcher [data-platform-switcher-label]');
    expect(css).toContain(':global(#auth-navigation) .switcher [data-platform-switcher-chevron]');
  });

  it("keeps the complete menu inside a short viewport when its long-name trigger sits low", async () => {
    vi.stubGlobal("innerWidth", 800);
    vi.stubGlobal("innerHeight", 400);
    container.id = "auth-navigation";
    await act(async () => root.render(createElement(PlatformOrganizationSwitcher, {
      activeSession: {
        expiresAt: "2026-06-11T16:30:00.000Z", id: "session-1", reason: "Synthetic support",
        targetOrgId: "org-1", targetOrgName: "Synthetic Long Organization ".repeat(6), targetOrgSlug: "synthetic",
      }, organizations: [],
    })));
    const wrapper = container.querySelector<HTMLDivElement>("[data-platform-organization-switcher]")!;
    const trigger = container.querySelector<HTMLButtonElement>("[data-platform-organization-switcher-trigger]")!;
    const menu = container.querySelector<HTMLDivElement>("[data-platform-organization-switcher-menu]")!;
    const rect = { x: 12, y: 180, top: 180, bottom: 232, left: 12, right: 68, width: 56, height: 52, toJSON() {} };
    vi.spyOn(wrapper, "getBoundingClientRect").mockReturnValue(rect);
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(rect);

    await act(async () => trigger.click());
    expect(parseFloat(menu.style.maxHeight)).toBeGreaterThanOrEqual(240);
    const viewportTop = rect.top + parseFloat(menu.style.top);
    expect(viewportTop).toBeGreaterThanOrEqual(16);
    expect(viewportTop + parseFloat(menu.style.maxHeight)).toBeLessThanOrEqual(384);
    expect(rect.left + parseFloat(menu.style.left)).toBeGreaterThanOrEqual(rect.right);
    expect(menu.querySelector("[data-platform-return-to-agency]")).not.toBeNull();

    vi.stubGlobal("innerHeight", 240);
    await act(async () => window.dispatchEvent(new Event("resize")));
    expect(rect.top + parseFloat(menu.style.top)).toBe(16);
    expect(parseFloat(menu.style.maxHeight)).toBe(208);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("opens into labeled search and returns keyboard focus on Escape without a network action", async () => {
    await act(async () => root.render(createElement(PlatformOrganizationSwitcher, {
      activeSession: null,
      collapsed: true,
      organizations: [{
        accessModel: "legacy", createdAt: "2026-06-11T15:30:00.000Z", id: "org-1",
        name: "Synthetic Organization", plan: "trial", slug: "synthetic-organization",
      }],
    })));
    const trigger = container.querySelector<HTMLButtonElement>("[data-platform-organization-switcher-trigger]")!;
    const menu = container.querySelector<HTMLDivElement>("[data-platform-organization-switcher-menu]")!;
    const search = container.querySelector<HTMLInputElement>("input[type='search']")!;

    expect(menu.hidden).toBe(true);
    await act(async () => trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(menu.hidden).toBe(false);
    expect(menu.getAttribute("role")).toBe("dialog");
    expect(menu.getAttribute("aria-label")).toBe("Switch organization");
    expect(document.activeElement).toBe(search);

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(menu.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(fetch).not.toHaveBeenCalled();
  });
});
