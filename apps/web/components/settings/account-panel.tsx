// apps/web/components/settings/account-panel.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeButton, ForgeChip, ForgeSurface } from "@/components/forge";
import type { CurrentUserDetails } from "@/lib/users/service";

function initials(
  firstName: string | null,
  lastName: string | null,
  fallback: string,
) {
  const v = [firstName, lastName]
    .filter(Boolean)
    .map((s) => s?.[0]?.toUpperCase())
    .join("");
  return v || fallback.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

type AccountPanelProps = {
  initialUser: CurrentUserDetails;
};

export function AccountPanel({ initialUser }: AccountPanelProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(initialUser.firstName ?? "");
  const [lastName, setLastName] = useState(initialUser.lastName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoStatus, setLogoStatus] = useState<string | null>(null);
  const [isLogoSaving, setIsLogoSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const displayName = useMemo(
    () =>
      [currentUser.firstName, currentUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || currentUser.email,
    [currentUser],
  );

  async function saveProfile() {
    if (!firstName.trim() && !lastName.trim()) {
      setError("Please enter at least a first or last name.");
      return;
    }
    setError(null);
    setIsSaving(true);
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });
    const payload = (await response.json()) as CurrentUserDetails & {
      error?: string;
    };
    if (!response.ok) {
      setError(payload.error ?? "Profile couldn't be saved. Try again.");
      setIsSaving(false);
      return;
    }
    setCurrentUser(payload);
    setIsEditing(false);
    setIsSaving(false);
    router.refresh();
  }

  async function copySlug() {
    if (!currentUser.org?.slug) return;
    await navigator.clipboard.writeText(currentUser.org.slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function uploadLogo(file: File | null) {
    if (!file) return;

    setLogoError(null);
    setLogoStatus(null);
    setIsLogoSaving(true);

    const formData = new FormData();
    formData.set("logo", file);

    const response = await fetch("/api/organizations/logo", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as CurrentUserDetails & {
      error?: string;
    };

    if (!response.ok) {
      setLogoError(payload.error ?? "Logo couldn't be uploaded.");
      setIsLogoSaving(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setCurrentUser(payload);
    setLogoStatus("Logo updated");
    setIsLogoSaving(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
    router.refresh();
  }

  async function removeLogo() {
    setLogoError(null);
    setLogoStatus(null);
    setIsLogoSaving(true);

    const response = await fetch("/api/organizations/logo", {
      method: "DELETE",
    });
    const payload = (await response.json()) as CurrentUserDetails & {
      error?: string;
    };

    if (!response.ok) {
      setLogoError(payload.error ?? "Logo couldn't be removed.");
      setIsLogoSaving(false);
      return;
    }

    setCurrentUser(payload);
    setLogoStatus("Logo removed");
    setIsLogoSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <ForgeSurface as="section" className="p-6" variant="panel">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/8 text-lg font-semibold text-[var(--forge-gold)]">
            {initials(
              currentUser.firstName,
              currentUser.lastName,
              currentUser.email,
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
              Your Profile
            </p>

            {isEditing ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                      First Name
                    </span>
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--forge-gold)]/60"
                      onChange={(e) => setFirstName(e.target.value)}
                      value={firstName}
                    />
                  </label>
                  <label className="text-left">
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                      Last Name
                    </span>
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--forge-gold)]/60"
                      onChange={(e) => setLastName(e.target.value)}
                      value={lastName}
                    />
                  </label>
                </div>
                <p className="text-sm text-[var(--forge-muted)]">
                  {currentUser.email}
                </p>
                {error ? (
                  <p className="text-sm text-[var(--forge-danger)]">{error}</p>
                ) : null}
                <div className="flex gap-3">
                  <ForgeButton
                    disabled={isSaving}
                    onClick={() => void saveProfile()}
                    size="sm"
                    type="button"
                    variant="primary"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </ForgeButton>
                  <ForgeButton
                    disabled={isSaving}
                    onClick={() => {
                      setFirstName(currentUser.firstName ?? "");
                      setLastName(currentUser.lastName ?? "");
                      setError(null);
                      setIsEditing(false);
                    }}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Cancel
                  </ForgeButton>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-2xl font-semibold text-white">
                  {displayName}
                </p>
                <p className="mt-2 text-sm text-[var(--forge-muted)]">
                  {currentUser.email}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <ForgeChip tone="gold">
                    {currentUser.role ?? "member"}
                  </ForgeChip>
                  <ForgeButton
                    onClick={() => setIsEditing(true)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    Edit profile
                  </ForgeButton>
                </div>
              </div>
            )}
          </div>
        </div>
      </ForgeSurface>

      {/* Organization card */}
      <ForgeSurface as="section" className="p-6" variant="panel">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
          Organization
        </p>
        <p className="mt-4 text-2xl font-semibold text-white">
          {currentUser.org?.name ?? "No organization"}
        </p>
        {currentUser.org ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col gap-4 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-1)]">
                  {currentUser.org.logoUrl ? (
                    <img
                      alt={`${currentUser.org.name} logo`}
                      className="h-full w-full object-contain p-2"
                      src={currentUser.org.logoUrl}
                    />
                  ) : (
                    <span className="font-[var(--font-display)] text-lg font-bold text-[var(--forge-gold)]">
                      {currentUser.org.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                    Logo
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-[var(--forge-text)]">
                    {currentUser.org.logoUrl
                      ? "Custom workspace logo"
                      : "Argos default"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--forge-muted)]">
                    PNG, JPG, or WebP under 2 MB
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  accept="image/png,image/jpeg,image/webp"
                  aria-label="Upload organization logo"
                  className="sr-only"
                  onChange={(event) =>
                    void uploadLogo(event.currentTarget.files?.[0] ?? null)
                  }
                  ref={logoInputRef}
                  type="file"
                />
                <ForgeButton
                  disabled={isLogoSaving}
                  icon="upload_file"
                  onClick={() => logoInputRef.current?.click()}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {currentUser.org.logoUrl ? "Replace" : "Upload"}
                </ForgeButton>
                {currentUser.org.logoUrl ? (
                  <ForgeButton
                    disabled={isLogoSaving}
                    onClick={() => void removeLogo()}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Remove
                  </ForgeButton>
                ) : null}
              </div>
            </div>
            {logoError ? (
              <p className="text-sm text-[var(--forge-danger)]">{logoError}</p>
            ) : null}
            {logoStatus ? (
              <p className="text-sm text-[var(--forge-success)]">
                {logoStatus}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                  Org ID
                </p>
                <p className="mt-1 font-mono text-sm font-medium text-[var(--forge-text)]">
                  {currentUser.org.slug}
                </p>
                <p className="mt-1 text-xs text-[var(--forge-muted)]">
                  Used in API references and webhook configurations
                </p>
              </div>
              <ForgeButton
                onClick={() => void copySlug()}
                size="sm"
                type="button"
                variant="secondary"
              >
                {copied ? "Copied" : "Copy"}
              </ForgeButton>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                  Plan
                </p>
                <p className="mt-2 text-sm font-medium capitalize text-[var(--forge-text)]">
                  {currentUser.org.plan}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                  Created
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--forge-text)]">
                  {formatDate(currentUser.org.createdAt) ?? "Unknown"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--forge-muted)]">
            Join or create an organization to unlock the workspace.
          </p>
        )}
      </ForgeSurface>
    </div>
  );
}
