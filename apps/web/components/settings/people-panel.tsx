"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationMember } from "@/lib/users/service";
import type { InviteRecord } from "@/lib/invites/repository";
import {
  ForgeButton,
  ForgeManagementTable,
  ForgeMobileTableCards,
} from "../forge";
import {
  SettingsDrawerButton,
  SettingsEditorDrawer,
  SettingsEditorPanel,
  SettingsEditorWorkbench,
} from "./settings-workbench";

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

type PeoplePanelProps = {
  currentUserId: string;
  initialMembers: OrganizationMember[];
  initialPendingInvites: InviteRecord[];
  initialTeams: Array<{ id: string; name: string }>;
};

export function PeoplePanel({
  currentUserId,
  initialMembers,
  initialPendingInvites,
  initialTeams,
}: PeoplePanelProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialPendingInvites);

  // Per-member pending role selection (staged, not auto-saved)
  const [stagedRoles, setStagedRoles] = useState<Record<string, string>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "rep" | "manager" | "executive" | "admin"
  >("all");

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<
    "rep" | "manager" | "executive" | "admin"
  >("rep");
  const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeErrors, setRevokeErrors] = useState<Record<string, string>>({});

  const showTeamPicker = inviteRole === "rep" || inviteRole === "manager";
  const visibleMembers = members.filter((member) => {
    const query = memberSearch.trim().toLowerCase();
    const role = member.role ?? "rep";
    const memberName = [member.firstName, member.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const matchesQuery =
      !query ||
      `${memberName} ${member.email} ${role}`.toLowerCase().includes(query);
    const matchesRole = roleFilter === "all" || role === roleFilter;

    return matchesQuery && matchesRole;
  });

  async function applyRoleChange(memberId: string) {
    const newRole = stagedRoles[memberId];
    if (!newRole) return;
    setMemberError(null);
    setSavingRoleId(memberId);
    const response = await fetch(`/api/organizations/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    const payload = (await response.json()) as {
      id?: string;
      role?: OrganizationMember["role"];
      error?: string;
    };
    if (!response.ok) {
      setMemberError(
        payload.error ?? "Role change failed. Refresh and try again.",
      );
      setSavingRoleId(null);
      return;
    }
    setMembers((current) =>
      current.map((m) =>
        m.id === memberId ? { ...m, role: payload.role ?? m.role } : m,
      ),
    );
    setStagedRoles((current) => {
      const next = { ...current };
      delete next[memberId];
      return next;
    });
    setSavingRoleId(null);
    router.refresh();
  }

  async function removeMember(memberId: string) {
    setMemberError(null);
    setRemovingId(memberId);
    const response = await fetch(`/api/organizations/members/${memberId}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMemberError(
        payload.error ?? "Couldn't remove member. Refresh and try again.",
      );
      setRemovingId(null);
      setConfirmRemoveId(null);
      return;
    }
    setMembers((current) => current.filter((m) => m.id !== memberId));
    setRemovingId(null);
    setConfirmRemoveId(null);
    router.refresh();
  }

  async function sendInvite() {
    setInviteError(null);
    setInviteSending(true);
    const response = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        role: inviteRole,
        teamIds: inviteTeamIds.length > 0 ? inviteTeamIds : undefined,
      }),
    });
    const data = (await response.json()) as { error?: string; id?: string };
    setInviteSending(false);
    if (!response.ok) {
      setInviteError(data.error ?? "Unable to send invite.");
      return;
    }
    // Reset and close form
    setInviteEmail("");
    setInviteTeamIds([]);
    setInviteRole("rep");
    setShowInviteForm(false);
    // Refresh invite list
    const listRes = await fetch("/api/invites");
    if (listRes.ok) setPendingInvites((await listRes.json()) as InviteRecord[]);
  }

  async function revokeInvite(invite: InviteRecord) {
    setRevokeErrors((e) => {
      const next = { ...e };
      delete next[invite.id];
      return next;
    });
    setRevokingId(invite.id);
    const response = await fetch(`/api/invites/${invite.token}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setRevokeErrors((e) => ({
        ...e,
        [invite.id]: payload.error ?? "Revoke failed. Try again.",
      }));
      setRevokingId(null);
      return;
    }
    setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
    setRevokingId(null);
  }

  const inviteControls = (
    <SettingsEditorDrawer data-people-invite-drawer="">
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
                Invites
              </p>
              <p className="mt-2 text-sm text-[var(--forge-muted)]">
                Links expire in 7 days. Revoke a pending invite to invalidate it
                immediately.
              </p>
            </div>
            <span className="rounded-full border border-[var(--forge-border-strong)]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
              {pendingInvites.length}
            </span>
          </div>
          {!showInviteForm ? (
            <SettingsDrawerButton
              icon="person"
              onClick={() => setShowInviteForm(true)}
              type="button"
            >
              Invite member
            </SettingsDrawerButton>
          ) : null}
        </div>

        {showInviteForm ? (
          <div className="space-y-4 rounded-2xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                Email
              </span>
              <input
                className="mt-2 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[rgba(255,244,230,0.34)] focus:border-[var(--forge-gold)]/60"
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                type="email"
                value={inviteEmail}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                Role
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--forge-gold)]/60"
                onChange={(e) => {
                  setInviteRole(e.target.value as typeof inviteRole);
                  setInviteTeamIds([]);
                }}
                value={inviteRole}
              >
                <option value="rep">Rep — records and reviews own calls</option>
                <option value="manager">Manager — coaches team calls</option>
                <option value="executive">
                  Executive — views all team data
                </option>
                <option value="admin">Admin — full access</option>
              </select>
            </label>

            {showTeamPicker && initialTeams.length > 0 ? (
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                  Teams (optional)
                </span>
                <div className="mt-2 space-y-2">
                  {initialTeams.map((team) => (
                    <label
                      key={team.id}
                      className="flex cursor-pointer items-center gap-2 text-sm text-white"
                    >
                      <input
                        checked={inviteTeamIds.includes(team.id)}
                        className="accent-[var(--forge-gold)]"
                        onChange={(e) =>
                          setInviteTeamIds((prev) =>
                            e.target.checked
                              ? [...prev, team.id]
                              : prev.filter((id) => id !== team.id),
                          )
                        }
                        type="checkbox"
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {inviteError ? (
              <p className="text-sm text-[var(--forge-danger)]">
                {inviteError}
              </p>
            ) : null}

            <div className="grid gap-2">
              <ForgeButton
                disabled={!inviteEmail.trim() || inviteSending}
                icon="person"
                onClick={() => void sendInvite()}
                type="button"
                variant="primary"
              >
                {inviteSending ? "Sending..." : "Send invite"}
              </ForgeButton>
              <ForgeButton
                disabled={inviteSending}
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail("");
                  setInviteError(null);
                  setInviteTeamIds([]);
                }}
                type="button"
                variant="secondary"
              >
                Cancel
              </ForgeButton>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
            Pending invites
          </p>
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-[var(--forge-muted)]">
              No pending invites. Use the invite control above to add teammates.
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {invite.email}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--forge-muted)]">
                        {invite.role} · expires{" "}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      className="rounded-xl border border-[var(--forge-border-strong)]/20 px-3 py-1.5 text-sm font-medium text-[var(--forge-muted)] transition hover:border-[rgba(255,113,108,0.3)] hover:text-[var(--forge-danger)] disabled:opacity-50"
                      disabled={revokingId === invite.id}
                      onClick={() => void revokeInvite(invite)}
                      type="button"
                    >
                      {revokingId === invite.id ? "Revoking..." : "Revoke"}
                    </button>
                  </div>
                  {revokeErrors[invite.id] ? (
                    <p className="mt-2 text-xs text-[var(--forge-danger)]">
                      {revokeErrors[invite.id]}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </SettingsEditorDrawer>
  );

  function renderMemberRoleControls(member: OrganizationMember) {
    const isSelf = member.id === currentUserId;
    const memberName =
      [member.firstName, member.lastName].filter(Boolean).join(" ").trim() ||
      member.email;
    const stagedRole = stagedRoles[member.id];
    const hasUnappliedChange =
      stagedRole !== undefined && stagedRole !== (member.role ?? "rep");
    const isConfirmingRemove = confirmRemoveId === member.id;
    const isRemoving = removingId === member.id;
    const isSavingRole = savingRoleId === member.id;

    if (isSelf) {
      return (
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--forge-muted)]">
          Protected
        </span>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <label>
          <span className="sr-only">Role for {memberName}</span>
          <select
            className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60 disabled:opacity-50"
            disabled={isSavingRole}
            onChange={(e) =>
              setStagedRoles((current) => ({
                ...current,
                [member.id]: e.target.value,
              }))
            }
            value={stagedRole ?? member.role ?? "rep"}
          >
            <option value="rep">Rep</option>
            <option value="manager">Manager</option>
            <option value="executive">Executive</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        {hasUnappliedChange ? (
          <ForgeButton
            disabled={isSavingRole}
            onClick={() => void applyRoleChange(member.id)}
            size="sm"
            type="button"
            variant="primary"
          >
            {isSavingRole ? "Saving..." : "Apply"}
          </ForgeButton>
        ) : null}

        {isConfirmingRemove ? (
          <>
            <span className="text-xs text-[var(--forge-muted)]">
              Remove {memberName}?
            </span>
            <ForgeButton
              disabled={isRemoving}
              onClick={() => void removeMember(member.id)}
              size="sm"
              type="button"
              variant="danger"
            >
              {isRemoving ? "Removing..." : "Confirm remove"}
            </ForgeButton>
            <ForgeButton
              onClick={() => setConfirmRemoveId(null)}
              size="sm"
              type="button"
              variant="secondary"
            >
              Cancel
            </ForgeButton>
          </>
        ) : (
          <ForgeButton
            onClick={() => setConfirmRemoveId(member.id)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Remove
          </ForgeButton>
        )}
      </div>
    );
  }

  return (
    <SettingsEditorWorkbench
      data-people-workspace="management"
      drawer={inviteControls}
      workbench="people"
    >
      <SettingsEditorPanel data-people-member-table="">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
              Member management
            </p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              People table
            </h3>
            <p className="mt-2 text-sm text-[var(--forge-muted)]">
              Search members, stage role changes, and remove inactive access.
            </p>
          </div>
          <span className="rounded-full border border-[var(--forge-border-strong)]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>

        {memberError ? (
          <div className="mt-4 rounded-xl border border-[rgba(255,113,108,0.26)] bg-[rgba(255,113,108,0.1)] px-4 py-3 text-sm text-[var(--forge-danger)]">
            {memberError}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="space-y-2 text-sm text-[var(--forge-muted)]">
            <span>Search members</span>
            <input
              className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--forge-gold)]/60"
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Name, email, or role"
              value={memberSearch}
            />
          </label>
          <label className="space-y-2 text-sm text-[var(--forge-muted)]">
            <span>Role filter</span>
            <select
              className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--forge-gold)]/60"
              onChange={(event) =>
                setRoleFilter(event.target.value as typeof roleFilter)
              }
              value={roleFilter}
            >
              <option value="all">All roles</option>
              <option value="rep">Rep</option>
              <option value="manager">Manager</option>
              <option value="executive">Executive</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>

        {members.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--forge-muted)]">
            Invite teammates from the drawer to add the first member.
          </p>
        ) : visibleMembers.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--forge-muted)]">
            No members match the current search or role filter.
          </p>
        ) : (
          <ForgeManagementTable
            className="mt-5"
            mobileCards={
              <ForgeMobileTableCards>
                {visibleMembers.map((member) => {
                  const memberName =
                    [member.firstName, member.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || member.email;
                  const isSelf = member.id === currentUserId;

                  return (
                    <div
                      className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4"
                      key={`${member.id}:mobile`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/8 text-sm font-semibold text-[var(--forge-gold)]">
                          {initials(
                            member.firstName,
                            member.lastName,
                            member.email,
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {memberName}
                            {isSelf ? (
                              <span className="ml-2 text-xs font-medium text-[var(--forge-muted)]">
                                (you)
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 truncate text-sm text-[var(--forge-muted)]">
                            {member.email}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--forge-muted)]">
                            {member.role ?? "rep"} · {member.callCount} calls
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        {renderMemberRoleControls(member)}
                      </div>
                    </div>
                  );
                })}
              </ForgeMobileTableCards>
            }
          >
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--forge-muted)]">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                {visibleMembers.map((member) => {
                  const memberName =
                    [member.firstName, member.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || member.email;
                  const isSelf = member.id === currentUserId;

                  return (
                    <tr key={member.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/8 text-xs font-semibold text-[var(--forge-gold)]">
                            {initials(
                              member.firstName,
                              member.lastName,
                              member.email,
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {memberName}
                              {isSelf ? (
                                <span className="ml-2 text-xs font-medium text-[var(--forge-muted)]">
                                  (you)
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-1 truncate text-sm text-[var(--forge-muted)]">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-[var(--forge-text)]">
                        {member.role ?? "rep"}
                      </td>
                      <td className="px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--forge-muted)]">
                        {member.callCount} calls · joined{" "}
                        {formatDate(member.joinedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {renderMemberRoleControls(member)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ForgeManagementTable>
        )}
      </SettingsEditorPanel>
    </SettingsEditorWorkbench>
  );
}
