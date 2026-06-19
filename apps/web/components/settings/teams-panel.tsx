"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ForgeButton,
  ForgeManagementTable,
  ForgeMobileTableCards,
  ForgeStatusPanel,
} from "../forge";
import {
  SettingsDrawerButton,
  SettingsDrawerGroup,
  SettingsEditorDrawer,
  SettingsEditorPanel,
  SettingsEditorWorkbench,
} from "./settings-workbench";
import { SettingsTableShell } from "./settings-readability";

type Team = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

type TeamMember = {
  id: string;
  name: string;
};

type TeamMembership = {
  teamId: string;
  userId: string;
  membershipType: "manager" | "rep";
};

type TeamsPanelProps = {
  teams: Team[];
  managers: TeamMember[];
  reps: TeamMember[];
  memberships: TeamMembership[];
};

type TeamDraft = {
  name: string;
  description: string;
  status: string;
};

type TeamPayload = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

type MembershipPayload = {
  membershipType: "manager" | "rep";
  userId: string;
};

type RequestResult<T> = { ok: true; data: T } | { ok: false; error: string };

type FetchFn = typeof fetch;

function readError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as { error?: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }

  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function createTeamRequest(
  fetchFn: FetchFn,
  payload: { name: string; description: string },
): Promise<RequestResult<TeamPayload>> {
  const response = await fetchFn("/api/teams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    return { ok: false, error: readError(data, "Unable to create team") };
  }

  return { ok: true, data: data as TeamPayload };
}

