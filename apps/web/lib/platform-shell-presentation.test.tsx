// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlatformShell } from "../components/platform/platform-shell";

let container: HTMLDivElement;
let root: Root;
let mediaListeners: Set<() => void>;
let desktopMedia: MediaQueryList;
let mounted = true;

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mediaListeners = new Set();
  desktopMedia = {
    matches: false,
    media: "(min-width: 1024px)",
    addEventListener: (_event: string, listener: () => void) => mediaListeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) => mediaListeners.delete(listener),
  } as unknown as MediaQueryList;
  vi.stubGlobal("matchMedia", () => desktopMedia);
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Presentation tests block external effects"); }));
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(function (this: HTMLElement) {
    return (this.classList.contains("hidden") ? [] : [{ width: 44, height: 44 }]) as unknown as DOMRectList;
  });
  document.body.style.overflow = "clip";
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  mounted = true;
  await act(async () => root.render(createElement(PlatformShell, {
    activePath: "/platform/dashboard", activeSession: null, currentUserEmail: "owner@argos.test",
    organizationCount: 0, organizations: [], staffRole: "owner", staffStatus: "active",
    children: createElement("button", { "data-background-action": true }, "Background action"),
  })));
});

afterEach(async () => {
  if (mounted) await act(async () => root.unmount());
  container.remove();
  document.body.style.overflow = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openNavigation() {
  const trigger = container.querySelector<HTMLButtonElement>('[aria-label="Open navigation"]')!;
  trigger.focus();
  await act(async () => trigger.click());
  return {
    trigger,
    drawer: container.querySelector<HTMLElement>("[data-platform-sidebar]")!,
    content: container.querySelector<HTMLElement>("[data-auth-shell-content]")!,
  };
}

function key(key: string, shiftKey = false) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }));
}

describe("platform mobile navigation", () => {
  it("keeps a shrinking, scrollable desktop route region between the fixed header and footer", () => {
    const drawer = container.querySelector<HTMLElement>("[data-platform-sidebar]")!;
    const navigation = drawer.querySelector<HTMLElement>("nav")!;
    expect(navigation.className).toContain("lg:min-h-11");
    expect(navigation.className).toContain("lg:shrink");
    expect(navigation.className).toContain("lg:overflow-y-auto");
    expect(drawer.className).toContain("overflow-y-auto");
    expect(drawer.className).not.toContain("lg:overflow-visible");
    expect(drawer.className).toContain("has-[[data-platform-organization-switcher-menu][data-state=open]]:overflow-visible");
  });

  it("gives the transparent logo the tenant rail's dark backing", () => {
    const logo = container.querySelector('[data-argos-logo="primary-rail"]')!;
    expect(logo.className).toContain("bg-[#0A0A0A]");
    expect(logo.className).toContain("px-2");
    expect(logo.className).toContain("py-2");
  });

  it("focuses inside, contains both Tab directions, and restores focus/scroll after Escape", async () => {
    const { trigger, drawer, content } = await openNavigation();
    const close = drawer.querySelector<HTMLButtonElement>('[aria-label="Close navigation"]')!;
    const last = drawer.querySelector<HTMLAnchorElement>('a[href="/platform/staff"]')!;
    expect(document.activeElement).toBe(close);
    expect(drawer.getAttribute("aria-modal")).toBe("true");
    expect(content.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    last.focus();
    await act(async () => key("Tab"));
    expect(document.activeElement).toBe(close);
    await act(async () => key("Tab", true));
    expect(document.activeElement).toBe(last);
    container.querySelector<HTMLButtonElement>("[data-background-action]")!.focus();
    expect(document.activeElement).toBe(close);
    await act(async () => key("Escape"));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(content.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("clip");
  });

  it("closes from the backdrop and releases listeners and body lock on unmount", async () => {
    const { trigger } = await openNavigation();
    const backdrop = container.querySelector<HTMLButtonElement>('[data-platform-navigation-backdrop]')!;
    await act(async () => backdrop.click());
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("clip");
    await openNavigation();
    await act(async () => root.unmount());
    mounted = false;
    expect(document.body.style.overflow).toBe("clip");
    expect(mediaListeners.size).toBe(0);
  });

  it("closes on desktop resize and moves focus to the visible active rail link", async () => {
    const { trigger, content } = await openNavigation();
    Object.defineProperty(desktopMedia, "matches", { value: true });
    await act(async () => mediaListeners.forEach(listener => listener()));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(content.hasAttribute("inert")).toBe(false);
    expect(document.body.style.overflow).toBe("clip");
    expect(document.activeElement).toBe(container.querySelector('a[aria-current="page"]'));
  });

  it("lets the nested switcher handle the first Escape before closing navigation", async () => {
    const { trigger, drawer } = await openNavigation();
    const switcher = drawer.querySelector<HTMLButtonElement>("[data-platform-organization-switcher-trigger]")!;
    await act(async () => switcher.click());
    expect(document.activeElement).toBe(drawer.querySelector('input[type="search"]'));
    await act(async () => key("Escape"));
    expect(switcher.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(switcher);
    await act(async () => key("Escape"));
    expect(document.activeElement).toBe(trigger);
    expect(fetch).not.toHaveBeenCalled();
  });
});
