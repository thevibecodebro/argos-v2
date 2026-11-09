"use client";

import styles from "./platform-console.module.css";

import { useState, type FormEvent } from "react";
import {
  ForgeButton,
  ForgeChip,
  ForgeManagementTable,
  ForgeMobileTableCards,
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
      setStaffStatusMessage(error instanceof Error ? error.message : "Unable to grant agency staff");
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
      setStaffStatusMessage("Agency staff access revoked.");
      setRevokeReasons((current) => ({ ...current, [userId]: "" }));
    } catch (error) {
      setStaffStatusMessage(error instanceof Error ? error.message : "Unable to revoke agency staff");
    } finally {
      setRevokingStaffId(null);
    }
  }

  function renderRevokeAction(member: PlatformConsoleStaffMember) {
    if (staffRole !== "owner" || member.status !== "active" || member.userId === currentUserId) {
      return null;
    }

    return (
      <div className="grid min-w-0 max-w-xs gap-2">
        <input
          aria-label={`Revocation reason for ${member.email ?? member.userId}`}
          className="min-h-11 min-w-0 rounded-md border border-[var(--forge-border)] bg-[var(--forge-field-bg)] px-3 text-xs text-[var(--forge-text)]"
          onChange={(event) => setRevokeReasons((current) => ({ ...current, [member.userId]: event.target.value }))}
          placeholder="Revocation reason"
          value={revokeReasons[member.userId] ?? ""}
        />
        <button
          aria-label={`Revoke access for ${member.email ?? member.userId}`}
          className={`${styles.rowAction} ${styles.revokeAction} justify-self-start`}
          disabled={revokingStaffId === member.userId}
          onClick={() => handleRevokeStaff(member.userId)}
          type="button"
        >
          {revokingStaffId === member.userId ? "Revoking" : "Revoke"}
        </button>
      </div>
    );
  }

  return (
    <OperationalWorkspace
      className={`${styles.workspace} mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8`}
      data-platform-staff-page="true"
    >
      <OperationalToolbar
        description="Manage internal agency access. This is separate from Organization roles."
        status={{
          icon: "admin_panel_settings",
          label: staffRole === "owner" ? `${activeStaffCount} active staff` : "Operator access",
          tone: staffRole === "owner" ? "success" : "muted",
        }}
        title="Staff"
      />

      <section className={styles.section}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={styles.sectionTitle}>Agency staff</h2>
          </div>
        </div>

        {staffRole === "owner" ? (
          <form
            className={styles.grantForm}
            data-platform-staff-endpoint={PLATFORM_STAFF_ENDPOINT}
            onSubmit={handleGrantStaff}
          >
            <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
              Staff email
              <input
                className="min-h-11 rounded-md border border-[var(--forge-border)] bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                name="email"
                required
                type="email"
              />
            </label>
            <label className="grid gap-2 text-sm text-[var(--forge-muted)]">
              Role
              <select
                className="min-h-11 rounded-md border border-[var(--forge-border)] bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
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
                className="min-h-11 rounded-md border border-[var(--forge-border)] bg-[var(--forge-surface)] px-3 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
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
          <p role="status" className="mt-4 rounded-xl border border-[var(--forge-border)] bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-muted)]">
            {staffStatusMessage}
          </p>
        ) : null}

        <ForgeManagementTable className="mt-4" mobileCards={
          <ForgeMobileTableCards className={styles.mobileRows}>
            {staffMembers.map((member) => (
              <article key={member.userId}>
                <p className="text-sm font-semibold">{member.email ?? member.userId}</p>
                <p className="mt-1 text-xs text-[var(--forge-muted)]">{member.userId}</p>
                <dl className={styles.recordDetails}>
                  <div><dt>Role</dt><dd className="capitalize">{member.role}</dd></div>
                  <div><dt>Status</dt><dd><ForgeChip tone={member.status === "active" ? "success" : "danger"}>{member.status}</ForgeChip></dd></div>
                  <div><dt>Created</dt><dd>{formatDate(member.createdAt)}</dd></div>
                </dl>
                <div className="mt-3">{renderRevokeAction(member)}</div>
              </article>
            ))}
          </ForgeMobileTableCards>
        }>
          <table className="w-full table-fixed text-left text-sm">
            <thead className="text-[11px] font-semibold text-[var(--forge-muted)]">
              <tr>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
              {staffMembers.map((member) => (
                <tr key={member.userId}>
                  <td className="px-4 py-3">
                    <p className="break-words font-semibold text-[var(--forge-text)]">
                      {member.email ?? member.userId}
                    </p>
                    <p className="mt-1 break-words text-xs text-[var(--forge-muted)]">{member.userId}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-[var(--forge-text)]">{member.role}</td>
                  <td className="px-4 py-3">
                    <ForgeChip tone={member.status === "active" ? "success" : "danger"}>
                      {member.status}
                    </ForgeChip>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[var(--forge-muted)]">{formatDate(member.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {renderRevokeAction(member)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ForgeManagementTable>
      </section>
    </OperationalWorkspace>
  );
}
