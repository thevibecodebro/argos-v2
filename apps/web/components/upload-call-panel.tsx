"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ForgeButton,
  ForgeChip,
  ForgeErrorState,
  ForgeIcon,
  ForgeStatusPanel,
  ForgeSurface,
  type ForgeTone,
} from "@/components/forge";
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
export const MAX_BULK_UPLOAD_FILES = 20;

type UploadQueueStatus = "queued" | "uploading" | "analyzing" | "uploaded" | "failed";

type UploadQueueItem = {
  callId?: string;
  error?: string;
  file: File;
  id: string;
  progress: number;
  status: UploadQueueStatus;
};

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

export function getUploadCompletionHref(callIds: string[]) {
  return callIds.length === 1 ? getUploadedCallHref(callIds[0]) : "/calls";
}

export function getSelectedFilesLabel(fileCount: number) {
  if (fileCount === 0) {
    return "No recordings selected";
  }

  return `${fileCount} ${fileCount === 1 ? "recording" : "recordings"} selected`;
}

export function getUploadActionLabel({
  failedCount = 0,
  fileCount,
  isUploading,
  uploadedCount,
}: {
  failedCount?: number;
  fileCount: number;
  isUploading: boolean;
  uploadedCount: number;
}) {
  if (isUploading) {
    const activePosition = Math.min(uploadedCount + 1, fileCount);
    return `Uploading ${activePosition} of ${fileCount}`;
  }

  if (fileCount === 0) {
    return "Upload calls";
  }

  if (uploadedCount === fileCount) {
    return "View call library";
  }

  if (failedCount > 0) {
    return failedCount === 1 ? "Retry failed call" : `Retry ${failedCount} failed calls`;
  }

  return fileCount === 1 ? "Upload call" : `Upload ${fileCount} calls`;
}

export function formatCallTopicForUpload({
  callTopic,
  fileCount,
  fileName,
}: {
  callTopic: string;
  fileCount: number;
  fileName: string;
}) {
  const trimmedTopic = callTopic.trim();

  if (fileCount > 1) {
    return trimmedTopic ? `${trimmedTopic} - ${fileName}` : fileName;
  }

  return trimmedTopic;
}

export function getUploadStatusCopy({
  error,
  failedCount,
  fileCount,
  isUploading,
  progress,
  uploadedCount,
}: {
  error: string | null;
  failedCount: number;
  fileCount: number;
  isUploading: boolean;
  progress: number;
  uploadedCount: number;
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
    const activePosition = Math.min(uploadedCount + 1, fileCount);

    return {
      description: getUploadProgressLabel(progress),
      icon: progress < 100 ? "upload" : "query_stats",
      title: progress < 100 ? `Uploading ${activePosition} of ${fileCount}` : `Analyzing ${activePosition} of ${fileCount}`,
      tone: "gold" as const,
    };
  }

  if (failedCount > 0) {
    return {
      description: `${failedCount} ${failedCount === 1 ? "recording needs" : "recordings need"} attention. Retry failed uploads or remove them from the queue.`,
      icon: "warning",
      title: `${uploadedCount} of ${fileCount} uploaded`,
      tone: "danger" as const,
    };
  }

  if (fileCount > 0) {
    if (uploadedCount === fileCount) {
      return {
        description: "All selected recordings were uploaded and queued for analysis.",
        icon: "check_circle",
        title: "Uploads queued",
        tone: "success" as const,
      };
    }

    return {
      description: `Ready to upload and analyze ${fileCount === 1 ? "this recording" : "these recordings"}.`,
      icon: "check_circle",
      title: `${fileCount} ${fileCount === 1 ? "recording" : "recordings"} ready`,
      tone: "success" as const,
    };
  }

  return {
    description: "Choose one or more recordings before analysis can start.",
    icon: "info",
    title: "Recordings required",
    tone: "muted" as const,
  };
}

