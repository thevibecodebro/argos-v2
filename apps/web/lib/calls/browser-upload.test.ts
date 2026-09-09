import { describe, expect, it, vi } from "vitest";
import { uploadCallFromBrowser } from "./browser-upload";

describe("uploadCallFromBrowser", () => {
  it("prepares the upload, sends the file to storage, and completes queueing", async () => {
    const uploadResumable = vi.fn().mockImplementation(async (input) => {
      input.onProgress(50);
      input.onProgress(100);
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            path: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "call-1",
            status: "uploaded",
            createdAt: "2026-04-21T00:00:00.000Z",
          }),
          { status: 200 },
        ),
      );
    const progressValues: number[] = [];

    const result = await uploadCallFromBrowser(
      {
        callTopic: "Discovery",
        file: new File(["audio"], "demo.mp3", { type: "audio/mpeg" }),
      },
      {
        fetchImpl: fetchImpl as typeof fetch,
        getAccessToken: vi.fn().mockResolvedValue("session-access-token"),
        onProgress: (progress) => progressValues.push(progress),
        uploadResumable,
      },
    );

    expect(result.id).toBe("call-1");
    expect(uploadResumable).toHaveBeenCalledWith({
      file: expect.any(File),
      getAccessToken: expect.any(Function),
      onProgress: expect.any(Function),
      path: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/api/calls/upload/prepare",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "/api/calls/upload/complete",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(progressValues).toEqual([15, 35, 60, 85, 100]);
  });

  it("surfaces plain-text upstream errors instead of throwing a JSON parse error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("Request Entity Too Large", { status: 413 }),
    );

    await expect(
      uploadCallFromBrowser(
        {
          callTopic: "Discovery",
          file: new File(["audio"], "demo.mp3", { type: "audio/mpeg" }),
        },
        {
          fetchImpl: fetchImpl as typeof fetch,
          uploadResumable: vi.fn(),
        },
      ),
    ).rejects.toThrow("Request Entity Too Large");
  });

  it("stops before storage upload when the browser session has expired", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          path: "recordings/manual-uploads/auth-user-1/upload-1/demo.mp3",
        }),
        { status: 200 },
      ),
    );
    const uploadResumable = vi.fn();

    await expect(
      uploadCallFromBrowser(
        {
          file: new File(["audio"], "demo.mp3", { type: "audio/mpeg" }),
        },
        {
          fetchImpl: fetchImpl as typeof fetch,
          getAccessToken: vi.fn().mockResolvedValue(null),
          uploadResumable,
        },
      ),
    ).rejects.toThrow("Your session expired. Sign in again and retry the upload.");

    expect(uploadResumable).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

it("retries completion on the same uploaded target after a lost response", async () => {
  let targets = 0;
  const paths: string[] = [];
  const fetchImpl = vi.fn(async (url: unknown, init?: RequestInit) => {
    if (String(url).endsWith("/prepare")) return Response.json({ path: `recordings/manual-uploads/user/target-${++targets}/demo.mp3` });
    paths.push(JSON.parse(String(init?.body)).storagePath);
    if (paths.length === 1) throw new TypeError("Completion response lost");
    return Response.json({ id: "original-call", status: "uploaded", createdAt: "2026-09-09T00:00:00Z" });
  });
  const file = new File(["audio"], "demo.mp3", { type: "audio/mpeg" });
  const uploadResumable = vi.fn(async () => {});
  const dependencies = { fetchImpl: fetchImpl as typeof fetch, getAccessToken: async () => "token", uploadResumable };
  await expect(uploadCallFromBrowser({ file }, dependencies)).rejects.toThrow("Completion response lost");
  await expect(uploadCallFromBrowser({ file }, dependencies)).resolves.toMatchObject({ id: "original-call" });
  expect(targets).toBe(1);
  expect(uploadResumable).toHaveBeenCalledTimes(1);
  expect(new Set(paths).size).toBe(1);
});

it("renews an explicitly expired target while retaining the original workspace", async () => {
  const fetchImpl = vi.fn()
    .mockResolvedValueOnce(Response.json({ path: "old-path", orgId: "org-A" }))
    .mockResolvedValueOnce(Response.json({ code: "upload_target_expired", error: "Expired" }, { status: 400 }))
    .mockResolvedValueOnce(Response.json({ path: "new-path", orgId: "org-A" }))
    .mockResolvedValueOnce(Response.json({ id: "call", status: "uploaded", createdAt: "2026-09-09T00:00:00Z" }));
  const file = new File(["audio"], "demo.mp3", { type: "audio/mpeg" });
  const uploadResumable = vi.fn(async () => {});
  const dependencies = { fetchImpl: fetchImpl as typeof fetch, getAccessToken: async () => "token", uploadResumable };
  await expect(uploadCallFromBrowser({ file }, dependencies)).rejects.toThrow("Expired");
  await expect(uploadCallFromBrowser({ file }, dependencies)).resolves.toMatchObject({ id: "call" });
  expect(fetchImpl.mock.calls[2][0]).toBe("/api/calls/upload/prepare");
  expect(JSON.parse(String(fetchImpl.mock.calls[2][1]?.body))).toMatchObject({ orgId: "org-A" });
  expect(uploadResumable).toHaveBeenCalledTimes(2);
});

it("keeps the prepared target on workspace mismatch instead of preparing in the new account", async () => {
  const fetchImpl = vi.fn()
    .mockResolvedValueOnce(Response.json({ path: "original-path", orgId: "org-A" }))
    .mockResolvedValueOnce(Response.json({ code: "invalid_upload", error: "Wrong workspace" }, { status: 400 }))
    .mockResolvedValueOnce(Response.json({ id: "original-call", status: "uploaded", createdAt: "2026-09-09T00:00:00Z" }));
  const file = new File(["audio"], "demo.mp3", { type: "audio/mpeg" });
  const uploadResumable = vi.fn(async () => {});
  const dependencies = { fetchImpl: fetchImpl as typeof fetch, getAccessToken: async () => "token", uploadResumable };
  await expect(uploadCallFromBrowser({ file }, dependencies)).rejects.toThrow("Wrong workspace");
  await uploadCallFromBrowser({ file }, dependencies);
  expect(fetchImpl.mock.calls[2][0]).toBe("/api/calls/upload/complete");
  expect(JSON.parse(String(fetchImpl.mock.calls[2][1]?.body)).storagePath).toBe("original-path");
  expect(uploadResumable).toHaveBeenCalledTimes(1);
});
