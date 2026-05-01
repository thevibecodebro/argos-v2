"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeButton, ForgeChip, ForgeErrorState, ForgeIcon, ForgeStatusPanel, ForgeSurface } from "@/components/forge";
import { uploadCallFromBrowser } from "@/lib/calls/browser-upload";
import {
  CALL_UPLOAD_ACCEPTED_EXTENSIONS,
  CALL_UPLOAD_ACCEPTED_TYPES,
  CALL_UPLOAD_MAX_BYTES,
  formatUploadLimit,
  validateUploadFile,
} from "@/lib/calls/upload-contract";

export const ACCEPTED_TYPES = [
  ...CALL_UPLOAD_ACCEPTED_TYPES,
  ...CALL_UPLOAD_ACCEPTED_EXTENSIONS,
];

export const MAX_UPLOAD_BYTES = CALL_UPLOAD_MAX_BYTES;

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getUploadProgressLabel(progress: number) {
  return progress < 100
    ? "Uploading the recording. Keep this page open while the file transfers."
    : "Upload complete. Argos is analyzing the call and preparing the scorecard.";
}

export function getUploadedCallHref(callId: string) {
  return `/calls/${callId}`;
}

export function getUploadStatusCopy({
  error,
  hasFile,
  isUploading,
  progress,
}: {
  error: string | null;
  hasFile: boolean;
  isUploading: boolean;
  progress: number;
}) {
  if (error) {
    return {
      description: error,
      icon: "warning",
      title: "Upload failed",
      tone: "danger" as const,
    };
  }

  if (isUploading) {
    return {
      description: getUploadProgressLabel(progress),
      icon: progress < 100 ? "upload" : "query_stats",
      title: progress < 100 ? "Uploading recording" : "Analyzing call",
      tone: "gold" as const,
    };
  }

  if (hasFile) {
    return {
      description: "Ready to upload and analyze this call.",
      icon: "check_circle",
      title: "Ready for analysis",
      tone: "success" as const,
    };
  }

  return {
    description: "Choose a recording before analysis can start.",
    icon: "info",
    title: "Recording required",
    tone: "muted" as const,
  };
}

export function canSelectUploadFile({
  hasFile,
  isUploading,
}: {
  hasFile: boolean;
  isUploading: boolean;
}) {
  return !hasFile && !isUploading;
}

