"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadCallFromBrowser } from "@/lib/calls/browser-upload";

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "audio/mp3",
];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setError(`Unsupported file type: ${nextFile.type}`);
      return;
    }

    if (nextFile.size > 500 * 1024 * 1024) {
      setError("File exceeds the 500 MB upload limit.");
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

      router.push(`/calls/${payload.id}`);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
      setIsUploading(false);
      setProgress(0);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <div className="space-y-5">
        <div
          className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
            isDragging
              ? "border-[var(--forge-gold)]/60 bg-[var(--forge-gold)]/8"
              : file
                ? "border-[rgba(139,215,168,0.36)] bg-[rgba(139,215,168,0.06)]"
                : "border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 hover:border-[var(--forge-border-strong)]/40"
          }`}
          onClick={() => !file && fileInputRef.current?.click()}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            const nextFile = event.dataTransfer.files?.[0];
            if (nextFile) {
              handleFile(nextFile);
            }
          }}
        >
          <input
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
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
              <p className="text-lg font-semibold text-[var(--forge-success)]">{file.name}</p>
              <p className="text-sm text-[var(--forge-muted)]">{formatBytes(file.size)}</p>
              <button
                className="rounded-xl border border-[rgba(255,113,108,0.22)] bg-[rgba(255,113,108,0.1)] px-4 py-2 text-sm font-medium text-[var(--forge-danger)] transition hover:bg-[rgba(255,113,108,0.15)]"
                onClick={(event) => {
                  event.stopPropagation();
                  setFile(null);
                }}
                type="button"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-lg font-semibold text-[var(--forge-text)]">Drop a call recording here</p>
              <p className="text-sm text-[var(--forge-muted)]">MP3, WAV, M4A, MP4, or WebM up to 500 MB</p>
            </div>
          )}
        </div>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
            Call Name
          </span>
          <input
            className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3 text-base text-[var(--forge-text)] outline-none transition placeholder:text-[var(--forge-muted)] focus:border-[var(--forge-gold)]/60 focus:ring-4 focus:ring-[var(--forge-gold)]/10"
            onChange={(event) => setCallTopic(event.target.value)}
            placeholder="Discovery call with ACME"
            type="text"
            value={callTopic}
          />
        </label>

        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[var(--forge-muted)]">
              <span>{progress < 100 ? "Uploading" : "Scoring"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--forge-surface-3)]">
              <div className="h-full rounded-full bg-[var(--forge-gold)] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-[rgba(255,113,108,0.22)] bg-[rgba(255,113,108,0.1)] px-4 py-3 text-sm text-[var(--forge-danger)]">
            {error}
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-5 py-4 text-base font-bold text-[#170d07] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!file || isUploading}
          onClick={() => {
            void submit();
          }}
          type="button"
        >
          {isUploading ? "Analyzing call..." : "Upload & Analyze"}
        </button>
      </div>
    </section>
  );
}
