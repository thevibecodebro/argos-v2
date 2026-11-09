// @vitest-environment jsdom
// Actual filter/workspace components with synthetic, in-memory Next routing.
// These tests cover state/timers, not browser hit testing or real Next requests.
import { act, createElement, type AnchorHTMLAttributes } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CallsFilters } from "../app/(authenticated)/calls/calls-filters";
import { CallsWorkspace } from "../components/calls-workspace";
import { getCallsWorkspaceQuery } from "../components/calls-workspace-query";

const routing = vi.hoisted(() => ({
  params: new URLSearchParams(),
  navigate: (_href: string) => {},
  replace: vi.fn(),
  deferLinks: false,
  linkHref: "",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => routing.params,
  useRouter: () => ({ replace: routing.replace, refresh: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", {
      ...props, href,
      onClick: (event) => {
        event.preventDefault();
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        routing.linkHref = String(href);
        if (!routing.deferLinks) routing.navigate(String(href));
      },
    }, children),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("Calls filter navigation", () => {
  let root: Root;
  let container: HTMLDivElement;
  let commitImmediately: boolean;

  function render(scoringEnabled = true) {
    const query = getCallsWorkspaceQuery(Object.fromEntries(routing.params), scoringEnabled);
    root.render(<CallsWorkspace calls={[]} total={0} canSeeRep canUpload={false} scoringEnabled={scoringEnabled}
      canDelete={false} hasActiveFilters={query.hasActiveFilters} views={query.views}
      page={query.page} totalPages={query.totalPages} previousHref={query.previousHref}
      nextHref={query.nextHref} filters={<CallsFilters initialSearch={query.filters.search ?? ""} scoringEnabled={scoringEnabled} />} />);
  }
  async function navigate(href: string) {
    await act(async () => routing.navigate(href));
  }
  function input() {
    return container.querySelector<HTMLInputElement>("input#search")!;
  }
  async function clickView(label: string) {
    const link = [...container.querySelectorAll<HTMLAnchorElement>("nav[aria-label='Call views'] a")]
      .find((element) => element.textContent === label);
    expect(link).toBeTruthy();
    await act(async () => link!.click());
  }
  async function clear() {
    const button = container.querySelector<HTMLButtonElement>("button[aria-label='Clear filters']");
    expect(button).toBeTruthy();
    await act(async () => button!.click());
  }
  async function fill(value: string) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value);
      input().dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input().value).toBe(value);
  }
  async function select(id: string, value: string) {
    await act(async () => {
      const control = container.querySelector<HTMLSelectElement>(`select#${id}`)!;
      control.value = value;
      control.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }
  async function advance(ms: number) {
    await act(async () => vi.advanceTimersByTime(ms));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    commitImmediately = true;
    routing.deferLinks = false;
    routing.linkHref = "";
    window.history.replaceState(null, "", "/calls");
    routing.params = new URLSearchParams();
    routing.replace.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    routing.navigate = (href) => {
      routing.params = new URL(href, "http://synthetic.invalid").searchParams;
      render();
    };
    routing.replace.mockImplementation((href: string) => {
      if (commitImmediately) routing.navigate(href);
    });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("keeps Processing to All calls stable without typing", async () => {
    await navigate("/calls");
    for (let n = 0; n < 3; n++) {
      await clickView("Processing");
      expect(routing.params.get("status")).toBe("processing");
      await advance(600_000);
      await clickView("All calls");
      await advance(200);
      expect(routing.params.get("status")).toBeNull();
    }
    expect(routing.replace).not.toHaveBeenCalled();
  });

  it("coalesces rapid typing after 180ms and preserves the other query filters", async () => {
    await navigate("/calls?status=processing&minScore=70&sort=createdAt%3Aasc&offset=20");
    await fill("pri");
    await advance(100);
    await fill("pricing");
    await advance(179);
    expect(routing.replace).not.toHaveBeenCalled();
    await advance(1);
    expect(routing.replace).toHaveBeenCalledTimes(1);
    expect(routing.params.get("search")).toBe("pricing");
    expect(routing.params.get("status")).toBe("processing");
    expect(routing.params.get("minScore")).toBe("70");
    expect(routing.params.get("sort")).toBe("createdAt:asc");
    expect(routing.params.has("offset")).toBe(false);
  });

  it("cancels uncommitted search when All calls navigates to its canonical URL", async () => {
    await navigate("/calls?status=processing");
    await fill("pricing");
    await clickView("All calls");
    await advance(200);
    expect(routing.params.toString()).toBe("");
    expect(input().value).toBe("");
    expect(routing.replace).not.toHaveBeenCalled();
  });

  it("preserves committed search while changing the saved view", async () => {
    await navigate("/calls?status=processing&search=pricing");
    await clickView("All calls");
    await advance(200);
    expect(routing.params.get("status")).toBeNull();
    expect(routing.params.get("search")).toBe("pricing");
    expect(input().value).toBe("pricing");
    expect(routing.replace).not.toHaveBeenCalled();
  });

  it("applies the first search after clearing an already empty search", async () => {
    await navigate("/calls?status=processing");
    await clear();
    await fill("pricing");
    await advance(180);
    expect(routing.params.get("status")).toBeNull();
    expect(routing.params.get("search")).toBe("pricing");
  });

  it("clears a pending search without another timer restoring it", async () => {
    await navigate("/calls?status=processing&search=old");
    await fill("pricing");
    await clear();
    await advance(200);
    expect(routing.params.toString()).toBe("");
    expect(input().value).toBe("");
    expect(routing.replace).toHaveBeenCalledTimes(1);
  });

  it("synchronizes the input on back/forward-style URL updates without replacing them", async () => {
    await navigate("/calls?search=first");
    expect(input().value).toBe("first");
    await fill("uncommitted");
    await navigate("/calls?search=previous&status=complete");
    expect(input().value).toBe("previous");
    await navigate("/calls?search=first");
    expect(input().value).toBe("first");
    await advance(200);
    expect(routing.replace).not.toHaveBeenCalled();
  });

  it("does not overwrite newer typing when an earlier search navigation commits", async () => {
    await navigate("/calls?status=processing");
    commitImmediately = false;
    await fill("pricing");
    await advance(180);
    const earlierHref = routing.replace.mock.calls[0][0] as string;
    await fill("pricing objections");
    await advance(50);
    await navigate(earlierHref);
    expect(input().value).toBe("pricing objections");
    await advance(130);
    expect(routing.replace).toHaveBeenCalledTimes(2);
    const latestHref = routing.replace.mock.calls[1][0] as string;
    await navigate(latestHref);
    expect(routing.params.get("search")).toBe("pricing objections");
    expect(input().value).toBe("pricing objections");
  });

  it("rebases typing onto Clear while the clear navigation is still pending", async () => {
    await navigate("/calls?status=processing");
    commitImmediately = false;
    await clear();
    await fill("pricing");
    await advance(50);
    await navigate("/calls");
    expect(input().value).toBe("pricing");
    await advance(130);
    expect(routing.replace).toHaveBeenCalledTimes(2);
    expect(routing.replace.mock.calls[1][0]).toBe("/calls?search=pricing");
  });

  it.each([
    ["status", "processing"],
    ["sort", "createdAt:asc"],
    ["minScore", "80"],
    ["maxScore", "70"],
  ])("keeps pending search and the new %s selection", async (key, value) => {
    await navigate("/calls");
    await fill("pricing");
    await select(key, value);
    expect(input().value).toBe("pricing");
    await advance(180);
    expect(routing.params.get(key)).toBe(value);
    expect(routing.params.get("search")).toBe("pricing");
  });

  it("uses the latest intended query while multiple replacements are in flight", async () => {
    await navigate("/calls?status=processing");
    commitImmediately = false;
    await fill("pricing");
    await advance(180);
    const firstHref = routing.replace.mock.calls[0][0] as string;
    await select("sort", "createdAt:asc");
    const secondHref = routing.replace.mock.calls[1][0] as string;
    await fill("pricing objections");
    await navigate(firstHref);
    await advance(180);
    const thirdHref = routing.replace.mock.calls[2][0] as string;
    expect(new URL(thirdHref, "http://synthetic.invalid").searchParams.get("sort")).toBe("createdAt:asc");
    await navigate(secondHref);
    expect(input().value).toBe("pricing objections");
    await navigate(thirdHref);
    expect(routing.params.get("status")).toBe("processing");
    expect(routing.params.get("sort")).toBe("createdAt:asc");
    expect(routing.params.get("search")).toBe("pricing objections");
  });

  it("searches from the Clear target even before Clear has committed", async () => {
    await navigate("/calls?status=processing&minScore=80");
    commitImmediately = false;
    await clear();
    await fill("pricing");
    await advance(180);
    expect(routing.replace.mock.calls[1][0]).toBe("/calls?search=pricing");
    await navigate("/calls");
    expect(input().value).toBe("pricing");
    await navigate(routing.replace.mock.calls[1][0] as string);
    expect(routing.params.toString()).toBe("search=pricing");
  });

  it("retains score range auto-clearing and default query normalization", async () => {
    await navigate("/calls?status=processing&maxScore=60&offset=20");
    await select("minScore", "80");
    expect(routing.params.get("minScore")).toBe("80");
    expect(routing.params.has("maxScore")).toBe(false);
    await select("maxScore", "70");
    expect(routing.params.has("minScore")).toBe(false);
    expect(routing.params.get("maxScore")).toBe("70");
    await select("status", "all");
    expect(routing.params.has("status")).toBe(false);
    expect(routing.params.has("offset")).toBe(false);
  });

  it.each([
    ["/calls?maxScore=60", "minScore", "80", "maxScore", "70"],
    ["/calls?minScore=80", "maxScore", "60", "minScore", "70"],
  ])("clears the intended opposite bound during delayed rapid changes from %s", async (href, firstKey, firstValue, lastKey, lastValue) => {
    await navigate(href);
    commitImmediately = false;
    await select(firstKey, firstValue);
    const firstHref = routing.replace.mock.calls[0][0] as string;
    await select(lastKey, lastValue);
    const latestHref = routing.replace.mock.calls[1][0] as string;
    const params = new URL(latestHref, "http://synthetic.invalid").searchParams;
    expect(params.has(firstKey)).toBe(false);
    expect(params.get(lastKey)).toBe(lastValue);
    await navigate(firstHref);
    await navigate(latestHref);
    expect(routing.params.has(firstKey)).toBe(false);
    expect(routing.params.get(lastKey)).toBe(lastValue);
  });

  it.each([false, true])("treats a saved-view click matching a queued replacement as explicit navigation (deferred: %s)", async (deferLinks) => {
    await navigate("/calls?status=processing&search=old");
    commitImmediately = false;
    routing.deferLinks = deferLinks;
    await select("status", "all");
    expect(routing.replace.mock.calls[0][0]).toBe("/calls?search=old");
    await fill("pricing");
    await clickView("All calls");
    await advance(180);
    expect(input().value).toBe("old");
    expect(routing.replace).toHaveBeenCalledTimes(1);
    if (deferLinks) await navigate(routing.linkHref);
    expect(input().value).toBe("old");
  });

  it("cancels search immediately for a Clear link before its navigation commits", async () => {
    await navigate("/calls?status=processing&search=old");
    commitImmediately = false;
    routing.deferLinks = true;
    await select("status", "all");
    await fill("pricing");
    const link = [...container.querySelectorAll<HTMLAnchorElement>("a")]
      .find((element) => element.textContent === "Clear filters")!;
    await act(async () => link.click());
    expect(routing.linkHref).toBe("/calls");
    await advance(180);
    expect(routing.replace).toHaveBeenCalledTimes(1);
    expect(input().value).toBe("");
    await navigate(routing.linkHref);
    expect(input().value).toBe("");
  });

  it("honors history navigation matching a queued replacement before the route commit", async () => {
    await navigate("/calls?status=processing&search=old");
    commitImmediately = false;
    await select("status", "all");
    await fill("pricing");
    await act(async () => {
      window.history.replaceState(null, "", "/calls?search=old");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await advance(180);
    expect(input().value).toBe("old");
    expect(routing.replace).toHaveBeenCalledTimes(1);
    await navigate("/calls?search=old");
    expect(input().value).toBe("old");
  });

  it.each([
    { metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 },
  ])("keeps the current search for a modified link click: %j", async (options) => {
    await navigate("/calls?status=processing&search=old");
    await fill("pricing");
    const link = container.querySelector<HTMLAnchorElement>("nav[aria-label='Call views'] a")!;
    await act(async () => link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...options })));
    expect(input().value).toBe("pricing");
    await advance(180);
    expect(routing.params.get("search")).toBe("pricing");
  });

  it.each([
    ["target", "_blank"], ["download", "recordings.csv"], ["href", "/calls#section"], ["href", "https://external.invalid/calls"],
  ])("ignores a link with %s=%s", async (attribute, value) => {
    await navigate("/calls?status=processing&search=old");
    routing.deferLinks = true;
    await fill("pricing");
    const link = container.querySelector<HTMLAnchorElement>("nav[aria-label='Call views'] a")!;
    link.setAttribute(attribute, value);
    await act(async () => link.click());
    expect(input().value).toBe("pricing");
    await advance(180);
    expect(routing.params.get("search")).toBe("pricing");
  });

  it("cancels search when the component unmounts", async () => {
    await navigate("/calls");
    await fill("pricing");
    await act(async () => root.render(null));
    await advance(200);
    expect(routing.replace).not.toHaveBeenCalled();
  });
});
