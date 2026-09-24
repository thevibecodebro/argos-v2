// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileWorkspaceMenu } from "../components/mobile-workspace-menu";
import { SecondaryRail, SecondaryRailLink } from "../components/secondary-rail";
import { getVisibleNavGroups } from "../components/app-navigation";

let root: Root;
let container: HTMLDivElement;
async function mount(element: React.ReactNode) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) { this.open = false; });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root.render(element));
}
afterEach(async () => { if(root) await act(async()=>root.unmount()); container?.remove(); vi.unstubAllGlobals(); });

describe("workspace responsive navigation", () => {
  it("exposes role-filtered pages in a modal and restores scroll and focus on Escape", async () => {
    await mount(<MobileWorkspaceMenu currentPath="/roleplay/history" groups={getVisibleNavGroups("rep")} onNavigate={()=>{}} />);
    const trigger = container.querySelector("button")!; trigger.focus();
    await act(async()=>trigger.click());
    const dialog=container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    expect(dialog.querySelector('a[href="/roleplay"]')?.getAttribute("aria-current")).toBe("page");
    expect(dialog.querySelector('a[href="/team"]')).toBeNull();
    expect(dialog.querySelector('a[href="/notifications"]')).not.toBeNull();
    await act(async()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})));
    expect(container.querySelector("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(trigger);
  });
  it("discloses secondary navigation and collapses after choosing a section", async () => {
    await mount(<SecondaryRail railId="test" title="Settings"><SecondaryRailLink active href="#account" icon="person" label="Account"/><SecondaryRailLink href="#teams" icon="groups" label="Teams"/></SecondaryRail>);
    const trigger=container.querySelector<HTMLButtonElement>(".secondary-rail-mobile-trigger")!;
    expect(trigger.textContent).toContain("Settings: Account");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await act(async()=>trigger.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await act(async()=>container.querySelector<HTMLAnchorElement>('a[href="#teams"]')!.click());
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
