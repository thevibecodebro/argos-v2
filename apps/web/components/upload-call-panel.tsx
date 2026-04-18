"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadRequestError, uploadCallWithProgress, type UploadPhase } from "@/lib/calls/upload-client";
import {
  CALL_UPLOAD_ACCEPTED_TYPES,
  CALL_UPLOAD_MAX_BYTES,
  formatUploadLimit,
  normalizeUploadErrorPayload,
  validateUploadFile,
  type UploadErrorPayload,
} from "@/lib/calls/upload-contract";

type PanelPhase = "canceled" | "error" | "idle" | "processing" | "ready" | "uploading";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPrimaryActionLabel(phase: PanelPhase) {
  if (phase === "uploading") {
    return "Uploading...";
  }

  if (phase === "processing") {
    return "Analyzing call...";
  }

  if (phase === "error" || phase === "canceled") {
    return "Retry Upload";
  }

  return "Upload & Analyze";
}

function getStatusCopy(phase: PanelPhase, progress: number) {
  if (phase === "processing") {
    return {
      label: "Processing",
      detail: "Upload complete. Argos is scoring the call now.",
      progressLabel: "Upload complete",
      showPercent: false,
      value: 100,
    };
  }

  return {
    label: "Uploading",
    detail: "Keep this tab open while the recording transfers.",
    progressLabel: `${progress}% uploaded`,
    showPercent: true,
    value: progress,
  };
}

