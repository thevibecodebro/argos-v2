"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

type RequestResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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
    return { ok: false, error: readError(data, "Unable to remove team member") };
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
  const [draftsByTeamId, setDraftsByTeamId] = useState<Record<string, TeamDraft>>(
    () => buildDrafts(teams),
  );
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });
  const [managerSelectionByTeamId, setManagerSelectionByTeamId] = useState<Record<string, string>>(
    {},
  );
  const [repSelectionByTeamId, setRepSelectionByTeamId] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const managerNames = memberNameById(managers);
  const repNames = memberNameById(reps);

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

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[#45484f]/10 bg-[#10131a] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9abb3]">
              Teams
            </p>
            <p className="mt-2 text-sm text-[#a9abb3]">
              Create teams, edit team metadata, and manage manager and rep membership.
            </p>
          </div>
          <span className="rounded-full border border-[#45484f]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a9abb3]">
            {localTeams.length} {localTeams.length === 1 ? "team" : "teams"}
          </span>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {notice}
          </div>
        ) : null}

        <div className="mt-5 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Create team</p>
              <p className="mt-1 text-sm text-[#a9abb3]">
                Teams define the manager and rep roster. Rep-level primary manager assignments still
                live in{" "}
                <a className="underline hover:text-white" href="/settings/permissions">
                  /settings/permissions
                </a>
                .
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <label className="space-y-2 text-sm text-[#a9abb3]">
              <span>Team name</span>
              <input
                className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-2 text-sm text-white outline-none transition focus:border-[#74b1ff]/60"
                onChange={(event) =>
                  setNewTeam((current) => ({ ...current, name: event.target.value }))
                }
                value={newTeam.name}
              />
            </label>
            <label className="space-y-2 text-sm text-[#a9abb3]">
              <span>Description</span>
              <input
                className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-2 text-sm text-white outline-none transition focus:border-[#74b1ff]/60"
                onChange={(event) =>
                  setNewTeam((current) => ({ ...current, description: event.target.value }))
                }
                value={newTeam.description}
              />
            </label>
            <div className="flex items-end">
              <button
                className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-2 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
                disabled={pendingKey === "create-team"}
                onClick={() => {
                  void handleCreateTeam();
                }}
                type="button"
              >
                {pendingKey === "create-team" ? "Creating..." : "Create team"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {localTeams.length === 0 ? (
            <div className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-5 py-6 text-center">
              <p className="text-sm font-medium text-[#ecedf6]">No teams yet</p>
              <p className="mt-2 text-sm text-[#a9abb3]">
                Create your first team above to start organizing managers and reps.
              </p>
            </div>
          ) : (
            localTeams.map((team) => {
              const draft = draftsByTeamId[team.id] ?? {
                name: team.name,
                description: team.description ?? "",
                status: team.status,
              };
              const teamManagers = localMemberships.filter(
                (membership) =>
                  membership.teamId === team.id && membership.membershipType === "manager",
              );
              const teamReps = localMemberships.filter(
                (membership) =>
                  membership.teamId === team.id && membership.membershipType === "rep",
              );
              const availableManagers = managers.filter(
                (manager) =>
                  !teamManagers.some((membership) => membership.userId === manager.id),
              );
              const availableReps = reps.filter(
                (rep) => !teamReps.some((membership) => membership.userId === rep.id),
              );

              return (
                <section
                  className="rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 p-4"
                  key={team.id}
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto]">
                    <label className="space-y-2 text-sm text-[#a9abb3]">
                      <span>Team name</span>
                      <input
                        className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-2 text-sm text-white outline-none transition focus:border-[#74b1ff]/60"
                        onChange={(event) =>
                          updateDraft(team.id, { name: event.target.value })
                        }
                        value={draft.name}
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[#a9abb3]">
                      <span>Description</span>
                      <input
                        className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-2 text-sm text-white outline-none transition focus:border-[#74b1ff]/60"
                        onChange={(event) =>
                          updateDraft(team.id, { description: event.target.value })
                        }
                        value={draft.description}
                      />
                    </label>
                    <label className="space-y-2 text-sm text-[#a9abb3]">
                      <span>Status</span>
                      <select
                        className="w-full rounded-xl border border-[#45484f]/20 bg-[#10131a] px-3 py-2 text-sm text-white outline-none transition focus:border-[#74b1ff]/60"
                        onChange={(event) =>
                          updateDraft(team.id, { status: event.target.value })
                        }
                        value={draft.status}
                      >
                        <option value="active">active</option>
                        <option value="archived">archived</option>
                      </select>
                    </label>
                    <div className="flex items-end">
                      <button
                        className="rounded-xl bg-gradient-to-r from-[#74b1ff] to-[#54a3ff] px-4 py-2 text-sm font-semibold text-[#002345] transition hover:brightness-110 disabled:opacity-50"
                        disabled={pendingKey === `save:${team.id}`}
                        onClick={() => {
                          void handleSaveTeam(team.id);
                        }}
                        type="button"
                      >
                        {pendingKey === `save:${team.id}` ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-[#a9abb3]">
                    Team membership is managed here. Rep-level primary manager assignments stay on{" "}
                    <a className="underline hover:text-white" href="/settings/permissions">
                      /settings/permissions
                    </a>
                    .
                  </p>

                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    <div className="rounded-xl border border-[#45484f]/20 bg-[#10131a]/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">
                            Managers
                          </p>
                          <p className="mt-1 text-sm text-[#a9abb3]">
                            Team-level coaching and management membership.
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.18em] text-[#a9abb3]">
                          {teamManagers.length}
                        </span>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <select
                          className="min-w-0 flex-1 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-3 py-2 text-sm text-white outline-none transition focus:border-[#74b1ff]/60"
                          onChange={(event) =>
                            setManagerSelectionByTeamId((current) => ({
                              ...current,
                              [team.id]: event.target.value,
                            }))
                          }
                          value={managerSelectionByTeamId[team.id] ?? ""}
                        >
                          <option value="">Select manager</option>
                          {availableManagers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {manager.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-xl border border-[#74b1ff]/20 px-3 py-2 text-sm font-semibold text-[#74b1ff] transition hover:bg-[#74b1ff]/10 disabled:opacity-50"
                          disabled={pendingKey === `add:manager:${team.id}`}
                          onClick={() => {
                            void handleAddMembership(team.id, "manager");
                          }}
                          type="button"
                        >
                          Add
                        </button>
                      </div>

                      <ul className="mt-4 space-y-2">
                        {teamManagers.length === 0 ? (
                          <li className="text-sm text-[#a9abb3]">No managers on this team yet.</li>
                        ) : (
                          teamManagers.map((membership) => (
                            <li
                              className="flex items-center justify-between gap-3 rounded-lg border border-[#45484f]/20 bg-[#161a21]/50 px-3 py-2 text-sm text-[#ecedf6]"
                              key={`${membership.teamId}:${membership.userId}:${membership.membershipType}`}
                            >
                              <span>{managerNames.get(membership.userId) ?? membership.userId}</span>
                              <button
                                className="text-xs font-medium uppercase tracking-[0.14em] text-[#a9abb3] transition hover:text-red-300"
                                disabled={
                                  pendingKey ===
                                  `remove:manager:${team.id}:${membership.userId}`
                                }
                                onClick={() => {
                                  void handleRemoveMembership(
                                    team.id,
                                    membership.userId,
                                    "manager",
                                  );
                                }}
                                type="button"
                              >
                                Remove
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    <div className="rounded-xl border border-[#45484f]/20 bg-[#10131a]/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a9abb3]">
                            Reps
                          </p>
                          <p className="mt-1 text-sm text-[#a9abb3]">
                            Sales reps assigned to this team.
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-[0.18em] text-[#a9abb3]">
                          {teamReps.length}
                        </span>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <select
                          className="min-w-0 flex-1 rounded-xl border border-[#45484f]/20 bg-[#161a21]/50 px-3 py-2 text-sm text-white outline-none transition focus:border-[#74b1ff]/60"
                          onChange={(event) =>
                            setRepSelectionByTeamId((current) => ({
                              ...current,
                              [team.id]: event.target.value,
                            }))
                          }
                          value={repSelectionByTeamId[team.id] ?? ""}
                        >
                          <option value="">Select rep</option>
                          {availableReps.map((rep) => (
                            <option key={rep.id} value={rep.id}>
                              {rep.name}
                            </option>
                          ))}
                        </select>
                        <button
                          className="rounded-xl border border-[#74b1ff]/20 px-3 py-2 text-sm font-semibold text-[#74b1ff] transition hover:bg-[#74b1ff]/10 disabled:opacity-50"
                          disabled={pendingKey === `add:rep:${team.id}`}
                          onClick={() => {
                            void handleAddMembership(team.id, "rep");
                          }}
                          type="button"
                        >
                          Add
                        </button>
                      </div>

                      <ul className="mt-4 space-y-2">
                        {teamReps.length === 0 ? (
                          <li className="text-sm text-[#a9abb3]">No reps on this team yet.</li>
                        ) : (
                          teamReps.map((membership) => (
                            <li
                              className="flex items-center justify-between gap-3 rounded-lg border border-[#45484f]/20 bg-[#161a21]/50 px-3 py-2 text-sm text-[#ecedf6]"
                              key={`${membership.teamId}:${membership.userId}:${membership.membershipType}`}
                            >
                              <span>{repNames.get(membership.userId) ?? membership.userId}</span>
                              <button
                                className="text-xs font-medium uppercase tracking-[0.14em] text-[#a9abb3] transition hover:text-red-300"
                                disabled={
                                  pendingKey === `remove:rep:${team.id}:${membership.userId}`
                                }
                                onClick={() => {
                                  void handleRemoveMembership(
                                    team.id,
                                    membership.userId,
                                    "rep",
                                  );
                                }}
                                type="button"
                              >
                                Remove
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
