"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationMember } from "@/lib/users/service";
import type { InviteRecord } from "@/lib/invites/repository";

function initials(firstName: string | null, lastName: string | null, fallback: string) {
  const v = [firstName, lastName].filter(Boolean).map((s) => s?.[0]?.toUpperCase()).join("");
  return v || fallback.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

type PeoplePanelProps = {
  currentUserId: string;
  initialMembers: OrganizationMember[];
  initialPendingInvites: InviteRecord[];
  initialTeams: Array<{ id: string; name: string }>;
  inviteEmailAvailable: boolean;
  inviteEmailReason: string | null;
};

export function PeoplePanel({
  currentUserId,
  initialMembers,
  initialPendingInvites,
  initialTeams,
  inviteEmailAvailable,
  inviteEmailReason,
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

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"rep" | "manager" | "executive" | "admin">("rep");
  const [inviteTeamIds, setInviteTeamIds] = useState<string[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSending, setInviteSending] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeErrors, setRevokeErrors] = useState<Record<string, string>>({});

  const showTeamPicker = inviteRole === "rep" || inviteRole === "manager";

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
    const payload = (await response.json()) as { id?: string; role?: OrganizationMember["role"]; error?: string };
    if (!response.ok) {
      setMemberError(payload.error ?? "Role change failed. Refresh and try again.");
      setSavingRoleId(null);
      return;
    }
    setMembers((current) =>
      current.map((m) => (m.id === memberId ? { ...m, role: payload.role ?? m.role } : m)),
    );
    setStagedRoles((current) => { const next = { ...current }; delete next[memberId]; return next; });
    setSavingRoleId(null);
    router.refresh();
  }

  async function removeMember(memberId: string) {
    setMemberError(null);
    setRemovingId(memberId);
    const response = await fetch(`/api/organizations/members/${memberId}`, { method: "DELETE" });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMemberError(payload.error ?? "Couldn't remove member. Refresh and try again.");
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
    if (listRes.ok) setPendingInvites(await listRes.json() as InviteRecord[]);
  }

  async function revokeInvite(invite: InviteRecord) {
    setRevokeErrors((e) => { const next = { ...e }; delete next[invite.id]; return next; });
    setRevokingId(invite.id);
    const response = await fetch(`/api/invites/${invite.token}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setRevokeErrors((e) => ({ ...e, [invite.id]: payload.error ?? "Revoke failed. Try again." }));
      setRevokingId(null);
      return;
    }
    setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
    setRevokingId(null);
  }

  return (
    <div className="space-y-5">
      {/* Members section */}
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Members</p>
            <p className="mt-2 text-sm text-[#a9abb3]">Manage roles for everyone in your organization.</p>
          </div>
          <span className="rounded-full border border-[#45484f]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a9abb3]">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>

        {memberError ? (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {memberError}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-[#a9abb3]">No other members yet. Invite teammates to get started.</p>
          ) : (
            members.map((member) => {
              const isSelf = member.id === currentUserId;
              const memberName = [member.firstName, member.lastName].filter(Boolean).join(" ").trim() || member.email;
              const stagedRole = stagedRoles[member.id];
              const hasUnappliedChange = stagedRole !== undefined && stagedRole !== (member.role ?? "rep");
              const isConfirmingRemove = confirmRemoveId === member.id;
              const isRemoving = removingId === member.id;
              const isSavingRole = savingRoleId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#74b1ff]/20 bg-[#74b1ff]/8 text-sm font-semibold text-[#74b1ff]">
                      {initials(member.firstName, member.lastName, member.email)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {memberName}
                        {isSelf ? <span className="ml-2 text-xs font-medium text-[#a9abb3]">(you)</span> : null}
                      </p>
                      <p className="mt-1 text-sm text-[#a9abb3]">{member.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#a9abb3]">
                        {member.callCount} calls · joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>

                  {!isSelf ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Two-step role change */}
                      <select
                        className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-3 py-2 text-sm text-[#ecedf6] outline-none transition focus:border-[#74b1ff]/60 disabled:opacity-50"
                        disabled={isSavingRole}
                        onChange={(e) => setStagedRoles((current) => ({ ...current, [member.id]: e.target.value }))}
                        value={stagedRole ?? member.role ?? "rep"}
                      >
                        <option value="rep">Rep</option>
                        <option value="manager">Manager</option>
                        <option value="executive">Executive</option>
                        <option value="admin">Admin</option>
                      </select>
                      {hasUnappliedChange ? (
                        <button
                          className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-3 py-2 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
                          disabled={isSavingRole}
                          onClick={() => void applyRoleChange(member.id)}
                          type="button"
                        >
                          {isSavingRole ? "Saving..." : "Apply"}
                        </button>
                      ) : null}

                      {/* Two-step remove */}
                      {isConfirmingRemove ? (
                        <>
                          <span className="text-xs text-[#a9abb3]">Remove {memberName}?</span>
                          <button
                            className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                            disabled={isRemoving}
                            onClick={() => void removeMember(member.id)}
                            type="button"
                          >
                            {isRemoving ? "Removing..." : "Confirm remove"}
                          </button>
                          <button
                            className="rounded-xl border border-[#45484f]/20 px-3 py-2 text-sm font-medium text-[#a9abb3] transition hover:text-white"
                            onClick={() => setConfirmRemoveId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded-xl border border-[#45484f]/20 px-3 py-2 text-sm font-medium text-[#a9abb3] transition hover:border-red-500/30 hover:text-red-300"
                          onClick={() => setConfirmRemoveId(member.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Invites section */}
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">Invites</p>
            <p className="mt-2 text-sm text-[#a9abb3]">
              Invite links expire in 7 days. Revoke a pending invite to invalidate it immediately.
            </p>
          </div>
          {!showInviteForm && inviteEmailAvailable ? (
            <button
              className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-2 text-sm font-semibold text-[#002345] transition hover:brightness-110"
              onClick={() => setShowInviteForm(true)}
              type="button"
            >
              Invite member
            </button>
          ) : !inviteEmailAvailable ? (
            <span className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200">
              Setup required
            </span>
          ) : null}
        </div>

        {!inviteEmailAvailable ? (
          <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {inviteEmailReason ??
              "Invite email delivery is unavailable in this environment. Configure invite delivery before sending new invites."}
          </div>
        ) : null}

        {showInviteForm && inviteEmailAvailable ? (
          <div className="mt-5 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 p-5 space-y-4">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">Email</span>
              <input
                className="mt-2 w-full rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#74b1ff]/60"
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
                type="email"
                value={inviteEmail}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">Role</span>
              <select
                className="mt-2 w-full rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3 text-sm text-white outline-none transition focus:border-[#74b1ff]/60"
                onChange={(e) => {
                  setInviteRole(e.target.value as typeof inviteRole);
                  setInviteTeamIds([]);
                }}
                value={inviteRole}
              >
                <option value="rep">Rep — records and reviews own calls</option>
                <option value="manager">Manager — coaches team calls</option>
                <option value="executive">Executive — views all team data</option>
                <option value="admin">Admin — full access</option>
              </select>
            </label>

            {showTeamPicker && initialTeams.length > 0 ? (
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">
                  Teams (optional)
                </span>
                <div className="mt-2 space-y-2">
                  {initialTeams.map((team) => (
                    <label key={team.id} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                      <input
                        checked={inviteTeamIds.includes(team.id)}
                        className="accent-[#74b1ff]"
                        onChange={(e) =>
                          setInviteTeamIds((prev) =>
                            e.target.checked ? [...prev, team.id] : prev.filter((id) => id !== team.id),
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

            {inviteError ? <p className="text-sm text-red-300">{inviteError}</p> : null}

            <div className="flex gap-3">
              <button
                className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-2.5 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
                disabled={!inviteEmail.trim() || inviteSending}
                onClick={() => void sendInvite()}
                type="button"
              >
                {inviteSending ? "Sending..." : "Send invite"}
              </button>
              <button
                className="rounded-xl border border-[#45484f]/20 px-4 py-2.5 text-sm font-medium text-[#a9abb3] transition hover:text-white"
                disabled={inviteSending}
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmail("");
                  setInviteError(null);
                  setInviteTeamIds([]);
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-[#a9abb3]">
              No pending invites. {inviteEmailAvailable ? 'Use the "Invite member" button above to add teammates.' : "Invite delivery will appear here once email setup is configured."}
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{invite.email}</p>
                      <p className="mt-1 text-xs text-[#a9abb3] uppercase tracking-[0.18em]">
                        {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      className="rounded-xl border border-[#45484f]/20 px-3 py-1.5 text-sm font-medium text-[#a9abb3] transition hover:border-red-500/30 hover:text-red-300 disabled:opacity-50"
                      disabled={revokingId === invite.id}
                      onClick={() => void revokeInvite(invite)}
                      type="button"
                    >
                      {revokingId === invite.id ? "Revoking..." : "Revoke"}
                    </button>
                  </div>
                  {revokeErrors[invite.id] ? (
                    <p className="mt-2 text-xs text-red-300">{revokeErrors[invite.id]}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
