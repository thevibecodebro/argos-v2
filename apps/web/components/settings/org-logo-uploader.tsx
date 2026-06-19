"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type OrgLogoUploaderProps = {
  initialLogoUrl: string | null;
  organizationName: string;
};

type LogoResponse = {
  org?: { logoUrl?: string | null } | null;
  error?: string;
};

const ACCEPTED = "image/png,image/jpeg,image/webp";

export function OrgLogoUploader({
  initialLogoUrl,
  organizationName,
}: OrgLogoUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function uploadLogo(file: File | null) {
    if (!file) return;

    setError(null);
    setStatus(null);
    setIsSaving(true);

    const formData = new FormData();
    formData.set("logo", file);

    const response = await fetch("/api/organizations/logo", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as LogoResponse;

    if (inputRef.current) inputRef.current.value = "";

    if (!response.ok) {
      setError(payload.error ?? "Logo couldn't be uploaded.");
      setIsSaving(false);
      return;
    }

    setLogoUrl(payload.org?.logoUrl ?? null);
    setStatus("Logo updated");
    setIsSaving(false);
    router.refresh();
  }

  async function removeLogo() {
    setError(null);
    setStatus(null);
    setIsSaving(true);

    const response = await fetch("/api/organizations/logo", {
      method: "DELETE",
    });
    const payload = (await response.json()) as LogoResponse;

    if (!response.ok) {
      setError(payload.error ?? "Logo couldn't be removed.");
      setIsSaving(false);
      return;
    }

    setLogoUrl(null);
    setStatus("Logo removed");
    setIsSaving(false);
    router.refresh();
  }

  return (
    <section
      className="rounded-lg border border-[var(--forge-border)] bg-[var(--forge-panel-muted-bg)] p-3"
      data-branding-logo="true"
    >
      <h2 className="text-sm font-semibold text-[var(--forge-text)]">
        Workspace logo
      </h2>
      <p className="mt-1 text-xs leading-5 text-[var(--forge-muted)]">
        Shown in the navigation rail and on sign-in. PNG, JPG, or WebP up to
        2&nbsp;MB.
      </p>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-14 w-32 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-[var(--forge-border-strong)] bg-[var(--forge-panel-bg)]">
          {logoUrl ? (
            <img
              alt={`${organizationName} logo`}
              className="max-h-12 max-w-28 object-contain"
              data-branding-logo-image="true"
              decoding="async"
              src={logoUrl}
            />
          ) : (
            <span className="px-2 text-center text-[0.7rem] text-[var(--forge-muted)]">
              No logo yet
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            accept={ACCEPTED}
            className="sr-only"
            data-branding-logo-input="true"
            onChange={(event) => uploadLogo(event.target.files?.[0] ?? null)}
            ref={inputRef}
            type="file"
          />
          <button
            className="forge-button forge-button-secondary forge-focus-ring min-h-9 rounded-lg px-3 py-2 text-xs"
            data-branding-logo-upload="true"
            disabled={isSaving}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            {logoUrl ? "Replace logo" : "Upload logo"}
          </button>
          {logoUrl ? (
            <button
              className="forge-button forge-button-ghost forge-focus-ring min-h-9 rounded-lg px-3 py-2 text-xs"
              data-branding-logo-remove="true"
              disabled={isSaving}
              onClick={removeLogo}
              type="button"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p
          className="mt-2 text-xs text-[var(--forge-danger)]"
          data-branding-logo-error="true"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {status ? (
        <p
          className="mt-2 text-xs text-[var(--forge-success)]"
          data-branding-logo-status="true"
        >
          {status}
        </p>
      ) : null}
    </section>
  );
}