export function UploadCallPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const requestRef = useRef<ReturnType<typeof uploadCallWithProgress> | null>(null);
  const [callTopic, setCallTopic] = useState("");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [error, setError] = useState<UploadErrorPayload | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<PanelPhase>("idle");
  const [progress, setProgress] = useState(0);

  const isSubmitting = phase === "processing" || phase === "uploading";
  const statusCopy = getStatusCopy(phase, progress);

  function handleFile(nextFile: File) {
    const validationError = validateUploadFile(nextFile);

    if (validationError) {
      setError(validationError);
      setFile(null);
      setPhase("error");
      return;
    }

    setError(null);
    setFile(nextFile);
    setProgress(0);
    setPhase("ready");
  }

  function resetFile() {
    if (isSubmitting) {
      return;
    }

    setFile(null);
    setError(null);
    setProgress(0);
    setPhase("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function submit() {
    if (!file) {
      return;
    }

    const validationError = validateUploadFile(file);

    if (validationError) {
      setError(validationError);
      setPhase("error");
      return;
    }

    setError(null);
    setProgress(0);
    setPhase("uploading");

    const request = uploadCallWithProgress({
      callTopic,
      consentConfirmed,
      file,
      onPhaseChange(nextPhase: UploadPhase) {
        setPhase(nextPhase);
      },
      onUploadProgress(nextProgress) {
        setProgress(nextProgress);
      },
    });

    requestRef.current = request;

    try {
      const payload = await request.promise;
      setProgress(100);
      router.push(`/calls/${payload.id}`);
      router.refresh();
    } catch (uploadError) {
      const normalized =
        uploadError instanceof UploadRequestError
          ? normalizeUploadErrorPayload({
              action: uploadError.action,
              code: uploadError.code,
              details: uploadError.details,
              error: uploadError.message,
              retryable: uploadError.retryable,
            })
          : normalizeUploadErrorPayload({
              code: "invalid_upload",
              error: uploadError instanceof Error ? uploadError.message : "Upload failed.",
            });

      setError(normalized);
      setProgress(0);
      setPhase(normalized.code === "upload_canceled" ? "canceled" : "error");
    } finally {
      requestRef.current = null;
    }
  }

  function cancelUpload() {
    requestRef.current?.cancel();
  }

  return (
    <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <div className="space-y-5">
        <div
          className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
            isDragging
              ? "border-[#74b1ff]/60 bg-[#74b1ff]/8"
              : file
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-[#45484f]/20 bg-[#161a21]/50 hover:border-[#45484f]/40"
          }`}
          onClick={() => !isSubmitting && fileInputRef.current?.click()}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isSubmitting) {
              setIsDragging(true);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (isSubmitting) {
              return;
            }
            const nextFile = event.dataTransfer.files?.[0];
            if (nextFile) {
              handleFile(nextFile);
            }
          }}
          onKeyDown={(event) => {
            if (isSubmitting) {
              return;
            }

            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={isSubmitting ? -1 : 0}
        >
          <input
            accept={CALL_UPLOAD_ACCEPTED_TYPES.join(",")}
            className="sr-only"
            disabled={isSubmitting}
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              if (nextFile) {
                handleFile(nextFile);
              }
            }}
            ref={fileInputRef}
            type="file"
          />

          {file ? (
            <div className="space-y-3">
              <p className="text-lg font-semibold text-emerald-300">{file.name}</p>
              <p className="text-sm text-[#a9abb3]">{formatBytes(file.size)}</p>
              <button
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
                onClick={(event) => {
                  event.stopPropagation();
                  resetFile();
                }}
                type="button"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-lg font-semibold text-[#ecedf6]">Drop a call recording here</p>
              <p className="text-sm text-[#a9abb3]">
                MP3, WAV, M4A, MP4, or WebM up to {formatUploadLimit(CALL_UPLOAD_MAX_BYTES)}
              </p>
            </div>
          )}
        </div>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
            Call Name
          </span>
          <input
            className="w-full rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3 text-base text-[#ecedf6] outline-none transition placeholder:text-[#a9abb3] focus:border-[#74b1ff]/60 focus:ring-4 focus:ring-[#74b1ff]/10"
            disabled={isSubmitting}
            onChange={(event) => setCallTopic(event.target.value)}
            placeholder="Discovery call with ACME"
            type="text"
            value={callTopic}
          />
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3">
          <input
            checked={consentConfirmed}
            className="mt-1 h-4 w-4 rounded border-[#45484f]/40 bg-[#10131a] text-[#74b1ff] focus:ring-[#74b1ff]/40"
            disabled={isSubmitting}
            onChange={(event) => setConsentConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span className="text-sm text-[#c7c9d3]">
            I confirm the necessary recording consent was collected for this call.
          </span>
        </label>

        {isSubmitting ? (
          <div
            aria-live="polite"
            className="space-y-3 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4"
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#a9abb3]">
              <span>{statusCopy.label}</span>
              <span>{statusCopy.showPercent ? `${progress}%` : "Working"}</span>
            </div>
            <div
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={statusCopy.value}
              className="h-2 overflow-hidden rounded-full bg-[#22262f]"
              role="progressbar"
            >
              <div
                className={`h-full rounded-full bg-[#74b1ff] transition-all ${phase === "processing" ? "animate-pulse" : ""}`}
                style={{ width: `${statusCopy.value}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#ecedf6]">{statusCopy.progressLabel}</p>
                <p className="text-xs text-[#a9abb3]">{statusCopy.detail}</p>
              </div>
              {phase === "uploading" ? (
                <button
                  className="rounded-xl border border-[#45484f]/20 px-3 py-2 text-sm font-medium text-[#ecedf6] transition hover:bg-[#22262f]"
                  onClick={cancelUpload}
                  type="button"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <div
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            <p className="font-semibold">{error.error}</p>
            {error.action ? <p className="mt-1 text-red-100/90">{error.action}</p> : null}
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-5 py-4 text-base font-bold text-[#002345] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!file || !consentConfirmed || isSubmitting}
            onClick={() => {
              void submit();
            }}
            type="button"
          >
            {getPrimaryActionLabel(phase)}
          </button>
          {(phase === "error" || phase === "canceled") && file ? (
            <button
              className="rounded-xl border border-[#45484f]/20 px-5 py-4 text-sm font-medium text-[#ecedf6] transition hover:bg-[#161a21]/80"
              onClick={() => {
                void submit();
              }}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
