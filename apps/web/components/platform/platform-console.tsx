"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  ForgeButton,
  ForgeChip,
  ForgeEmptyState,
  ForgeManagementTable,
  ForgeMobileTableCards,
  ForgeMetric,
  ForgeStatCard,
  ForgeSurface,
} from "@/components/forge";
import {
  OperationalMetricStrip,
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import {
  CREATE_ORGANIZATION_ENDPOINT,
  PLATFORM_SESSION_ENDPOINT,
  PLATFORM_STAFF_ENDPOINT,
  submitCreateOrganization,
  submitCreateSession,
  submitEndSession,
  submitGrantStaff,
  submitRevokeStaff,
  toActiveSession,
} from "./platform-console-actions";

type PlatformRole = "owner" | "operator";
type PlatformStaffStatus = "active" | "revoked";

export type PlatformConsoleOrganization = {
  createdAt: string;
  id: string;
  name: string;
  plan: string;
  slug: string;
};

export type PlatformConsoleStaffMember = {
  createdAt: string;
  email: string | null;
  role: PlatformRole;
  status: PlatformStaffStatus;
  updatedAt: string;
  userId: string;
};

export type PlatformConsoleActiveSession = {
  expiresAt: string;
  id: string;
  reason: string;
  targetOrgId: string | null;
  targetOrgName: string;
  targetOrgSlug: string;
};

type PlatformConsoleProps = {
  activeSession: PlatformConsoleActiveSession | null;
  currentUserEmail: string;
  currentUserId: string;
  organizations: PlatformConsoleOrganization[];
  platformStaff: PlatformConsoleStaffMember[];
  query: string;
  staffRole: PlatformRole;
  staffStatus: PlatformStaffStatus;
};

function formatDate(value: string) {
  return value ? value.slice(0, 10) : "unknown";
}

export function PlatformConsole({
  activeSession,
  currentUserEmail,
  currentUserId,
  organizations: initialOrganizations,
  platformStaff,
  query,
  staffRole,
  staffStatus,
}: PlatformConsoleProps) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [staffMembers, setStaffMembers] = useState(platformStaff);
  const [session, setSession] = useState(activeSession);
  const [selectedOrgId, setSelectedOrgId] = useState(initialOrganizations[0]?.id ?? "");
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [staffStatusMessage, setStaffStatusMessage] = useState<string | null>(null);
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [isGrantingStaff, setIsGrantingStaff] = useState(false);
  const [revokingStaffId, setRevokingStaffId] = useState<string | null>(null);

  const activeStaffCount = useMemo(
    () => staffMembers.filter((member) => member.status === "active").length,
    [staffMembers],
  );
  const selectedOrganization = organizations.find((org) => org.id === selectedOrgId) ?? organizations[0] ?? null;

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateStatus(null);
    setIsCreating(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const data = await submitCreateOrganization(fetch, formData);
      setOrganizations((current) => {
        if (current.some((org) => org.id === data.organization.id)) {
          return current;
        }

        return [...current, data.organization].sort((left, right) =>
          left.name.localeCompare(right.name),
        );
      });
      setSelectedOrgId(data.organization.id);
      setCreateStatus(`Created ${data.organization.name}. Invite prepared for ${data.invite.email}.`);
      form.reset();
    } catch (error) {
      setCreateStatus(error instanceof Error ? error.message : "Unable to create organization");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSessionStatus(null);
    setIsSwitching(true);

    const formData = new FormData(event.currentTarget);

    try {
      const data = await submitCreateSession(fetch, formData, selectedOrganization?.id ?? null);
      setSession(toActiveSession(data, organizations));
      setSessionStatus("Session active. Open the workspace to operate as org admin.");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to start platform session");
    } finally {
      setIsSwitching(false);
    }
  }

  async function handleEndSession() {
    setSessionStatus(null);
    setIsEndingSession(true);

    try {
      await submitEndSession(fetch);
      setSession(null);
      setSessionStatus("Platform session ended.");
    } catch (error) {
      setSessionStatus(error instanceof Error ? error.message : "Unable to end platform session");
    } finally {
      setIsEndingSession(false);
    }
  }

  async function handleGrantStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStaffStatusMessage(null);
    setIsGrantingStaff(true);

    const form = event.currentTarget;

    try {
      const data = await submitGrantStaff(fetch, new FormData(form));
      setStaffMembers((current) => {
        const withoutExisting = current.filter((member) => member.userId !== data.staff.userId);
        return [data.staff, ...withoutExisting];
      });
      setStaffStatusMessage(`Granted ${data.staff.role} access to ${data.staff.email ?? data.staff.userId}.`);
      form.reset();
    } catch (error) {
      setStaffStatusMessage(error instanceof Error ? error.message : "Unable to grant platform staff");
    } finally {
      setIsGrantingStaff(false);
    }
  }

  async function handleRevokeStaff(userId: string) {
    setStaffStatusMessage(null);
    setRevokingStaffId(userId);

    try {
      await submitRevokeStaff(fetch, userId, revokeReasons[userId] ?? "");
      setStaffMembers((current) =>
        current.map((member) =>
          member.userId === userId
            ? {
                ...member,
                status: "revoked",
                updatedAt: new Date().toISOString(),
              }
            : member,
        ),
      );
      setStaffStatusMessage("Platform staff access revoked.");
      setRevokeReasons((current) => ({ ...current, [userId]: "" }));
    } catch (error) {
      setStaffStatusMessage(error instanceof Error ? error.message : "Unable to revoke platform staff");
    } finally {
      setRevokingStaffId(null);
    }
  }

  return (
    <OperationalWorkspace
      className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8"
      data-platform-console="true"
    >
      <OperationalToolbar
        description="Create organizations, enter customer workspaces, and monitor platform staff from one restricted console."
        eyebrow="Argos platform"
        status={{ icon: "verified_user", label: staffStatus, tone: staffStatus === "active" ? "success" : "danger" }}
        title="Platform operations"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--forge-muted)]">
          <ForgeChip icon="admin_panel_settings" tone="gold">
            {staffRole}
          </ForgeChip>
          <span className="truncate">{currentUserEmail}</span>
        </div>
      </OperationalToolbar>

      {session ? (
        <ForgeSurface
          className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
          data-platform-active-session="true"
          variant="interactive"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ForgeChip icon="login" tone="cyan">Active org session</ForgeChip>
              <span className="truncate text-sm font-semibold text-[var(--forge-text)]">
                {session.targetOrgName}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--forge-muted)]">
              Reason: {session.reason} · Expires {formatDate(session.expiresAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ForgeButton href="/dashboard" icon="open_in_new" size="sm" variant="primary">
              Open workspace
            </ForgeButton>
            <ForgeButton
              disabled={isEndingSession}
              icon="logout"
              onClick={handleEndSession}
              size="sm"
              type="button"
              variant="secondary"
            >
              {isEndingSession ? "Ending" : "End session"}
            </ForgeButton>
          </div>
        </ForgeSurface>
      ) : (
        <ForgeSurface className="px-4 py-3" data-platform-active-session="false" variant="subtle">
          <div className="flex flex-wrap items-center gap-2">
            <ForgeChip icon="lock" tone="muted">No active platform session</ForgeChip>
            <span className="text-sm text-[var(--forge-muted)]">
              Choose an organization and enter a reason before switching context.
            </span>
          </div>
        </ForgeSurface>
      )}

      <OperationalMetricStrip
        metrics={[
          { icon: "business", label: "Organizations", tone: "gold", value: organizations.length },
          { icon: "group", label: "Active staff", tone: "cyan", value: activeStaffCount },
          { icon: "verified_user", label: "Your role", tone: staffRole === "owner" ? "success" : "gold", value: staffRole },
          { icon: "login", label: "Session", tone: session ? "success" : "muted", value: session ? session.targetOrgSlug : "none" },
        ]}
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="space-y-3">
          <ForgeSurface className="p-4" variant="panel">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="forge-page-eyebrow">Organizations</p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Customer accounts</h2>
              </div>
              <form action="/platform" className="flex min-w-0 flex-col gap-2 sm:flex-row" method="get">
                <label className="sr-only" htmlFor="platform-org-search">Search organizations</label>
                <input
                  className="min-h-10 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60 sm:w-72"
                  defaultValue={query}
                  id="platform-org-search"
                  name="q"
                  placeholder="Search organizations"
                />
                <ForgeButton icon="search" size="sm" type="submit" variant="secondary">
                  Search
                </ForgeButton>
              </form>
            </div>

            {organizations.length ? (
              <ForgeManagementTable
                className="mt-4"
                mobileCards={
                  <ForgeMobileTableCards>
                    {organizations.map((org) => (
                      <div
                        className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4"
                        key={`${org.id}:mobile`}
                      >
                        <p className="truncate text-sm font-semibold text-[var(--forge-text)]">{org.name}</p>
                        <p className="mt-1 truncate text-sm text-[var(--forge-muted)]">{org.slug}</p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <ForgeChip tone="gold">{org.plan}</ForgeChip>
                          <button
                            className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forge-cyan)]"
                            onClick={() => setSelectedOrgId(org.id)}
                            type="button"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    ))}
                  </ForgeMobileTableCards>
                }
              >
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                    <tr>
                      <th className="px-4 py-3">Organization</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                    {organizations.map((org) => (
                      <tr key={org.id}>
                        <td className="px-4 py-3">
                          <p className="truncate font-semibold text-[var(--forge-text)]">{org.name}</p>
                          <p className="mt-1 truncate text-xs text-[var(--forge-muted)]">{org.slug}</p>
                        </td>
                        <td className="px-4 py-3">
                          <ForgeChip tone="gold">{org.plan}</ForgeChip>
                        </td>
                        <td className="px-4 py-3 text-xs uppercase tracking-[0.14em] text-[var(--forge-muted)]">
                          {formatDate(org.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forge-cyan)] disabled:text-[var(--forge-muted)]"
                            disabled={selectedOrgId === org.id}
                            onClick={() => setSelectedOrgId(org.id)}
                            type="button"
                          >
                            {selectedOrgId === org.id ? "Selected" : "Select"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ForgeManagementTable>
            ) : (
              <ForgeEmptyState
                className="mt-4"
                description={
                  query
                    ? `No organizations found for "${query}".`
                    : "Create the first customer organization from the platform console."
                }
                icon="business"
                title="No organizations found"
              />
            )}
          </ForgeSurface>

          <ForgeSurface className="p-4" variant="panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="forge-page-eyebrow">Platform staff</p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Staff controls</h2>
              </div>
              <ForgeChip tone={staffRole === "owner" ? "success" : "muted"}>
                {staffRole === "owner" ? "Owner controls" : "Operator controls"}
              </ForgeChip>
            </div>

            {staffRole === "owner" ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ForgeStatCard
                    icon="admin_panel_settings"
                    label="Owner access"
                    tone="success"
                    value="Enabled"
                    valueSize="compact"
                  />
                  <ForgeStatCard
                    icon="group"
                    label="Active operators"
                    tone="cyan"
                    value={activeStaffCount}
                  />
                  <ForgeStatCard
                    icon="history"
                    label="Audit mode"
                    tone="gold"
                    value="Required"
                    valueSize="compact"
                  />
                </div>
                <form
                  className="mt-4 grid gap-3 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/45 p-3 lg:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_auto]"
                  data-platform-staff-endpoint={PLATFORM_STAFF_ENDPOINT}
                  onSubmit={handleGrantStaff}
                >
                  <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                    Staff email
                    <input
                      className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                      name="email"
                      required
                      type="email"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                    Role
                    <select
                      className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                      defaultValue="operator"
                      name="role"
                    >
                      <option value="operator">Operator</option>
                      <option value="owner">Owner</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                    Reason
                    <input
                      className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                      name="reason"
                      required
                    />
                  </label>
                  <ForgeButton
                    className="self-end"
                    disabled={isGrantingStaff}
                    icon="person_add"
                    size="sm"
                    type="submit"
                    variant="primary"
                  >
                    {isGrantingStaff ? "Granting" : "Grant"}
                  </ForgeButton>
                </form>
              </>
            ) : (
              <p className="mt-4 text-sm leading-6 text-[var(--forge-muted)]">
                Owner role is required for staff membership changes.
              </p>
            )}
            {staffStatusMessage ? (
              <p className="mt-4 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-muted)]">
                {staffStatusMessage}
              </p>
            ) : null}

            <ForgeManagementTable className="mt-4">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                  <tr>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                  {staffMembers.map((member) => (
                    <tr key={member.userId}>
                      <td className="px-4 py-3">
                        <p className="truncate font-semibold text-[var(--forge-text)]">
                          {member.email ?? member.userId}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--forge-muted)]">{member.userId}</p>
                      </td>
                      <td className="px-4 py-3 capitalize text-[var(--forge-text)]">{member.role}</td>
                      <td className="px-4 py-3">
                        <ForgeChip tone={member.status === "active" ? "success" : "danger"}>
                          {member.status}
                        </ForgeChip>
                      </td>
                      <td className="px-4 py-3">
                        {staffRole === "owner" && member.status === "active" && member.userId !== currentUserId ? (
                          <div className="ml-auto grid max-w-xs gap-2">
                            <input
                              className="min-h-9 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-xs text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                              onChange={(event) =>
                                setRevokeReasons((current) => ({
                                  ...current,
                                  [member.userId]: event.target.value,
                                }))
                              }
                              placeholder="Revocation reason"
                              value={revokeReasons[member.userId] ?? ""}
                            />
                            <button
                              className="justify-self-start text-xs font-semibold uppercase tracking-[0.14em] text-[var(--forge-danger)] disabled:text-[var(--forge-muted)]"
                              disabled={revokingStaffId === member.userId}
                              onClick={() => handleRevokeStaff(member.userId)}
                              type="button"
                            >
                              {revokingStaffId === member.userId ? "Revoking" : "Revoke"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs uppercase tracking-[0.14em] text-[var(--forge-muted)]">
                            {formatDate(member.createdAt)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ForgeManagementTable>
          </ForgeSurface>
        </section>

        <aside className="space-y-3">
          <ForgeSurface className="p-4" variant="panel">
            <p className="forge-page-eyebrow">Create organization</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">New customer account</h2>
            <form
              className="mt-4 grid gap-3"
              data-platform-create-endpoint={CREATE_ORGANIZATION_ENDPOINT}
              onSubmit={handleCreateOrganization}
            >
              <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                Organization name
                <input
                  className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  name="name"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                Slug
                <input
                  className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  name="slug"
                  pattern="[a-z0-9-]+"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                Initial admin email
                <input
                  className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  name="adminEmail"
                  required
                  type="email"
                />
              </label>
              <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                Plan
                <select
                  className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  defaultValue="trial"
                  name="plan"
                >
                  <option value="trial">Trial</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                Reason
                <textarea
                  className="min-h-24 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  name="reason"
                  required
                />
              </label>
              {createStatus ? (
                <p className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-muted)]">
                  {createStatus}
                </p>
              ) : null}
              <ForgeButton disabled={isCreating} icon="add_business" type="submit" variant="primary">
                {isCreating ? "Creating" : "Create organization"}
              </ForgeButton>
            </form>
          </ForgeSurface>

          <ForgeSurface className="p-4" variant="panel">
            <p className="forge-page-eyebrow">Org switch</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Enter customer workspace</h2>
            <form
              className="mt-4 grid gap-3"
              data-platform-session-endpoint={PLATFORM_SESSION_ENDPOINT}
              onSubmit={handleCreateSession}
            >
              <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                Organization
                <select
                  className="min-h-10 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  disabled={!organizations.length}
                  name="orgId"
                  onChange={(event) => setSelectedOrgId(event.target.value)}
                  value={selectedOrgId}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
                Reason
                <textarea
                  className="min-h-24 rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  name="reason"
                  required
                />
              </label>
              {selectedOrganization ? (
                <ForgeMetric
                  label="Selected org"
                  tone="cyan"
                  value={selectedOrganization.slug}
                />
              ) : null}
              {sessionStatus ? (
                <p className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-muted)]">
                  {sessionStatus}
                </p>
              ) : null}
              <ForgeButton
                disabled={isSwitching || !organizations.length}
                icon="login"
                type="submit"
                variant="primary"
              >
                {isSwitching ? "Starting session" : "Start session"}
              </ForgeButton>
            </form>
          </ForgeSurface>
        </aside>
      </div>
    </OperationalWorkspace>
  );
}
