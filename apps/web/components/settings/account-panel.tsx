// apps/web/components/settings/account-panel.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ForgeButton, ForgeChip, ForgeSurface } from "@/components/forge";
import type { CurrentUserDetails } from "@/lib/users/service";
import { SettingsMetaRow, SettingsSectionHeader } from "./settings-readability";

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
  const canManageBilling = Boolean(currentUser.org) && currentUser.role === "admin";

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
      <ForgeSurface
        as="section"
        className="overflow-hidden p-0"
        variant="panel"
      >
        <SettingsSectionHeader
          description="Manage the profile information tied to your workspace access."
          eyebrow="Account"
          title="Your profile"
        />
        <div className="flex items-start gap-4 p-4 sm:p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/8 text-lg font-semibold text-[var(--forge-gold)]">
            {initials(
              currentUser.firstName,
              currentUser.lastName,
              currentUser.email,
            )}
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-left">
                    <span className="text-xs font-medium text-[var(--forge-muted)]">
                      First Name
                    </span>
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                      onChange={(e) => setFirstName(e.target.value)}
                      value={firstName}
                    />
                  </label>
                  <label className="text-left">
                    <span className="text-xs font-medium text-[var(--forge-muted)]">
                      Last Name
                    </span>
                    <input
                      className="mt-2 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
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
              <div>
                <p className="text-2xl font-semibold text-[var(--forge-text)]">
                  {displayName}
                </p>
                <div className="mt-3 max-w-xl">
                  <SettingsMetaRow label="Email" value={currentUser.email} />
                  <SettingsMetaRow
                    label="Role"
                    value={
                      <ForgeChip tone="gold">
                        {currentUser.role ?? "member"}
                      </ForgeChip>
                    }
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
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
      <ForgeSurface
        as="section"
        className="overflow-hidden p-0"
        variant="panel"
      >
        <SettingsSectionHeader
          description="Workspace identity, logo, and API-facing identifiers."
          eyebrow="Organization"
          title={currentUser.org?.name ?? "No organization"}
        />
        {currentUser.org ? (
          <div className="space-y-4 p-4 sm:p-6">
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
                  <p className="text-xs font-medium text-[var(--forge-muted)]">
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
            <div className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-2">
              <SettingsMetaRow
                label="Org ID"
                value={
                  <span className="font-mono">{currentUser.org.slug}</span>
                }
              />
              <SettingsMetaRow
                label="API usage"
                value="Webhook and API references"
              />
              <SettingsMetaRow
                label="Plan"
                value={
                  <span className="capitalize">{currentUser.org.plan}</span>
                }
              />
              <SettingsMetaRow
                label="Created"
                value={formatDate(currentUser.org.createdAt) ?? "Unknown"}
              />
              <div className="flex justify-end py-2">
                <ForgeButton
                  aria-label="Copy org ID"
                  onClick={() => void copySlug()}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {copied ? "Copied org ID" : "Copy org ID"}
                </ForgeButton>
              </div>
            </div>
          </div>
        ) : (
          <p className="p-4 text-sm text-[var(--forge-muted)] sm:p-6">
            Join or create an organization to unlock the workspace.
          </p>
        )}
      </ForgeSurface>

      {canManageBilling ? (
        <ForgeSurface
          as="section"
          className="overflow-hidden p-0"
          variant="panel"
        >
          <SettingsSectionHeader
            actions={
              <ForgeButton
                href="/billing/portal"
                icon="payments"
                size="sm"
                trailingIcon="open_in_new"
                variant="primary"
              >
                Manage billing and seats
              </ForgeButton>
            }
            description="Team subscriptions can adjust paid seat quantity from Stripe billing."
            eyebrow="Billing"
            title="Manage subscription"
          />
        </ForgeSurface>
      ) : null}
    </div>
  );
}
