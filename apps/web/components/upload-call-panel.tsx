"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
      const form = new FormData();
      form.append("recording", file);
      form.append("consentConfirmed", "true");
      if (callTopic.trim()) {
        form.append("callTopic", callTopic.trim());
      }

      const response = await fetch("/api/calls/upload", {
        method: "POST",
        body: form,
      });

      setProgress(100);

      const payload = (await response.json()) as { error?: string; id?: string };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error ?? "Upload failed");
      }

      router.push(`/calls/${payload.id}`);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
      setIsUploading(false);
      setProgress(0);
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <div className="space-y-5">
        <div
          className={`rounded-[1.5rem] border-2 border-dashed p-10 text-center transition ${
            isDragging
              ? "border-blue-500/60 bg-blue-600/10"
              : file
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-slate-700/70 bg-slate-950/30 hover:border-slate-600/70"
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
              <p className="text-lg font-semibold text-emerald-300">{file.name}</p>
              <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
              <button
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
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
              <p className="text-lg font-semibold text-slate-100">Drop a call recording here</p>
              <p className="text-sm text-slate-500">MP3, WAV, M4A, MP4, or WebM up to 500 MB</p>
            </div>
          )}
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Call Name
          </span>
          <input
            className="w-full rounded-[1.15rem] border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-base text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-4 focus:ring-blue-500/10"
            onChange={(event) => setCallTopic(event.target.value)}
            placeholder="Discovery call with ACME"
            type="text"
            value={callTopic}
          />
        </label>

        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-500">
              <span>{progress < 100 ? "Uploading" : "Scoring"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-900">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1.15rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <button
          className="w-full rounded-[1.2rem] bg-blue-600 px-5 py-4 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
