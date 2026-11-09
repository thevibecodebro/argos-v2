// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingProductShowcase } from "../components/public/product-showcase";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setup(reduced = false) {
  vi.useFakeTimers();
  const listeners = new Set<() => void>();
  const media = {
    matches: reduced,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => media);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(createElement(LandingProductShowcase)));
  const button = (name: string) => container.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
  const control = (label: string) => Array.from(container.querySelectorAll("button")).find((element) => element.textContent === label);
  const setReduced = (matches: boolean) => act(() => { media.matches = matches; listeners.forEach((listener) => listener()); });
  return { root, container, button, control, setReduced, listeners };
}

describe("LandingProductShowcase", () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ""; });

  it("stops rotation after a manual selection and lets the visitor resume it", () => {
    const { root, button, control } = setup();
    act(() => button("Show Calls").click());
    act(() => vi.advanceTimersByTime(12000));
    expect(button("Show Calls").getAttribute("aria-current")).toBe("true");
    act(() => control("Resume rotation")!.click());
    act(() => vi.advanceTimersByTime(6000));
    expect(button("Show Scorecards").getAttribute("aria-current")).toBe("true");
    act(() => root.unmount());
  });

  it("responds to live reduced-motion changes and cleans up the timer and listener", () => {
    const { root, button, control, setReduced, listeners } = setup();
    expect(vi.getTimerCount()).toBe(1);
    setReduced(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(control("Pause rotation")).toBeUndefined();
    act(() => vi.advanceTimersByTime(12000));
    expect(button("Show Dashboard").getAttribute("aria-current")).toBe("true");
    setReduced(false);
    expect(control("Pause rotation")).toBeDefined();
    act(() => vi.advanceTimersByTime(6000));
    expect(button("Show Calls").getAttribute("aria-current")).toBe("true");
    act(() => root.unmount());
    expect(listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["selection", "pause"])("preserves a manual %s through preference changes", (method) => {
    const { root, button, control, setReduced } = setup();
    if (method === "selection") act(() => button("Show Calls").click());
    else act(() => control("Pause rotation")!.click());
    setReduced(true);
    setReduced(false);
    expect(control("Resume rotation")).toBeDefined();
    act(() => vi.advanceTimersByTime(12000));
    expect(button(method === "selection" ? "Show Calls" : "Show Dashboard").getAttribute("aria-current")).toBe("true");
    act(() => root.unmount());
  });

  it("starts static with reduced motion and scrolls instantly after a preference change", () => {
    const { root, button, control, setReduced } = setup(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(control("Pause rotation")).toBeUndefined();
    setReduced(false);
    expect(control("Pause rotation")).toBeDefined();
    setReduced(true);
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scroll });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: -10, right: 10 } as DOMRect);
    // Make the selected button extend past the rail's left edge.
    const rail = button("Show Calls").parentElement!;
    vi.spyOn(rail, "getBoundingClientRect").mockReturnValue({ left: 0, right: 100 } as DOMRect);
    act(() => button("Show Calls").click());
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior: "instant" }));
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    act(() => root.unmount());
  });
});