export function UploadCallPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [callTopic, setCallTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function handleFile(nextFile: File) {
    const validationError = validateUploadFile({
      name: nextFile.name,
      size: nextFile.size,
      type: nextFile.type,
    });
    if (validationError) {
      setError(validationError.action ? `${validationError.error} ${validationError.action}` : validationError.error);
      return;
    }

    setError(null);
    setFile(nextFile);
  }

  async function submit() {
    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(15);

    try {
      const payload = await uploadCallFromBrowser(
        {
          callTopic,
          file,
        },
        {
          onProgress: setProgress,
        },
      );

      router.push(getUploadedCallHref(payload.id));
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
      setIsUploading(false);
      setProgress(0);
    }
  }

  const disabledReason = !file
    ? "Choose a recording before analysis can start."
    : "Ready to upload and analyze this call.";
  const progressLabel = getUploadProgressLabel(progress);
  const uploadStatusCopy = getUploadStatusCopy({
    error,
    hasFile: Boolean(file),
    isUploading,
    progress,
  });
  const canSelectFile = canSelectUploadFile({ hasFile: Boolean(file), isUploading });

  function openFilePicker() {
    if (canSelectFile) {
      fileInputRef.current?.click();
    }
  }

  return (
    <ForgeSurface className="p-5 sm:p-6" data-upload-step-flow="forge">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              label: "Choose recording",
              detail: file ? file.name : "Select or drop the audio/video file.",
              active: Boolean(file),
            },
            {
              label: "Add call context",
              detail: callTopic.trim() ? callTopic.trim() : "Name the call so it is easy to find later.",
              active: Boolean(callTopic.trim()),
            },
            {
              label: "Upload and analyze",
              detail: isUploading ? progressLabel : disabledReason,
              active: isUploading,
            },
          ].map((step, index) => (
            <ForgeSurface className="p-4" key={step.label} variant="inset">
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    step.active
                      ? "border-[rgba(241,191,123,0.38)] bg-[rgba(241,191,123,0.12)] text-[var(--forge-gold)]"
                      : "border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-[var(--forge-muted)]"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-[var(--font-display)] text-sm font-semibold text-[var(--forge-text)]">
                    {step.label}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--forge-muted)]">
                    {step.detail}
                  </p>
                </div>
              </div>
            </ForgeSurface>
          ))}
        </div>

        <input
          accept={ACCEPTED_TYPES.join(",")}
          aria-label="Call recording file"
          className="sr-only"
          onChange={(event) => {
            const nextFile = event.target.files?.[0];
            if (canSelectFile && nextFile) {
              handleFile(nextFile);
            }
          }}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />

        <div
          aria-label={canSelectFile ? "Choose a call recording to upload" : undefined}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--forge-gold)]/20 ${
            isDragging
              ? "border-[var(--forge-gold)]/60 bg-[var(--forge-gold)]/8"
              : file
                ? "border-[rgba(139,215,168,0.36)] bg-[rgba(139,215,168,0.06)]"
                : "border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 hover:border-[var(--forge-border-strong)]/40"
          }`}
          data-upload-dropzone={canSelectFile ? "keyboard-accessible" : undefined}
          onClick={canSelectFile ? openFilePicker : undefined}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            if (!canSelectFile) {
              setIsDragging(false);
              return;
            }
            setIsDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (!canSelectFile) {
              return;
            }
            const nextFile = event.dataTransfer.files?.[0];
            if (nextFile) {
              handleFile(nextFile);
            }
          }}
          onKeyDown={
            canSelectFile
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openFilePicker();
                  }
                }
              : undefined
          }
          role={canSelectFile ? "button" : undefined}
          tabIndex={canSelectFile ? 0 : undefined}
        >
          {file ? (
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(139,215,168,0.3)] bg-[rgba(139,215,168,0.08)] text-[var(--forge-success)]">
                <ForgeIcon name="check_circle" size={22} />
              </div>
              <p className="text-lg font-semibold text-[var(--forge-success)]">{file.name}</p>
              <p className="text-sm text-[var(--forge-muted)]">{formatBytes(file.size)}</p>
              <ForgeButton
                disabled={isUploading}
                onClick={(event) => {
                  event.stopPropagation();
                  setFile(null);
                }}
                size="sm"
                type="button"
                variant="danger"
              >
                Remove file
              </ForgeButton>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--forge-border)] bg-[rgba(255,244,230,0.04)] text-[var(--forge-gold)]">
                <ForgeIcon name="upload_file" size={24} />
              </div>
              <p className="text-lg font-semibold text-[var(--forge-text)]">Drop a call recording here</p>
              <p className="text-sm text-[var(--forge-muted)]">
                MP3, WAV, M4A, MP4, or WebM up to {formatUploadLimit(CALL_UPLOAD_MAX_BYTES)}
              </p>
            </div>
          )}
        </div>

        <label className="block space-y-2">
          <span className="font-[var(--font-display)] text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
            Call Context
          </span>
          <input
            className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3 text-base text-[var(--forge-text)] outline-none transition placeholder:text-[var(--forge-muted)] focus:border-[var(--forge-gold)]/60 focus:ring-4 focus:ring-[var(--forge-gold)]/10"
            disabled={isUploading}
            onChange={(event) => setCallTopic(event.target.value)}
            placeholder="Discovery call with ACME"
            type="text"
            value={callTopic}
          />
        </label>

        {error ? (
          <ForgeErrorState description={uploadStatusCopy.description} title={uploadStatusCopy.title} />
        ) : (
          <ForgeStatusPanel
            announce={isUploading ? "polite" : "off"}
            description={uploadStatusCopy.description}
            icon={uploadStatusCopy.icon}
            title={uploadStatusCopy.title}
            tone={uploadStatusCopy.tone}
          >
            {isUploading ? (
              <div className="space-y-2" data-upload-state={progress < 100 ? "uploading" : "analyzing"}>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                  <span>{progress < 100 ? "Upload progress" : "Analysis starting"}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--forge-surface-3)]">
                  <div className="h-full rounded-full bg-[var(--forge-gold)] transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}
          </ForgeStatusPanel>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <ForgeChip icon="shield" tone="muted">{formatUploadLimit(CALL_UPLOAD_MAX_BYTES)} limit</ForgeChip>
            <ForgeChip icon="graphic_eq" tone="muted">Audio or video</ForgeChip>
          </div>
          <ForgeButton
            disabled={!file || isUploading}
            icon={isUploading ? "query_stats" : "upload"}
            onClick={() => {
              void submit();
            }}
            type="button"
            variant="primary"
          >
            {isUploading ? "Analyzing call..." : "Upload and analyze"}
          </ForgeButton>
        </div>
      </div>
    </ForgeSurface>
  );
}