export async function updateTeamRequest(
  fetchFn: FetchFn,
  teamId: string,
  payload: { name: string; description: string; status: string },
): Promise<RequestResult<TeamPayload>> {
  const response = await fetchFn(`/api/teams/${teamId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    return { ok: false, error: readError(data, "Unable to update team") };
  }

  return { ok: true, data: data as TeamPayload };
}

export async function addTeamMembershipRequest(
  fetchFn: FetchFn,
  teamId: string,
  payload: MembershipPayload,
): Promise<RequestResult<unknown>> {
  const response = await fetchFn(`/api/teams/${teamId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    return { ok: false, error: readError(data, "Unable to add team member") };
  }

  return { ok: true, data };
}

export async function removeTeamMembershipRequest(
  fetchFn: FetchFn,
  teamId: string,
  payload: MembershipPayload,
): Promise<RequestResult<unknown>> {
  const response = await fetchFn(`/api/teams/${teamId}/members`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);

  if (!response.ok) {
    return {
      ok: false,
      error: readError(data, "Unable to remove team member"),
    };
  }

  return { ok: true, data };
}

function buildDrafts(teams: Team[]): Record<string, TeamDraft> {
  return Object.fromEntries(
    teams.map((team) => [
      team.id,
      {
        name: team.name,
        description: team.description ?? "",
        status: team.status,
      },
    ]),
  );
}

function sortTeamsByName(items: Team[]): Team[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function memberNameById(members: TeamMember[]): Map<string, string> {
  return new Map(members.map((member) => [member.id, member.name]));
}

export function TeamsPanel({
  teams,
  managers,
  reps,
  memberships,
}: TeamsPanelProps) {
  const router = useRouter();
  const [localTeams, setLocalTeams] = useState(() => sortTeamsByName(teams));
  const [localMemberships, setLocalMemberships] = useState(memberships);
  const [draftsByTeamId, setDraftsByTeamId] = useState<
    Record<string, TeamDraft>
  >(() => buildDrafts(teams));
  const [selectedTeamId, setSelectedTeamId] = useState(
    () => sortTeamsByName(teams)[0]?.id ?? "",
  );
  const [teamSearch, setTeamSearch] = useState("");
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });
  const [managerSelectionByTeamId, setManagerSelectionByTeamId] = useState<
    Record<string, string>
  >({});
  const [repSelectionByTeamId, setRepSelectionByTeamId] = useState<
    Record<string, string>
  >({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const managerNames = memberNameById(managers);
  const repNames = memberNameById(reps);
  const selectedTeam =
    localTeams.find((team) => team.id === selectedTeamId) ??
    localTeams[0] ??
    null;
  const selectedDraft = selectedTeam
    ? (draftsByTeamId[selectedTeam.id] ?? {
        name: selectedTeam.name,
        description: selectedTeam.description ?? "",
        status: selectedTeam.status,
      })
    : null;
  const selectedTeamManagers = selectedTeam
    ? localMemberships.filter(
        (membership) =>
          membership.teamId === selectedTeam.id &&
          membership.membershipType === "manager",
      )
    : [];
  const selectedTeamReps = selectedTeam
    ? localMemberships.filter(
        (membership) =>
          membership.teamId === selectedTeam.id &&
          membership.membershipType === "rep",
      )
    : [];
  const availableManagers = selectedTeam
    ? managers.filter(
        (manager) =>
          !selectedTeamManagers.some(
            (membership) => membership.userId === manager.id,
          ),
      )
    : [];
  const availableReps = selectedTeam
    ? reps.filter(
        (rep) =>
          !selectedTeamReps.some((membership) => membership.userId === rep.id),
      )
    : [];
  const filteredTeams = localTeams.filter((team) => {
    const query = teamSearch.trim().toLowerCase();
    if (!query) return true;
    return `${team.name} ${team.description ?? ""} ${team.status}`
      .toLowerCase()
      .includes(query);
  });

  function resetMessage() {
    setError(null);
    setNotice(null);
  }

  function updateDraft(teamId: string, patch: Partial<TeamDraft>) {
    setDraftsByTeamId((current) => ({
      ...current,
      [teamId]: {
        name: current[teamId]?.name ?? "",
        description: current[teamId]?.description ?? "",
        status: current[teamId]?.status ?? "active",
        ...patch,
      },
    }));
  }

  async function handleCreateTeam() {
    const name = newTeam.name.trim();
    if (!name) {
      setError("Team name is required.");
      return;
    }

    resetMessage();
    setPendingKey("create-team");
    const result = await createTeamRequest(fetch, {
      name,
      description: newTeam.description,
    });
    setPendingKey(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLocalTeams((current) => sortTeamsByName([...current, result.data]));
    setDraftsByTeamId((current) => ({
      ...current,
      [result.data.id]: {
        name: result.data.name,
        description: result.data.description ?? "",
        status: result.data.status,
      },
    }));
    setNewTeam({ name: "", description: "" });
    setSelectedTeamId(result.data.id);
    setNotice("Team created.");
    router.refresh();
  }

  async function handleSaveTeam(teamId: string) {
    const draft = draftsByTeamId[teamId];
    if (!draft || !draft.name.trim()) {
      setError("Team name is required.");
      return;
    }

    resetMessage();
    setPendingKey(`save:${teamId}`);
    const result = await updateTeamRequest(fetch, teamId, {
      name: draft.name.trim(),
      description: draft.description,
      status: draft.status,
    });
    setPendingKey(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLocalTeams((current) =>
      sortTeamsByName(
        current.map((team) => (team.id === teamId ? result.data : team)),
      ),
    );
    setDraftsByTeamId((current) => ({
      ...current,
      [teamId]: {
        name: result.data.name,
        description: result.data.description ?? "",
        status: result.data.status,
      },
    }));
    setNotice("Team updated.");
    router.refresh();
  }

  async function handleAddMembership(
    teamId: string,
    membershipType: "manager" | "rep",
  ) {
    const selectedId =
      membershipType === "manager"
        ? managerSelectionByTeamId[teamId]
        : repSelectionByTeamId[teamId];

    if (!selectedId) {
      setError(`Select a ${membershipType} before adding.`);
      return;
    }

    resetMessage();
    setPendingKey(`add:${membershipType}:${teamId}`);
    const result = await addTeamMembershipRequest(fetch, teamId, {
      userId: selectedId,
      membershipType,
    });
    setPendingKey(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLocalMemberships((current) => {
      if (
        current.some(
          (membership) =>
            membership.teamId === teamId &&
            membership.userId === selectedId &&
            membership.membershipType === membershipType,
        )
      ) {
        return current;
      }

      return [
        ...current,
        {
          teamId,
          userId: selectedId,
          membershipType,
        },
      ];
    });
    if (membershipType === "manager") {
      setManagerSelectionByTeamId((current) => ({ ...current, [teamId]: "" }));
    } else {
      setRepSelectionByTeamId((current) => ({ ...current, [teamId]: "" }));
    }
    setNotice(`${membershipType === "manager" ? "Manager" : "Rep"} added.`);
    router.refresh();
  }

  async function handleRemoveMembership(
    teamId: string,
    userId: string,
    membershipType: "manager" | "rep",
  ) {
    resetMessage();
    setPendingKey(`remove:${membershipType}:${teamId}:${userId}`);
    const result = await removeTeamMembershipRequest(fetch, teamId, {
      userId,
      membershipType,
    });
    setPendingKey(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLocalMemberships((current) =>
      current.filter(
        (membership) =>
          !(
            membership.teamId === teamId &&
            membership.userId === userId &&
            membership.membershipType === membershipType
          ),
      ),
    );
    setNotice(`${membershipType === "manager" ? "Manager" : "Rep"} removed.`);
    router.refresh();
  }

  function renderMembershipTable(
    label: "Managers" | "Reps",
    selectedMembers: TeamMembership[],
    names: Map<string, string>,
    membershipType: "manager" | "rep",
  ) {
    if (!selectedTeam) return null;

    return (
      <SettingsTableShell>
        <ForgeManagementTable
          mobileCards={
            <ForgeMobileTableCards>
              {selectedMembers.length === 0 ? (
                <p className="text-sm text-[var(--forge-muted)]">
                  No {label.toLowerCase()} on this team yet.
                </p>
              ) : (
                selectedMembers.map((membership) => (
                  <div
                    className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4"
                    key={`${membership.teamId}:${membership.userId}:${membership.membershipType}:card`}
                  >
                    <p className="text-sm font-semibold text-[var(--forge-text)]">
                      {names.get(membership.userId) ?? membership.userId}
                    </p>
                    <ForgeButton
                      className="mt-3"
                      disabled={
                        pendingKey ===
                        `remove:${membershipType}:${selectedTeam.id}:${membership.userId}`
                      }
                      onClick={() => {
                        void handleRemoveMembership(
                          selectedTeam.id,
                          membership.userId,
                          membershipType,
                        );
                      }}
                      size="sm"
                      type="button"
                      variant="danger"
                    >
                      Remove
                    </ForgeButton>
                  </div>
                ))
              )}
            </ForgeMobileTableCards>
          }
        >
          <table className="w-full text-left text-sm">
            <thead className="text-xs font-medium text-[var(--forge-muted)]">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
              {selectedMembers.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-4 text-[var(--forge-muted)]"
                    colSpan={2}
                  >
                    No {label.toLowerCase()} on this team yet.
                  </td>
                </tr>
              ) : (
                selectedMembers.map((membership) => (
                  <tr
                    key={`${membership.teamId}:${membership.userId}:${membership.membershipType}`}
                  >
                    <td className="px-4 py-3 text-[var(--forge-text)]">
                      {names.get(membership.userId) ?? membership.userId}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--forge-muted)] transition hover:text-[var(--forge-danger)] disabled:opacity-50"
                        disabled={
                          pendingKey ===
                          `remove:${membershipType}:${selectedTeam.id}:${membership.userId}`
                        }
                        onClick={() => {
                          void handleRemoveMembership(
                            selectedTeam.id,
                            membership.userId,
                            membershipType,
                          );
                        }}
                        type="button"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ForgeManagementTable>
      </SettingsTableShell>
    );
  }

  const pendingStatusMessage = pendingKey
    ? pendingKey === "create-team"
      ? "Creating team."
      : pendingKey.startsWith("save:")
        ? "Saving team."
        : pendingKey.startsWith("add:")
          ? "Adding team member."
          : pendingKey.startsWith("remove:")
            ? "Removing team member."
            : "Updating team."
    : "";

  const teamControls = (
    <SettingsEditorDrawer data-teams-control-drawer="">
      <div className="space-y-5">
        <SettingsDrawerGroup label="Create team">
          <div className="space-y-3 rounded-2xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4">
            <label className="space-y-2 text-sm text-[var(--forge-muted)]">
              <span>Team name</span>
              <input
                className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                onChange={(event) =>
                  setNewTeam((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                value={newTeam.name}
              />
            </label>
            <label className="space-y-2 text-sm text-[var(--forge-muted)]">
              <span>Description</span>
              <input
                className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                onChange={(event) =>
                  setNewTeam((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                value={newTeam.description}
              />
            </label>
            <ForgeButton
              className="w-full"
              disabled={pendingKey === "create-team"}
              icon="add"
              onClick={() => {
                void handleCreateTeam();
              }}
              type="button"
              variant="primary"
            >
              {pendingKey === "create-team" ? "Creating..." : "Create team"}
            </ForgeButton>
          </div>
        </SettingsDrawerGroup>

        <SettingsDrawerGroup label="Select team">
          <label className="block px-3 pb-2 text-sm text-[var(--forge-muted)]">
            <span className="sr-only">Search teams</span>
            <input
              className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
              onChange={(event) => setTeamSearch(event.target.value)}
              placeholder="Search teams"
              value={teamSearch}
            />
          </label>
          {filteredTeams.length === 0 ? (
            <p className="px-3 text-sm text-[var(--forge-muted)]">
              No matching teams. Clear search or create one.
            </p>
          ) : (
            filteredTeams.map((team) => {
              const teamManagers = localMemberships.filter(
                (membership) =>
                  membership.teamId === team.id &&
                  membership.membershipType === "manager",
              );
              const teamReps = localMemberships.filter(
                (membership) =>
                  membership.teamId === team.id &&
                  membership.membershipType === "rep",
              );

              return (
                <SettingsDrawerButton
                  active={selectedTeam?.id === team.id}
                  icon="groups"
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  type="button"
                >
                  {team.name} · {teamManagers.length} managers ·{" "}
                  {teamReps.length} reps
                </SettingsDrawerButton>
              );
            })
          )}
        </SettingsDrawerGroup>
      </div>
    </SettingsEditorDrawer>
  );

  return (
    <SettingsEditorWorkbench
      data-teams-workspace="management"
      drawer={teamControls}
      workbench="teams"
    >
      <SettingsEditorPanel
        data-selected-team-editor={selectedTeam?.id ?? "none"}
        data-teams-editor=""
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--forge-muted)]">
              Selected team editor
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[var(--forge-text)]">
              {selectedTeam ? selectedTeam.name : "Create or select a team"}
            </h3>
            <p className="mt-2 text-sm text-[var(--forge-muted)]">
              Edit one team at a time, then manage its manager and rep
              membership below.
            </p>
          </div>
          <span className="rounded-full border border-[var(--forge-border-strong)]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--forge-muted)]">
            {localTeams.length} {localTeams.length === 1 ? "team" : "teams"}
          </span>
        </div>

        <div aria-live="polite" className="sr-only" role="status">
          {pendingStatusMessage}
        </div>

        {error ? (
          <ForgeStatusPanel
            announce="assertive"
            className="mt-4"
            description={error}
            icon="warning"
            title="Team update failed"
            tone="danger"
          />
        ) : null}
        {notice ? (
          <ForgeStatusPanel
            announce="polite"
            className="mt-4"
            description={notice}
            icon="check_circle"
            title="Team updated"
            tone="success"
          />
        ) : null}

        {!selectedTeam || !selectedDraft ? (
          <ForgeStatusPanel
            className="mt-6"
            description="Create a team in the drawer or select an existing team to edit metadata and membership."
            icon="groups"
            title="No team selected"
          />
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto]">
              <label className="space-y-2 text-sm text-[var(--forge-muted)]">
                <span>Team name</span>
                <input
                  className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  onChange={(event) =>
                    updateDraft(selectedTeam.id, { name: event.target.value })
                  }
                  value={selectedDraft.name}
                />
              </label>
              <label className="space-y-2 text-sm text-[var(--forge-muted)]">
                <span>Description</span>
                <input
                  className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  onChange={(event) =>
                    updateDraft(selectedTeam.id, {
                      description: event.target.value,
                    })
                  }
                  value={selectedDraft.description}
                />
              </label>
              <label className="space-y-2 text-sm text-[var(--forge-muted)]">
                <span>Status</span>
                <select
                  className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)] px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                  onChange={(event) =>
                    updateDraft(selectedTeam.id, { status: event.target.value })
                  }
                  value={selectedDraft.status}
                >
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <div className="flex items-end">
                <ForgeButton
                  disabled={pendingKey === `save:${selectedTeam.id}`}
                  onClick={() => {
                    void handleSaveTeam(selectedTeam.id);
                  }}
                  type="button"
                  variant="primary"
                >
                  {pendingKey === `save:${selectedTeam.id}`
                    ? "Saving..."
                    : "Save team"}
                </ForgeButton>
              </div>
            </div>

            <p className="text-xs text-[var(--forge-muted)]">
              Team membership is managed here. Rep-level primary manager
              assignments stay on{" "}
              <a
                className="underline hover:text-[var(--forge-text)]"
                href="/settings/permissions"
              >
                /settings/permissions
              </a>
              .
            </p>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)]/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--forge-muted)]">
                      Managers
                    </p>
                    <p className="mt-1 text-sm text-[var(--forge-muted)]">
                      Team-level coaching and management membership.
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--forge-muted)]">
                    {selectedTeamManagers.length}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Add manager</span>
                    <select
                      className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                      onChange={(event) =>
                        setManagerSelectionByTeamId((current) => ({
                          ...current,
                          [selectedTeam.id]: event.target.value,
                        }))
                      }
                      value={managerSelectionByTeamId[selectedTeam.id] ?? ""}
                    >
                      <option value="">Select manager</option>
                      {availableManagers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ForgeButton
                    disabled={pendingKey === `add:manager:${selectedTeam.id}`}
                    onClick={() => {
                      void handleAddMembership(selectedTeam.id, "manager");
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Add manager
                  </ForgeButton>
                </div>
                <div className="mt-4">
                  {renderMembershipTable(
                    "Managers",
                    selectedTeamManagers,
                    managerNames,
                    "manager",
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)]/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[var(--forge-muted)]">
                      Reps
                    </p>
                    <p className="mt-1 text-sm text-[var(--forge-muted)]">
                      Sales reps assigned to this team.
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--forge-muted)]">
                    {selectedTeamReps.length}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Add rep</span>
                    <select
                      className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60"
                      onChange={(event) =>
                        setRepSelectionByTeamId((current) => ({
                          ...current,
                          [selectedTeam.id]: event.target.value,
                        }))
                      }
                      value={repSelectionByTeamId[selectedTeam.id] ?? ""}
                    >
                      <option value="">Select rep</option>
                      {availableReps.map((rep) => (
                        <option key={rep.id} value={rep.id}>
                          {rep.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <ForgeButton
                    disabled={pendingKey === `add:rep:${selectedTeam.id}`}
                    onClick={() => {
                      void handleAddMembership(selectedTeam.id, "rep");
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Add rep
                  </ForgeButton>
                </div>
                <div className="mt-4">
                  {renderMembershipTable(
                    "Reps",
                    selectedTeamReps,
                    repNames,
                    "rep",
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </SettingsEditorPanel>
    </SettingsEditorWorkbench>
  );
}