export function canSelectUploadFile({
  fileCount,
  isUploading,
}: {
  fileCount: number;
  isUploading: boolean;
}) {
  return fileCount < MAX_BULK_UPLOAD_FILES && !isUploading;
}

export function UploadCallPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [callTopic, setCallTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);

  function handleFiles(nextFiles: File[]) {
    if (!nextFiles.length || isUploading) {
      return;
    }

    const availableSlots = Math.max(MAX_BULK_UPLOAD_FILES - queue.length, 0);

    if (availableSlots === 0) {
      setError(`Only ${MAX_BULK_UPLOAD_FILES} recordings can be queued at once.`);
      return;
    }

    const acceptedItems: UploadQueueItem[] = [];
    const rejectedMessages: string[] = [];
    const filesToReview = nextFiles.slice(0, availableSlots);

    filesToReview.forEach((nextFile, index) => {
      const validationError = validateUploadFile({
        name: nextFile.name,
        size: nextFile.size,
        type: nextFile.type,
      });

      if (validationError) {
        rejectedMessages.push(
          `${nextFile.name}: ${validationError.action ? `${validationError.error} ${validationError.action}` : validationError.error}`,
        );
        return;
      }

      acceptedItems.push({
        file: nextFile,
        id: `${nextFile.name}-${nextFile.size}-${nextFile.lastModified}-${queue.length + index}`,
        progress: 0,
        status: "queued",
      });
    });

    if (nextFiles.length > availableSlots) {
      rejectedMessages.push(`Only ${MAX_BULK_UPLOAD_FILES} recordings can be queued at once.`);
    }

    if (acceptedItems.length > 0) {
      setQueue((currentQueue) => [...currentQueue, ...acceptedItems]);
    }

    setError(rejectedMessages.length > 0 ? rejectedMessages.join(" ") : null);
  }

  async function submit() {
    const uploadableItems = queue.filter((item) => item.status === "queued" || item.status === "failed");
    const alreadyUploadedCallIds = queue
      .filter((item) => item.status === "uploaded" && item.callId)
      .map((item) => item.callId as string);

    if (!uploadableItems.length) {
      if (alreadyUploadedCallIds.length > 0) {
        router.push(getUploadCompletionHref(alreadyUploadedCallIds));
        router.refresh();
      }
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    const successfulCallIds: string[] = [];
    let failedUploads = 0;

    for (const item of uploadableItems) {
      setProgress(15);
      setQueue((currentQueue) =>
        currentQueue.map((queueItem) =>
          queueItem.id === item.id
            ? { ...queueItem, error: undefined, progress: 15, status: "uploading" }
            : queueItem,
        ),
      );

      try {
        const payload = await uploadCallFromBrowser(
          {
            callTopic: formatCallTopicForUpload({
              callTopic,
              fileCount: queue.length,
              fileName: item.file.name,
            }),
            file: item.file,
          },
          {
            onProgress: (nextProgress) => {
              setProgress(nextProgress);
              setQueue((currentQueue) =>
                currentQueue.map((queueItem) =>
                  queueItem.id === item.id
                    ? {
                        ...queueItem,
                        progress: nextProgress,
                        status: nextProgress >= 100 ? "analyzing" : "uploading",
                      }
                    : queueItem,
                ),
              );
            },
          },
        );

        successfulCallIds.push(payload.id);
        setQueue((currentQueue) =>
          currentQueue.map((queueItem) =>
            queueItem.id === item.id
              ? {
                  ...queueItem,
                  callId: payload.id,
                  error: undefined,
                  progress: 100,
                  status: "uploaded",
                }
              : queueItem,
          ),
        );
      } catch (uploadError) {
        failedUploads += 1;
        setQueue((currentQueue) =>
          currentQueue.map((queueItem) =>
            queueItem.id === item.id
              ? {
                  ...queueItem,
                  error: uploadError instanceof Error ? uploadError.message : "Upload failed",
                  progress: 0,
                  status: "failed",
                }
              : queueItem,
          ),
        );
      }
    }

    setIsUploading(false);
    setProgress(0);

    if (failedUploads === 0) {
      const completedCallIds = [...alreadyUploadedCallIds, ...successfulCallIds];

      if (completedCallIds.length > 0) {
        router.push(getUploadCompletionHref(completedCallIds));
        router.refresh();
      }
    }
  }

  const uploadedCount = queue.filter((item) => item.status === "uploaded").length;
  const failedCount = queue.filter((item) => item.status === "failed").length;
  const totalBytes = queue.reduce((sum, item) => sum + item.file.size, 0);
  const disabledReason = queue.length === 0
    ? "Choose one or more recordings before analysis can start."
    : failedCount > 0
      ? "Retry failed uploads or remove them from the queue."
      : "Ready to upload and analyze selected recordings.";
  const progressLabel = getUploadProgressLabel(progress);
  const uploadStatusCopy = getUploadStatusCopy({
    error,
    failedCount,
    fileCount: queue.length,
    isUploading,
    progress,
    uploadedCount,
  });
  const canSelectFile = canSelectUploadFile({ fileCount: queue.length, isUploading });
  const uploadActionLabel = getUploadActionLabel({
    failedCount,
    fileCount: queue.length,
    isUploading,
    uploadedCount,
  });

  function openFilePicker() {
    if (canSelectFile) {
      fileInputRef.current?.click();
    }
  }

  function removeQueueItem(itemId: string) {
    if (!isUploading) {
      setQueue((currentQueue) => currentQueue.filter((item) => item.id !== itemId));
      setError(null);
    }
  }

  function clearQueue() {
    if (!isUploading) {
      setQueue([]);
      setError(null);
      setProgress(0);
    }
  }

  return (
    <ForgeSurface className="p-5 sm:p-6" data-upload-step-flow="forge">
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              label: "Choose recordings",
              detail: queue.length ? getSelectedFilesLabel(queue.length) : `Select or drop up to ${MAX_BULK_UPLOAD_FILES} recordings.`,
              active: queue.length > 0,
            },
            {
              label: "Add call context",
              detail: callTopic.trim() ? `Prefix: ${callTopic.trim()}` : "Optional prefix. File names stay unique in bulk uploads.",
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
                      ? "border-[color-mix(in_srgb,var(--forge-gold)_38%,transparent)] bg-[color-mix(in_srgb,var(--forge-gold)_12%,transparent)] text-[var(--forge-gold)]"
                      : "border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] text-[var(--forge-muted)]"
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
          aria-label="Call recording files"
          className="sr-only"
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? []);
            if (canSelectFile) {
              handleFiles(nextFiles);
            }
            event.target.value = "";
          }}
          multiple
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />

        <div
          aria-label={canSelectFile ? "Choose call recordings to upload" : undefined}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--forge-gold)]/20 ${
            isDragging
              ? "border-[var(--forge-gold)]/60 bg-[var(--forge-gold)]/8"
              : queue.length
                ? "border-[color-mix(in_srgb,var(--forge-success)_36%,transparent)] bg-[color-mix(in_srgb,var(--forge-success)_6%,transparent)]"
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
            handleFiles(Array.from(event.dataTransfer.files ?? []));
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
          {queue.length ? (
            <div className="space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--forge-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--forge-success)_8%,transparent)] text-[var(--forge-success)]">
                <ForgeIcon name="check_circle" size={22} />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--forge-success)]">
                  {getSelectedFilesLabel(queue.length)}
                </p>
                <p className="mt-1 text-sm text-[var(--forge-muted)]">
                  {formatBytes(totalBytes)} total. Upload up to {MAX_BULK_UPLOAD_FILES} recordings in one batch.
                </p>
              </div>

              <div className="grid gap-2 text-left" data-upload-queue="true">
                {queue.map((item) => {
                  const status = getQueueItemStatusMeta(item.status);

                  return (
                    <div
                      className="rounded-lg border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-shadow)_36%,transparent)] p-3"
                      data-upload-queue-item={item.status}
                      key={item.id}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--forge-text)]">
                            {item.file.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--forge-muted)]">
                            {formatBytes(item.file.size)}
                          </p>
                          {item.error ? (
                            <p className="mt-2 text-xs leading-5 text-[var(--forge-danger)]">
                              {item.error}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <ForgeChip icon={status.icon} tone={status.tone}>
                            {status.label}
                          </ForgeChip>
                          {item.status === "uploaded" && item.callId ? (
                            <a
                              aria-label={`Open ${item.file.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--forge-border)] text-[var(--forge-muted)] transition hover:border-[color-mix(in_srgb,var(--forge-gold)_32%,transparent)] hover:text-[var(--forge-gold)]"
                              href={getUploadedCallHref(item.callId)}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <ForgeIcon name="open_in_new" size={16} />
                            </a>
                          ) : null}
                          <button
                            aria-label={`Remove ${item.file.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--forge-border)] text-[var(--forge-muted)] transition hover:border-[rgba(255,120,92,0.36)] hover:text-[var(--forge-danger)] disabled:cursor-not-allowed disabled:opacity-40"
                            disabled={isUploading}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeQueueItem(item.id);
                            }}
                            type="button"
                          >
                            <ForgeIcon name="close" size={16} />
                          </button>
                        </div>
                      </div>
                      {item.status === "uploading" || item.status === "analyzing" ? (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--forge-surface-3)]">
                          <div
                            className="h-full rounded-full bg-[var(--forge-gold)] transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <ForgeButton
                disabled={isUploading}
                onClick={(event) => {
                  event.stopPropagation();
                  clearQueue();
                }}
                size="sm"
                type="button"
                variant="danger"
              >
                Clear queue
              </ForgeButton>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_4%,transparent)] text-[var(--forge-gold)]">
                <ForgeIcon name="upload_file" size={24} />
              </div>
              <p className="text-lg font-semibold text-[var(--forge-text)]">Drop call recordings here</p>
              <p className="text-sm text-[var(--forge-muted)]">
                MP3, WAV, M4A, MP4, or WebM up to {formatUploadLimit(CALL_UPLOAD_MAX_BYTES)} each
              </p>
              <p className="text-xs font-medium text-[var(--forge-muted)]">
                Upload up to {MAX_BULK_UPLOAD_FILES} recordings in one batch.
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
            placeholder="Discovery"
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
                  <span>{progress < 100 ? "Current file progress" : "Analysis starting"}</span>
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
            <ForgeChip icon="shield" tone="muted">{formatUploadLimit(CALL_UPLOAD_MAX_BYTES)} each</ForgeChip>
            <ForgeChip icon="queue" tone="muted">{MAX_BULK_UPLOAD_FILES} files per batch</ForgeChip>
            <ForgeChip icon="graphic_eq" tone="muted">Audio or video</ForgeChip>
          </div>
          <ForgeButton
            disabled={queue.length === 0 || isUploading}
            icon={isUploading ? "query_stats" : uploadedCount === queue.length && queue.length > 0 ? "library_books" : failedCount > 0 ? "refresh" : "upload"}
            onClick={() => {
              void submit();
            }}
            type="button"
            variant="primary"
          >
            {uploadActionLabel}
          </ForgeButton>
        </div>
      </div>
    </ForgeSurface>
  );
}

function getQueueItemStatusMeta(status: UploadQueueStatus): {
  icon: string;
  label: string;
  tone: ForgeTone;
} {
  switch (status) {
    case "uploading":
      return { icon: "upload", label: "Uploading", tone: "gold" };
    case "analyzing":
      return { icon: "query_stats", label: "Analyzing", tone: "gold" };
    case "uploaded":
      return { icon: "check_circle", label: "Uploaded", tone: "success" };
    case "failed":
      return { icon: "warning", label: "Failed", tone: "danger" };
    case "queued":
    default:
      return { icon: "schedule", label: "Queued", tone: "muted" };
  }
}
