"use client";

import { useState, type FormEvent } from "react";
import {
  ForgeButton,
  ForgeChip,
  ForgeManagementTable,
  ForgeSurface,
} from "@/components/forge";
import {
  OperationalToolbar,
  OperationalWorkspace,
} from "@/components/operational-workspace";
import {
  PLATFORM_STAFF_ENDPOINT,
  submitGrantStaff,
  submitRevokeStaff,
} from "./platform-console-actions";
import { formatDate } from "./platform-format";
import type {
  PlatformConsoleStaffMember,
  PlatformRole,
} from "./platform-types";

type PlatformStaffPageProps = {
  currentUserId: string;
  platformStaff: PlatformConsoleStaffMember[];
  staffRole: PlatformRole;
};

export function PlatformStaffPage({
  currentUserId,
  platformStaff,
  staffRole,
}: PlatformStaffPageProps) {
  const [staffMembers, setStaffMembers] = useState(platformStaff);
  const [staffStatusMessage, setStaffStatusMessage] = useState<string | null>(null);
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});
  const [isGrantingStaff, setIsGrantingStaff] = useState(false);
  const [revokingStaffId, setRevokingStaffId] = useState<string | null>(null);
  const activeStaffCount = staffMembers.filter((member) => member.status === "active").length;

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
      className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8"
      data-platform-staff-page="true"
    >
      <OperationalToolbar
        description="Manage internal platform access. This is separate from organization roles."
        eyebrow="Platform"
        status={{
          icon: "admin_panel_settings",
          label: staffRole === "owner" ? `${activeStaffCount} active staff` : "Operator access",
          tone: staffRole === "owner" ? "success" : "muted",
        }}
        title="Staff"
      />

      <ForgeSurface className="p-4" variant="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="forge-page-eyebrow">Platform staff</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--forge-text)]">Staff controls</h2>
          </div>
        </div>

        {staffRole === "owner" ? (
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
              icon="group_add"
              size="sm"
              type="submit"
              variant="primary"
            >
              {isGrantingStaff ? "Granting" : "Grant"}
            </ForgeButton>
          </form>
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
            <thead className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--forge-muted)]">
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
                          className="justify-self-start text-xs font-semibold uppercase tracking-[0.12em] text-[var(--forge-danger)] disabled:text-[var(--forge-muted)]"
                          disabled={revokingStaffId === member.userId}
                          onClick={() => handleRevokeStaff(member.userId)}
                          type="button"
                        >
                          {revokingStaffId === member.userId ? "Revoking" : "Revoke"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--forge-muted)]">
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
    </OperationalWorkspace>
  );
}
