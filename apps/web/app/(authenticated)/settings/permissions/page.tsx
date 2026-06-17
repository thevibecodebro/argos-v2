import { ForgeChip, ForgeTableShell } from "@/components/forge";
import { SettingsOperationalLayout } from "../settings-operational-layout";
import { loadAdminPermissionsSettings } from "./permissions-page-data";

export default async function SettingsPermissionsPage() {
  const { presets, snapshot } = await loadAdminPermissionsSettings();
  const teams = snapshot?.teams ?? [];
  const memberships = snapshot?.memberships ?? [];
  const grants = snapshot?.grants ?? [];
  const managers = snapshot?.managers ?? [];

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/permissions/manage", icon: "lock_open", label: "Manage access", variant: "primary" }]}
      description="Review role scopes and permission boundaries."
      previewDescription="Preset grants and manager access boundaries."
      previewRows={[
        { label: "Presets", value: presets.length },
        { label: "Grants", value: grants.length },
        { label: "Managers", value: managers.length },
        { label: "Teams", value: teams.length },
      ]}
      previewTitle="Permission status"
      route="permissions"
      title="Permissions"
    >
      <section className="grid gap-3" data-permissions-route="overview">
        <div className="rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
            Access overview
          </p>
          <h2 className="mt-2 text-base font-semibold text-[var(--forge-text)]">
            Teams, managers, and grants
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">
            Use this page to scan coverage. Open Manage access when you need to apply presets or assign primary managers.
          </p>
        </div>

        <ForgeTableShell className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--forge-border)] text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Managers</th>
                  <th className="px-4 py-3">Reps</th>
                  <th className="px-4 py-3">Grants</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--forge-border)]">
                {teams.length ? (
                  teams.map((team) => {
                    const teamMemberships = memberships.filter((membership) => membership.teamId === team.id);
                    const managerCount = teamMemberships.filter((membership) => membership.membershipType === "manager").length;
                    const repCount = teamMemberships.filter((membership) => membership.membershipType === "rep").length;
                    const grantCount = grants.filter((grant) => grant.teamId === team.id).length;

                    return (
                      <tr
                        className="bg-[color-mix(in_srgb,var(--forge-text)_1.8%,transparent)] text-sm text-[var(--forge-text)]"
                        key={team.id}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">{team.name}</p>
                          <p className="mt-1 line-clamp-1 text-xs text-[var(--forge-muted)]">{team.description}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold tabular-nums">{managerCount}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums">{repCount}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums">{grantCount}</td>
                        <td className="px-4 py-3">
                          <ForgeChip tone={managerCount > 0 && repCount > 0 ? "success" : "muted"}>
                            {managerCount > 0 && repCount > 0 ? "Covered" : "Needs setup"}
                          </ForgeChip>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-sm text-[var(--forge-muted)]" colSpan={5}>
                      Team access appears here after teams and memberships are created.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ForgeTableShell>
      </section>
    </SettingsOperationalLayout>
  );
}
