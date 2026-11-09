// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteRecordingButton } from "../components/delete-recording-button";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("DeleteRecordingButton", () => {
  let root: Root;
  let container: HTMLDivElement;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    replace.mockReset();
    refresh.mockReset();
  });
  async function mount(detailPage = false) {
    await act(async () => root.render(<DeleteRecordingButton callId="call-1" callTopic="Demo" detailPage={detailPage} />));
  }
  function trigger() { return container.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!; }
  function item() { return container.querySelector<HTMLButtonElement>('[role="menuitem"]')!; }
  async function click(element: HTMLElement) { await act(async () => element.click()); }
  async function key(element: HTMLElement, value: string, shiftKey = false) {
    await act(async () => element.dispatchEvent(new KeyboardEvent("keydown", { key: value, shiftKey, bubbles: true, cancelable: true })));
  }
  function button(label: string) { return [...container.querySelectorAll("button")].find((element) => element.textContent === label)!; }

  it("keeps deletion behind More actions and a confirmation, with cancellation returning focus", async () => {
    await mount();
    const more = trigger();
    expect(more.getAttribute("aria-label")).toBe("More actions for Demo");
    expect(more.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector('[role="menuitem"]')).toBeNull();
    await click(more);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(item());
    expect(fetchMock).not.toHaveBeenCalled();
    await click(item());
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(container.textContent).toContain("This cannot be undone.");
    expect(fetchMock).not.toHaveBeenCalled();
    await click(button("Cancel"));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(more);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["Enter", " ", "ArrowDown", "ArrowUp"])("opens the menu with %j and restores focus on Escape", async (openingKey) => {
    await mount();
    trigger().focus();
    await key(trigger(), openingKey);
    expect(document.activeElement).toBe(item());
    await key(item(), "ArrowDown");
    expect(document.activeElement).toBe(item());
    await key(item(), "ArrowUp");
    expect(document.activeElement).toBe(item());
    await key(item(), "Escape");
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["Enter", " "])("opens the confirmation from the menu with %j without deleting", async (activationKey) => {
    await mount();
    await click(trigger());
    await key(item(), activationKey);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(container.textContent).toContain("This cannot be undone.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["resize", "scroll"])("closes on viewport %s and returns focus", async (eventName) => {
    await mount();
    await click(trigger());
    await act(async () => window.dispatchEvent(new Event(eventName)));
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("closes on Tab without preventing native focus movement", async () => {
    await mount();
    await click(trigger());
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    await act(async () => item().dispatchEvent(event));
    expect(event.defaultPrevented).toBe(false);
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it("closes on outside interaction without stealing focus", async () => {
    await mount();
    await click(trigger());
    const outside = document.createElement("button");
    document.body.append(outside);
    try {
      await act(async () => {
        outside.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
        outside.focus();
      });
      expect(container.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(outside);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally { outside.remove(); }
  });

  it("closes when keyboard focus leaves the menu", async () => {
    await mount();
    await click(trigger());
    const outside = document.createElement("button");
    document.body.append(outside);
    try {
      await act(async () => outside.focus());
      expect(container.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(outside);
    } finally { outside.remove(); }
  });

  it("deletes from the list only after confirmation and refreshes the current view", async () => {
    await mount();
    await click(trigger());
    await click(item());
    expect(fetchMock).not.toHaveBeenCalled();
    await click(button("Delete recording"));
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/calls/call-1", { method: "DELETE" });
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("retains the visible detail-page Delete control and returns to the library after confirmation", async () => {
    await mount(true);
    expect(trigger()).toBeNull();
    await click(container.querySelector<HTMLButtonElement>('button[aria-label="Delete recording Demo"]')!);
    expect(container.textContent).toContain("This cannot be undone.");
    expect(fetchMock).not.toHaveBeenCalled();
    await click(button("Delete recording"));
    expect(fetchMock).toHaveBeenCalledWith("/api/calls/call-1", { method: "DELETE" });
    expect(replace).toHaveBeenCalledWith("/calls");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps a failed deletion in the confirmation with a useful error", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Could not delete this recording. Please try again." }) });
    await mount();
    await click(trigger());
    await click(item());
    await click(button("Delete recording"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Please try again.");
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(refresh).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
