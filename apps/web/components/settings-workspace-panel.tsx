"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ComplianceStatus } from "@/lib/compliance/service";
import type { IntegrationStatusData } from "@/lib/integrations/service";
import { IntegrationsSettingsPanel } from "./integrations-settings-panel";
import type { CurrentUserDetails, OrganizationMember } from "@/lib/users/service";

type SettingsWorkspacePanelProps = {
  initialCompliance: ComplianceStatus & { canManage: boolean };
  initialIntegrations: IntegrationStatusData | null;
  initialMembers: OrganizationMember[];
  initialUser: CurrentUserDetails;
  notices?: string[];
};

function initials(firstName: string | null, lastName: string | null, fallback: string) {
  const initialsValue = [firstName, lastName]
    .filter(Boolean)
    .map((value) => value?.[0]?.toUpperCase())
    .join("");

  return initialsValue || fallback.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function SettingsWorkspacePanel({
  initialCompliance,
  initialIntegrations,
  initialMembers,
  initialUser,
  notices = [],
}: SettingsWorkspacePanelProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [members, setMembers] = useState(initialMembers);
  const [compliance, setCompliance] = useState(initialCompliance);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState(initialUser.firstName ?? "");
  const [lastName, setLastName] = useState(initialUser.lastName ?? "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [mutatingMemberId, setMutatingMemberId] = useState<string | null>(null);
  const [isUpdatingCompliance, setIsUpdatingCompliance] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayName = useMemo(() => {
    return [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ").trim() || currentUser.email;
  }, [currentUser.email, currentUser.firstName, currentUser.lastName]);

  const canManageMembers = currentUser.role === "admin";

  async function saveProfile() {
    setProfileError(null);
    setIsSavingProfile(true);

    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
      }),
    });

    const payload = (await response.json()) as CurrentUserDetails & { error?: string };

    if (!response.ok) {
      setProfileError(payload.error ?? "Unable to save profile");
      setIsSavingProfile(false);
      return;
    }

    setCurrentUser(payload);
    setIsEditingProfile(false);
    setIsSavingProfile(false);
    router.refresh();
  }

  async function updateMemberRole(memberId: string, role: string) {
    setTeamError(null);
    setMutatingMemberId(memberId);

    const response = await fetch(`/api/organizations/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    const payload = (await response.json()) as { id?: string; role?: OrganizationMember["role"]; error?: string };

    if (!response.ok) {
      setTeamError(payload.error ?? "Unable to update member role");
      setMutatingMemberId(null);
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.id === memberId ? { ...member, role: payload.role ?? member.role } : member,
      ),
    );
    setMutatingMemberId(null);
    router.refresh();
  }

  async function removeMember(memberId: string) {
    setTeamError(null);
    setMutatingMemberId(memberId);

    const response = await fetch(`/api/organizations/members/${memberId}`, {
      method: "DELETE",
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setTeamError(payload.error ?? "Unable to remove member");
      setMutatingMemberId(null);
      return;
    }

    setMembers((current) => current.filter((member) => member.id !== memberId));
    setMutatingMemberId(null);
    router.refresh();
  }

  async function copySlug() {
    if (!currentUser.org?.slug) {
      return;
    }

    await navigator.clipboard.writeText(currentUser.org.slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function acknowledgeConsent() {
    setComplianceError(null);
    setIsUpdatingCompliance(true);

    const response = await fetch("/api/compliance/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "recording_consent_acknowledged",
        tosVersion: "2026-04-03-replit-parity",
        metadata: { source: "settings" },
      }),
    });

    const payload = (await response.json()) as { consentedAt?: string; error?: string };

    if (!response.ok) {
      setComplianceError(payload.error ?? "Unable to update compliance status");
      setIsUpdatingCompliance(false);
      return;
    }

    setCompliance((current) => ({
      ...current,
      hasConsented: true,
      consentedAt: payload.consentedAt ?? current.consentedAt,
    }));
    setIsUpdatingCompliance(false);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-600/15 text-lg font-semibold text-blue-200">
              {initials(currentUser.firstName, currentUser.lastName, currentUser.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Your Profile
              </p>

              {isEditingProfile ? (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-left">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        First Name
                      </span>
                      <input
                        className="mt-2 w-full rounded-[1rem] border border-slate-700/70 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60"
                        onChange={(event) => setFirstName(event.target.value)}
                        value={firstName}
                      />
                    </label>
                    <label className="text-left">
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Last Name
                      </span>
                      <input
                        className="mt-2 w-full rounded-[1rem] border border-slate-700/70 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/60"
                        onChange={(event) => setLastName(event.target.value)}
                        value={lastName}
                      />
                    </label>
                  </div>

                  <p className="text-sm text-slate-400">{currentUser.email}</p>
                  {profileError ? (
                    <p className="text-sm text-amber-200">{profileError}</p>
                  ) : null}

                  <div className="flex gap-3">
                    <button
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
                      disabled={isSavingProfile}
                      onClick={() => {
                        void saveProfile();
                      }}
                      type="button"
                    >
                      {isSavingProfile ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      className="rounded-xl border border-slate-700/70 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                      disabled={isSavingProfile}
                      onClick={() => {
                        setFirstName(currentUser.firstName ?? "");
                        setLastName(currentUser.lastName ?? "");
                        setProfileError(null);
                        setIsEditingProfile(false);
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
                    <span className="rounded-full border border-blue-500/25 bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                      {currentUser.role ?? "member"}
                    </span>
                    <button
                      className="text-sm text-slate-400 underline-offset-4 transition hover:text-blue-300 hover:underline"
                      onClick={() => setIsEditingProfile(true)}
                      type="button"
                    >
                      Edit name
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Organization
          </p>
          <p className="mt-4 text-2xl font-semibold text-white">
            {currentUser.org?.name ?? "No organization"}
          </p>
          {currentUser.org ? (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Org Slug
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-300">{currentUser.org.slug}</p>
                </div>
                <button
                  className="rounded-xl border border-slate-700/70 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-blue-500/40 hover:text-white"
                  onClick={() => {
                    void copySlug();
                  }}
                  type="button"
                >
                  {copied ? "Copied" : "Copy slug"}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Plan
                  </p>
                  <p className="mt-2 text-sm font-medium capitalize text-slate-300">
                    {currentUser.org.plan}
                  </p>
                </div>
                <div className="rounded-[1rem] border border-slate-800/70 bg-slate-950/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Created
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-300">
                    {formatDate(currentUser.org.createdAt) ?? "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Join or create an organization to unlock the workspace.
            </p>
          )}
        </section>
      </div>

      {canManageMembers ? (
        <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Team Members
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Manage roles and remove members from your org without leaving Settings.
              </p>
            </div>
            <span className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {members.length} members
            </span>
          </div>

          {teamError ? (
            <div className="mt-4 rounded-[1rem] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {teamError}
            </div>
          ) : null}

          <div className="mt-5 space-y-3">
            {members.map((member) => {
              const isSelf = member.id === currentUser.id;
              const loading = mutatingMemberId === member.id;
              const memberName =
                [member.firstName, member.lastName].filter(Boolean).join(" ").trim() || member.email;

              return (
                <div
                  className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  key={member.id}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-500/25 bg-blue-600/15 text-sm font-semibold text-blue-200">
                      {initials(member.firstName, member.lastName, member.email)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {memberName}
                        {isSelf ? (
                          <span className="ml-2 text-xs font-medium text-slate-500">(you)</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{member.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                        {member.callCount} calls · joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-blue-500/60 disabled:opacity-50"
                      disabled={loading || isSelf}
                      onChange={(event) => {
                        void updateMemberRole(member.id, event.target.value);
                      }}
                      value={member.role ?? "rep"}
                    >
                      <option value="rep">Rep</option>
                      <option value="manager">Manager</option>
                      <option value="executive">Executive</option>
                      <option value="admin">Admin</option>
                    </select>
                    {!isSelf ? (
                      <button
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                        disabled={loading}
                        onClick={() => {
                          void removeMember(member.id);
                        }}
                        type="button"
                      >
                        {loading ? "Removing..." : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Compliance &amp; Recording
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Acknowledge the call-recording consent requirement before auto-ingesting or reviewing recorded conversations.
        </p>

        {compliance.hasConsented ? (
          <div className="mt-5 rounded-[1.2rem] border border-emerald-500/25 bg-emerald-500/10 px-4 py-4">
            <p className="text-sm font-semibold text-emerald-300">
              Recording consent acknowledged
            </p>
            <p className="mt-2 text-sm text-emerald-100/80">
              Last acknowledged {formatDate(compliance.consentedAt) ?? "recently"}.
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-[1.2rem] border border-amber-500/25 bg-amber-500/10 px-4 py-4">
            <p className="text-sm font-semibold text-amber-200">
              Recording consent not acknowledged yet
            </p>
            <p className="mt-2 text-sm text-amber-100/80">
              Managers and admins should acknowledge the recording policy before Zoom auto-ingest is enabled in production.
            </p>
          </div>
        )}

        {complianceError ? (
          <p className="mt-4 text-sm text-amber-200">{complianceError}</p>
        ) : null}

        {compliance.canManage ? (
          <div className="mt-5">
            <button
              className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
              disabled={isUpdatingCompliance}
              onClick={() => {
                void acknowledgeConsent();
              }}
              type="button"
            >
              {isUpdatingCompliance
                ? "Updating..."
                : compliance.hasConsented
                  ? "Acknowledge again"
                  : "Acknowledge consent policy"}
            </button>
          </div>
        ) : null}
      </section>

      {initialIntegrations ? (
        <IntegrationsSettingsPanel initialStatuses={initialIntegrations} notices={notices} />
      ) : null}
    </div>
  );
}
