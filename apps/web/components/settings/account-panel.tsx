// apps/web/components/settings/account-panel.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrentUserDetails } from "@/lib/users/service";

function initials(firstName: string | null, lastName: string | null, fallback: string) {
  const v = [firstName, lastName].filter(Boolean).map((s) => s?.[0]?.toUpperCase()).join("");
  return v || fallback.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
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

  const displayName = useMemo(
    () => [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ").trim() || currentUser.email,
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
    const payload = (await response.json()) as CurrentUserDetails & { error?: string };
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

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-600/15 text-lg font-semibold text-blue-200">
            {initials(currentUser.firstName, currentUser.lastName, currentUser.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Your Profile</p>

            {isEditing ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">First Name</span>
                    <input
                      className="mt-2 w-full rounded-[1rem] border border-slate-700/70 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60"
                      onChange={(e) => setFirstName(e.target.value)}
                      value={firstName}
                    />
                  </label>
                  <label className="text-left">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Last Name</span>
                    <input
                      className="mt-2 w-full rounded-[1rem] border border-slate-700/70 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60"
                      onChange={(e) => setLastName(e.target.value)}
                      value={lastName}
                    />
                  </label>
                </div>
                <p className="text-sm text-slate-400">{currentUser.email}</p>
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                <div className="flex gap-3">
                  <button
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                    disabled={isSaving}
                    onClick={() => void saveProfile()}
                    type="button"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    className="rounded-xl border border-slate-700/70 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                    disabled={isSaving}
                    onClick={() => {
                      setFirstName(currentUser.firstName ?? "");
                      setLastName(currentUser.lastName ?? "");
                      setError(null);
                      setIsEditing(false);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-2xl font-semibold text-white">{displayName}</p>
                <p className="mt-2 text-sm text-slate-400">{currentUser.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span
                    className="rounded-full border border-blue-500/25 bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300"
                    title="Your role is set by an org admin"
                  >
                    {currentUser.role ?? "member"}
                  </span>
                  <button
                    className="rounded-xl border border-slate-700/70 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    Edit profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Organization card */}
      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Organization</p>
        <p className="mt-4 text-2xl font-semibold text-white">{currentUser.org?.name ?? "No organization"}</p>
        {currentUser.org ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Org ID</p>
                <p className="mt-1 font-mono text-sm font-medium text-slate-300">{currentUser.org.slug}</p>
                <p className="mt-1 text-xs text-slate-500">Used in API references and webhook configurations</p>
              </div>
              <button
                className="rounded-xl border border-slate-700/70 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-blue-500/40 hover:text-white"
                onClick={() => void copySlug()}
                type="button"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Plan</p>
                <p className="mt-2 text-sm font-medium capitalize text-slate-300">{currentUser.org.plan}</p>
              </div>
              <div className="rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Created</p>
                <p className="mt-2 text-sm font-medium text-slate-300">
                  {formatDate(currentUser.org.createdAt) ?? "Unknown"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Join or create an organization to unlock the workspace.</p>
        )}
      </section>
    </div>
  );
}
