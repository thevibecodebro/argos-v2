import { ForgeChip, ForgeTableShell } from "@/components/forge";
import { SettingsOperationalLayout } from "../settings-operational-layout";
import { loadAdminTeamsSettings } from "./teams-page-data";

export default async function SettingsTeamsPage() {
  const snapshot = await loadAdminTeamsSettings();
  const teams = snapshot?.teams ?? [];
  const managers = snapshot?.managers ?? [];
  const reps = snapshot?.reps ?? [];
  const memberships = snapshot?.memberships ?? [];

  return (
    <SettingsOperationalLayout
      actions={[{ href: "/settings/teams/manage", icon: "groups", label: "Manage teams", variant: "primary" }]}
      description="Configure teams and manager assignments."
      previewDescription="Team structure and assignment coverage."
      previewRows={[
        { label: "Teams", value: teams.length },
        { label: "Managers", value: managers.length },
        { label: "Reps", value: reps.length },
        { label: "Memberships", value: memberships.length },
      ]}
      previewTitle="Team status"
      route="teams"
      title="Teams"
    >
      <section className="grid gap-3" data-teams-route="overview">
        <div className="rounded-xl border border-[var(--forge-border)] bg-[color-mix(in_srgb,var(--forge-text)_2.6%,transparent)] p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--forge-muted)]">
            Team overview
          </p>
          <h2 className="mt-2 text-base font-semibold text-[var(--forge-text)]">
            Team structure and coverage
          </h2>
          <p className="mt-1 text-sm leading-5 text-[var(--forge-muted)]">
            Scan team coverage here. Open Manage teams when you need to edit metadata or memberships.
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
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--forge-border)]">
                {teams.length ? (
                  teams.map((team) => {
                    const teamMemberships = memberships.filter((membership) => membership.teamId === team.id);
                    const managerCount = teamMemberships.filter((membership) => membership.membershipType === "manager").length;
                    const repCount = teamMemberships.filter((membership) => membership.membershipType === "rep").length;

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
                        <td className="px-4 py-3">
                          <ForgeChip tone={team.status === "active" ? "success" : "muted"}>
                            {team.status}
                          </ForgeChip>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-sm text-[var(--forge-muted)]" colSpan={4}>
                      Teams appear here after the first team is created.
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
