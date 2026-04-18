import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadRequestError, uploadCallWithProgress } from "./calls/upload-client";
import { validateUploadFile } from "./calls/upload-contract";

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];

  upload: {
    onload: null | (() => void);
    onprogress: null | ((event: { lengthComputable: boolean; loaded: number; total: number }) => void);
  } = {
    onload: null,
    onprogress: null,
  };

  onabort: null | (() => void) = null;
  onerror: null | (() => void) = null;
  onload: null | (() => void) = null;
  status = 0;
  response: unknown = null;
  responseText = "";
  open = vi.fn();
  send = vi.fn();
  abort = vi.fn(() => {
    this.onabort?.();
  });

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }
}

describe("upload client", () => {
  const originalXHR = globalThis.XMLHttpRequest;

  beforeEach(() => {
    MockXMLHttpRequest.instances = [];
    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest as unknown as typeof XMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.XMLHttpRequest = originalXHR;
  });

  it("validates oversized files before creating a request", () => {
    const file = new File(["hello"], "call.mp3", { type: "audio/mpeg" });
    Object.defineProperty(file, "size", {
      configurable: true,
      value: 501 * 1024 * 1024,
    });

    expect(validateUploadFile(file)).toMatchObject({
      code: "file_too_large",
    });
  });

  it("reports real upload progress and resolves the upload response", async () => {
    const phases: string[] = [];
    const progressValues: number[] = [];
    const file = new File(["hello"], "call.mp3", { type: "audio/mpeg" });

    const request = uploadCallWithProgress({
      consentConfirmed: true,
      file,
      onPhaseChange(phase) {
        phases.push(phase);
      },
      onUploadProgress(value) {
        progressValues.push(value);
      },
    });

    const xhr = MockXMLHttpRequest.instances[0];
    if (!xhr) {
      throw new Error("Expected XHR instance");
    }

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
    xhr.upload.onload?.();
    xhr.status = 200;
    xhr.response = {
      id: "call-1",
      status: "complete",
      createdAt: "2026-04-17T00:00:00.000Z",
    };
    xhr.onload?.();

    await expect(request.promise).resolves.toMatchObject({
      id: "call-1",
      status: "complete",
    });
    expect(progressValues).toEqual([25, 100, 100]);
    expect(phases).toEqual(["uploading", "uploading", "processing"]);
  });

  it("supports canceling an in-flight upload", async () => {
    const file = new File(["hello"], "call.mp3", { type: "audio/mpeg" });
    const request = uploadCallWithProgress({
      consentConfirmed: true,
      file,
    });

    const xhr = MockXMLHttpRequest.instances[0];
    if (!xhr) {
      throw new Error("Expected XHR instance");
    }

    request.cancel();

    await expect(request.promise).rejects.toMatchObject({
      code: "upload_canceled",
    });
  });
});
