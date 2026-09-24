// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteRecordingButton } from "../components/delete-recording-button";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("DeleteRecordingButton", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    vi.unstubAllGlobals();
    replace.mockReset();
    refresh.mockReset();
  });

  it("requires confirmation before deleting and returns to the library", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<DeleteRecordingButton callId="call-1" callTopic="Demo" detailPage />));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      (container?.querySelector('button[aria-label="Delete recording Demo"]') as HTMLButtonElement).click();
    });
    expect(container.textContent).toContain("This cannot be undone.");
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      const confirm = [...container!.querySelectorAll("button")].find((button) => button.textContent === "Delete recording");
      confirm?.click();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/calls/call-1", { method: "DELETE" });
    expect(replace).toHaveBeenCalledWith("/calls");
    expect(refresh).toHaveBeenCalledOnce();
  });
});
