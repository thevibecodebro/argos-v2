"use client";

import { useMemo, useState } from "react";

type TeamRecord = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

type ManagerRecord = {
  id: string;
  name: string;
};

type RepRecord = {
  id: string;
  name: string;
  primaryManagerId: string | null;
};

type MembershipRecord = {
  teamId: string;
  userId: string;
  membershipType: "manager" | "rep";
};

type TeamAccessPanelProps = {
  canManage: boolean;
  teams: TeamRecord[];
  managers: ManagerRecord[];
  reps: RepRecord[];
  memberships: MembershipRecord[];
};

type SnapshotPayload = {
  teams: TeamRecord[];
  managers: ManagerRecord[];
  reps: RepRecord[];
  memberships: MembershipRecord[];
};

const PRESET_LABELS = ["Coach", "Training Manager", "Team Lead"] as const;

function readError(payload: unknown, fallback: string) {
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

export function TeamAccessPanel({
  canManage,
  teams: initialTeams,
  managers: initialManagers,
  reps: initialReps,
  memberships: initialMemberships,
}: TeamAccessPanelProps) {
  const [teams, setTeams] = useState(initialTeams);
  const [managers, setManagers] = useState(initialManagers);
  const [reps, setReps] = useState(initialReps);
  const [memberships, setMemberships] = useState(initialMemberships);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [selectedManagerToAdd, setSelectedManagerToAdd] = useState<Record<string, string>>({});
  const [selectedRepToAdd, setSelectedRepToAdd] = useState<Record<string, string>>({});
  const [selectedPresetByKey, setSelectedPresetByKey] = useState<Record<string, string>>({});
  const [selectedPrimaryManagerByRepId, setSelectedPrimaryManagerByRepId] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const managerNameById = useMemo(
    () => new Map(managers.map((manager) => [manager.id, manager.name])),
    [managers],
  );
  const repNameById = useMemo(
    () => new Map(reps.map((rep) => [rep.id, rep.name])),
    [reps],
  );
  const membershipsByTeamId = useMemo(() => {
    const map = new Map<string, MembershipRecord[]>();
    for (const membership of memberships) {
      const current = map.get(membership.teamId) ?? [];
      current.push(membership);
      map.set(membership.teamId, current);
    }
    return map;
  }, [memberships]);

  function applySnapshot(snapshot: SnapshotPayload) {
    setTeams(snapshot.teams);
    setManagers(snapshot.managers);
    setReps(snapshot.reps);
    setMemberships(snapshot.memberships);
  }

  function updateLocalTeam(teamId: string, patch: Partial<TeamRecord>) {
    setTeams((current) =>
      current.map((team) => (team.id === teamId ? { ...team, ...patch } : team)),
    );
  }

  async function createTeam() {
    setError(null);
    setNotice(null);
    setPendingKey("create-team");

    const response = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTeamName,
        description: newTeamDescription,
      }),
    });
    const payload = (await response.json()) as TeamRecord | { error?: string };

    if (!response.ok) {
      setError(readError(payload, "Unable to create team"));
      setPendingKey(null);
      return;
    }

    setTeams((current) => [...current, payload as TeamRecord].sort((a, b) => a.name.localeCompare(b.name)));
    setNewTeamName("");
    setNewTeamDescription("");
    setNotice("Team created.");
    setPendingKey(null);
  }

  async function saveTeam(team: TeamRecord) {
    setError(null);
    setNotice(null);
    setPendingKey(`save-team:${team.id}`);

    const response = await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: team.name,
        description: team.description,
        status: team.status,
      }),
    });
    const payload = (await response.json()) as TeamRecord | { error?: string };

    if (!response.ok) {
      setError(readError(payload, "Unable to update team"));
      setPendingKey(null);
      return;
    }

    setTeams((current) =>
      current
        .map((entry) => (entry.id === team.id ? (payload as TeamRecord) : entry))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setNotice("Team updated.");
    setPendingKey(null);
  }

  async function addMembership(teamId: string, membershipType: "manager" | "rep", userId: string) {
    if (!userId) {
      return;
    }

    setError(null);
    setNotice(null);
    setPendingKey(`add:${membershipType}:${teamId}:${userId}`);

    const response = await fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        membershipType,
      }),
    });
    const payload = (await response.json()) as SnapshotPayload | { error?: string };

    if (!response.ok) {
      setError(readError(payload, "Unable to update team membership"));
      setPendingKey(null);
      return;
    }

    applySnapshot(payload as SnapshotPayload);
    if (membershipType === "manager") {
      setSelectedManagerToAdd((current) => ({ ...current, [teamId]: "" }));
    } else {
      setSelectedRepToAdd((current) => ({ ...current, [teamId]: "" }));
    }
    setNotice("Team membership updated.");
    setPendingKey(null);
  }

  async function removeMembership(teamId: string, membershipType: "manager" | "rep", userId: string) {
    setError(null);
    setNotice(null);
    setPendingKey(`remove:${membershipType}:${teamId}:${userId}`);

    const response = await fetch(`/api/teams/${teamId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        membershipType,
      }),
    });
    const payload = (await response.json()) as SnapshotPayload | { error?: string };

    if (!response.ok) {
      setError(readError(payload, "Unable to remove team membership"));
      setPendingKey(null);
      return;
    }

    applySnapshot(payload as SnapshotPayload);
    setNotice("Team membership removed.");
    setPendingKey(null);
  }

  async function applyPreset(teamId: string, managerId: string) {
    const preset = selectedPresetByKey[`${teamId}:${managerId}`];
    if (!preset) {
      return;
    }

    setError(null);
    setNotice(null);
    setPendingKey(`preset:${teamId}:${managerId}`);

    const response = await fetch(`/api/teams/${teamId}/grants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId,
        preset,
      }),
    });
    const payload = (await response.json()) as { grants?: string[]; error?: string };

    if (!response.ok) {
      setError(readError(payload, "Unable to apply permission preset"));
      setPendingKey(null);
      return;
    }

    setNotice(`Applied ${preset} preset.`);
    setPendingKey(null);
  }

  async function assignPrimaryManager(repId: string) {
    const managerId = selectedPrimaryManagerByRepId[repId] ?? "";

    setError(null);
    setNotice(null);
    setPendingKey(`primary-manager:${repId}`);

    const response = await fetch(`/api/organizations/members/${repId}/primary-manager`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    });
    const payload = (await response.json()) as { managerId?: string; error?: string };

    if (!response.ok) {
      setError(readError(payload, "Unable to assign primary manager"));
      setPendingKey(null);
      return;
    }

    setReps((current) =>
      current.map((rep) =>
        rep.id === repId ? { ...rep, primaryManagerId: payload.managerId ?? managerId } : rep,
      ),
    );
    setNotice("Primary manager updated.");
    setPendingKey(null);
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-800/70 bg-[#0c1629] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Workspace
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">Team Access</h2>
          <p className="mt-2 text-sm text-slate-400">
            Create teams, manage memberships, assign accountable managers, and apply manager presets.
          </p>
        </div>
        <span className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {teams.length} teams
        </span>
      </div>

      {!canManage ? (
        <p className="mt-5 text-sm text-slate-400">Only admins can manage teams and grants.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {error ? (
            <div className="rounded-[1rem] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="rounded-[1rem] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {notice}
            </div>
          ) : null}

          <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4">
            <p className="text-sm font-semibold text-slate-200">Create team</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <input
                className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60"
                onChange={(event) => setNewTeamName(event.target.value)}
                placeholder="New team name"
                value={newTeamName}
              />
              <input
                className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60"
                onChange={(event) => setNewTeamDescription(event.target.value)}
                placeholder="Description"
                value={newTeamDescription}
              />
              <button
                className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
                disabled={pendingKey === "create-team"}
                onClick={() => {
                  void createTeam();
                }}
                type="button"
              >
                {pendingKey === "create-team" ? "Creating..." : "Create team"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              {teams.length ? (
                teams.map((team) => {
                  const teamMemberships = membershipsByTeamId.get(team.id) ?? [];
                  const teamManagerMemberships = teamMemberships.filter(
                    (membership) => membership.membershipType === "manager",
                  );
                  const teamRepMemberships = teamMemberships.filter(
                    (membership) => membership.membershipType === "rep",
                  );
                  const availableManagers = managers.filter(
                    (manager) =>
                      !teamManagerMemberships.some((membership) => membership.userId === manager.id),
                  );
                  const availableReps = reps.filter(
                    (rep) => !teamRepMemberships.some((membership) => membership.userId === rep.id),
                  );

                  return (
                    <article
                      className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4"
                      key={team.id}
                    >
                      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                        <input
                          className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60"
                          onChange={(event) => updateLocalTeam(team.id, { name: event.target.value })}
                          value={team.name}
                        />
                        <input
                          className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60"
                          onChange={(event) =>
                            updateLocalTeam(team.id, { description: event.target.value || null })
                          }
                          value={team.description ?? ""}
                        />
                        <div className="flex gap-2">
                          <select
                            className="rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60"
                            onChange={(event) => updateLocalTeam(team.id, { status: event.target.value })}
                            value={team.status}
                          >
                            <option value="active">active</option>
                            <option value="archived">archived</option>
                          </select>
                          <button
                            className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
                            disabled={pendingKey === `save-team:${team.id}`}
                            onClick={() => {
                              void saveTeam(team);
                            }}
                            type="button"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-3">
                          <p className="text-sm font-semibold text-white">Managers</p>
                          {teamManagerMemberships.length ? (
                            teamManagerMemberships.map((membership) => {
                              const key = `${team.id}:${membership.userId}`;
                              return (
                                <div className="rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-3" key={key}>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-slate-200">
                                      {managerNameById.get(membership.userId) ?? "Unknown manager"}
                                    </span>
                                    <button
                                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                                      disabled={pendingKey === `remove:manager:${team.id}:${membership.userId}`}
                                      onClick={() => {
                                        void removeMembership(team.id, "manager", membership.userId);
                                      }}
                                      type="button"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <div className="mt-3 flex gap-2">
                                    <select
                                      className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60"
                                      onChange={(event) =>
                                        setSelectedPresetByKey((current) => ({
                                          ...current,
                                          [key]: event.target.value,
                                        }))
                                      }
                                      value={selectedPresetByKey[key] ?? ""}
                                    >
                                      <option value="">Select preset</option>
                                      {PRESET_LABELS.map((preset) => (
                                        <option key={preset} value={preset}>
                                          {preset}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      className="rounded-lg border border-blue-500/30 bg-blue-600/15 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
                                      disabled={pendingKey === `preset:${team.id}:${membership.userId}`}
                                      onClick={() => {
                                        void applyPreset(team.id, membership.userId);
                                      }}
                                      type="button"
                                    >
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-slate-400">No managers assigned yet.</p>
                          )}
                          <div className="flex gap-2">
                            <select
                              className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60"
                              onChange={(event) =>
                                setSelectedManagerToAdd((current) => ({
                                  ...current,
                                  [team.id]: event.target.value,
                                }))
                              }
                              value={selectedManagerToAdd[team.id] ?? ""}
                            >
                              <option value="">Add manager</option>
                              {availableManagers.map((manager) => (
                                <option key={manager.id} value={manager.id}>
                                  {manager.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="rounded-lg border border-blue-500/30 bg-blue-600/15 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
                              disabled={pendingKey === `add:manager:${team.id}:${selectedManagerToAdd[team.id] ?? ""}`}
                              onClick={() => {
                                void addMembership(team.id, "manager", selectedManagerToAdd[team.id] ?? "");
                              }}
                              type="button"
                            >
                              Add manager
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-3">
                          <p className="text-sm font-semibold text-white">Reps</p>
                          {teamRepMemberships.length ? (
                            teamRepMemberships.map((membership) => (
                              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-3" key={`${team.id}:${membership.userId}`}>
                                <span className="text-sm text-slate-200">
                                  {repNameById.get(membership.userId) ?? "Unknown rep"}
                                </span>
                                <button
                                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                                  disabled={pendingKey === `remove:rep:${team.id}:${membership.userId}`}
                                  onClick={() => {
                                    void removeMembership(team.id, "rep", membership.userId);
                                  }}
                                  type="button"
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-slate-400">No reps assigned yet.</p>
                          )}
                          <div className="flex gap-2">
                            <select
                              className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60"
                              onChange={(event) =>
                                setSelectedRepToAdd((current) => ({
                                  ...current,
                                  [team.id]: event.target.value,
                                }))
                              }
                              value={selectedRepToAdd[team.id] ?? ""}
                            >
                              <option value="">Add rep</option>
                              {availableReps.map((rep) => (
                                <option key={rep.id} value={rep.id}>
                                  {rep.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="rounded-lg border border-blue-500/30 bg-blue-600/15 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
                              disabled={pendingKey === `add:rep:${team.id}:${selectedRepToAdd[team.id] ?? ""}`}
                              onClick={() => {
                                void addMembership(team.id, "rep", selectedRepToAdd[team.id] ?? "");
                              }}
                              type="button"
                            >
                              Add rep
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-slate-700/70 bg-slate-950/15 px-4 py-5 text-sm text-slate-400">
                  No teams created yet. Start by grouping setters, closers, or pods into team buckets.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4">
                <p className="text-sm font-semibold text-slate-200">Primary manager</p>
                <p className="mt-1 text-sm text-slate-400">
                  Assign one accountable owner per rep while preserving multi-team memberships.
                </p>
                <div className="mt-4 space-y-3">
                  {reps.length ? (
                    reps.map((rep) => (
                      <div
                        className="rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-3"
                        key={rep.id}
                      >
                        <p className="text-sm font-medium text-white">{rep.name}</p>
                        <div className="mt-3 flex gap-2">
                          <select
                            className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-500/60"
                            onChange={(event) =>
                              setSelectedPrimaryManagerByRepId((current) => ({
                                ...current,
                                [rep.id]: event.target.value,
                              }))
                            }
                            value={selectedPrimaryManagerByRepId[rep.id] ?? rep.primaryManagerId ?? ""}
                          >
                            <option value="">Select manager</option>
                            {managers.map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.name}
                              </option>
                            ))}
                          </select>
                          <button
                            className="rounded-lg border border-blue-500/30 bg-blue-600/15 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-600/25 disabled:opacity-50"
                            disabled={pendingKey === `primary-manager:${rep.id}`}
                            onClick={() => {
                              void assignPrimaryManager(rep.id);
                            }}
                            type="button"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No reps are available for manager assignment yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[1.2rem] border border-slate-800/70 bg-slate-950/20 px-4 py-4">
                <p className="text-sm font-semibold text-slate-200">Permission presets</p>
                <p className="mt-1 text-sm text-slate-400">
                  Use simple presets before reaching for custom per-team overrides.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PRESET_LABELS.map((preset) => (
                    <span
                      className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-medium text-slate-300"
                      key={preset}
                    >
                      {preset}
                    </span>
                  ))}
                </div>
                <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/30 px-3 py-3 text-sm text-slate-400">
                  Managers must be added to a team before a preset can be applied.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
