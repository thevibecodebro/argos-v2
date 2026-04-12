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
              <p className="text-sm text-[#a9abb3]">{formatBytes(file.size)}</p>
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
              <p className="text-lg font-semibold text-[#ecedf6]">Drop a call recording here</p>
              <p className="text-sm text-[#a9abb3]">MP3, WAV, M4A, MP4, or WebM up to 500 MB</p>
            </div>
          )}
        </div>

        <label className="block space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
            Call Name
          </span>
          <input
            className="w-full rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3 text-base text-[#ecedf6] outline-none transition placeholder:text-[#a9abb3] focus:border-[#74b1ff]/60 focus:ring-4 focus:ring-[#74b1ff]/10"
            onChange={(event) => setCallTopic(event.target.value)}
            placeholder="Discovery call with ACME"
            type="text"
            value={callTopic}
          />
        </label>

        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#a9abb3]">
              <span>{progress < 100 ? "Uploading" : "Scoring"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#22262f]">
              <div className="h-full rounded-full bg-[#74b1ff] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-5 py-4 text-base font-bold text-[#002345] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
