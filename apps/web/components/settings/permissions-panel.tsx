"use client";

import { useState } from "react";
import type { TeamPermissionKey } from "@/lib/access/permissions";

type Preset = {
  id: string;
  name: string;
  role: string;
  permissions: string[];
};

type Team = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

type TeamMembership = {
  teamId: string;
  userId: string;
  membershipType: "manager" | "rep";
};

type TeamGrant = {
  teamId: string;
  userId: string;
  permissionKey: TeamPermissionKey;
};

type PermissionsPanelProps = {
  teams: Team[];
  memberships: TeamMembership[];
  grants: TeamGrant[];
  reps: Array<{ id: string; name: string; primaryManagerId: string | null }>;
  managers: Array<{ id: string; name: string }>;
  presets: Preset[];
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

export async function assignPrimaryManagerRequest(
  fetchFn: FetchFn,
  repId: string,
  managerId: string,
): Promise<RequestResult<{ managerId?: string }>> {
  const response = await fetchFn(`/api/organizations/members/${repId}/primary-manager`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ managerId }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    return {
      ok: false,
      error: readError(payload, "Unable to assign primary manager"),
    };
  }

  return { ok: true, data: (payload as { managerId?: string }) ?? {} };
}

export async function applyTeamPresetRequest(
  fetchFn: FetchFn,
  teamId: string,
  managerId: string,
  preset: string | null,
): Promise<RequestResult<{ grants?: string[] }>> {
  const response = await fetchFn(`/api/teams/${teamId}/grants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ managerId, preset }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    return {
      ok: false,
      error: readError(payload, "Unable to apply permission preset"),
    };
  }

  return { ok: true, data: (payload as { grants?: string[] }) ?? {} };
}

function resolvePresetName(
  teamId: string,
  managerId: string,
  grants: TeamGrant[],
  presets: Preset[],
): string | null {
  const currentKeys = grants
    .filter((grant) => grant.teamId === teamId && grant.userId === managerId)
    .map((grant) => grant.permissionKey)
    .sort();

  if (currentKeys.length === 0) {
    return null;
  }

  const matchedPreset = presets.find((preset) => {
    const presetKeys = [...preset.permissions].sort();
    return (
      presetKeys.length === currentKeys.length &&
      presetKeys.every((permissionKey, index) => permissionKey === currentKeys[index])
    );
  });

  return matchedPreset?.name ?? "Custom";
}

export function PermissionsPanel({
  teams,
  memberships,
  grants,
  reps,
  managers,
  presets,
}: PermissionsPanelProps) {
  const [localReps, setLocalReps] = useState(reps);
  const [localGrants, setLocalGrants] = useState(grants);
  const [stagedManagerByRepId, setStagedManagerByRepId] = useState<Record<string, string>>({});
  const [stagedPresetByKey, setStagedPresetByKey] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function applyPrimaryManager(repId: string) {
    const managerId = stagedManagerByRepId[repId];
    if (!managerId) return;

    setError(null);
    setNotice(null);
    setPendingKey(`rep:${repId}`);

    const result = await assignPrimaryManagerRequest(fetch, repId, managerId);
    setPendingKey(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLocalReps((current) =>
      current.map((rep) =>
        rep.id === repId
          ? { ...rep, primaryManagerId: result.data.managerId ?? managerId }
          : rep,
      ),
    );
    setStagedManagerByRepId((current) => {
      const next = { ...current };
      delete next[repId];
      return next;
    });
    setNotice("Primary manager updated.");
  }

  async function applyPreset(teamId: string, managerId: string) {
    const stateKey = `${teamId}:${managerId}`;
    const preset = stagedPresetByKey[stateKey];
    if (!(stateKey in stagedPresetByKey)) return;

    setError(null);
    setNotice(null);
    setPendingKey(`preset:${stateKey}`);

    const shouldClearPreset = preset === "";
    const result = await applyTeamPresetRequest(
      fetch,
      teamId,
      managerId,
      shouldClearPreset ? null : preset,
    );
    setPendingKey(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const selectedPreset = presets.find((entry) => entry.id === preset);
    if (!shouldClearPreset && !selectedPreset) {
      setError("Unknown preset selected.");
      return;
    }
    const nextPermissionKeys = shouldClearPreset
      ? []
      : (selectedPreset?.permissions ?? []).map((permissionKey) => ({
          teamId,
          userId: managerId,
          permissionKey: permissionKey as TeamPermissionKey,
        }));

    setLocalGrants((current) => {
      const remaining = current.filter(
        (grant) => !(grant.teamId === teamId && grant.userId === managerId),
      );
      return [...remaining, ...nextPermissionKeys];
    });
    setStagedPresetByKey((current) => {
      const next = { ...current };
      delete next[stateKey];
      return next;
    });
    setNotice(shouldClearPreset ? "Permission preset cleared." : "Permission preset updated.");
  }

  const hasStagedManager = (repId: string) => repId in stagedManagerByRepId;
  const hasStagedPreset = (stateKey: string) => stateKey in stagedPresetByKey;

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
          Permission Presets
        </p>
        <p className="mt-2 text-sm text-[var(--forge-muted)]">
          Predefined permission bundles you can apply to managers per team.
        </p>

        {presets.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--forge-muted)]">No permission presets configured.</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {presets.map((preset) => (
              <div
                className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-4"
                key={preset.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{preset.name}</p>
                  <span className="shrink-0 rounded-full border border-[var(--forge-gold)]/20 bg-[var(--forge-gold)]/8 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--forge-gold)]">
                    {preset.role}
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {preset.permissions.map((permission) => (
                    <li
                      className="flex items-center gap-2 text-xs text-[var(--forge-muted)]"
                      key={permission}
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-[rgba(255,244,230,0.46)]" />
                      {permission}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
          Team Preset Assignments
        </p>
        <p className="mt-2 text-sm text-[var(--forge-muted)]">
          Apply a permission preset to each manager membership on a team.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-[rgba(255,113,108,0.26)] bg-[rgba(255,113,108,0.1)] px-4 py-3 text-sm text-[var(--forge-danger)]">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mt-4 rounded-xl border border-[rgba(139,215,168,0.24)] bg-[rgba(139,215,168,0.1)] px-4 py-3 text-sm text-[var(--forge-success)]">
            {notice}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {teams.length === 0 ? (
            <p className="text-sm text-[var(--forge-muted)]">No teams available for preset assignment yet.</p>
          ) : (
            teams.map((team) => {
              const teamManagers = memberships.filter(
                (membership) =>
                  membership.teamId === team.id && membership.membershipType === "manager",
              );

              return (
                <div
                  className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-4"
                  key={team.id}
                >
                  <p className="text-sm font-semibold text-white">{team.name}</p>
                  {team.description ? (
                    <p className="mt-1 text-xs text-[var(--forge-muted)]">{team.description}</p>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {teamManagers.length === 0 ? (
                      <p className="text-sm text-[var(--forge-muted)]">
                        No managers on this team yet. Add team membership from /settings/teams.
                      </p>
                    ) : (
                      teamManagers.map((membership) => {
                        const stateKey = `${team.id}:${membership.userId}`;
                        const currentPreset =
                          stagedPresetByKey[stateKey] ??
                          resolvePresetName(team.id, membership.userId, localGrants, presets) ??
                          "";
                        const currentLabel =
                          resolvePresetName(team.id, membership.userId, localGrants, presets) ??
                          "No preset applied";

                        return (
                          <div
                            className="flex flex-col gap-3 rounded-lg border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface)]/60 px-3 py-3 md:flex-row md:items-center md:justify-between"
                            key={stateKey}
                          >
                            <div>
                              <p className="text-sm font-medium text-white">
                                {managers.find((manager) => manager.id === membership.userId)?.name ??
                                  membership.userId}
                              </p>
                              <p className="mt-1 text-xs text-[var(--forge-muted)]">
                                Current preset: {currentLabel}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--forge-gold)]/60 disabled:opacity-50"
                                disabled={pendingKey === `preset:${stateKey}`}
                                onChange={(event) => {
                                  setStagedPresetByKey((current) => ({
                                    ...current,
                                    [stateKey]: event.target.value,
                                  }));
                                }}
                                value={currentPreset}
                              >
                                <option value="">Select preset</option>
                                {presets.map((preset) => (
                                  <option key={preset.id} value={preset.id}>
                                    {preset.name}
                                  </option>
                                ))}
                              </select>
                              {hasStagedPreset(stateKey) ? (
                                <button
                                  className="rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-3 py-2 text-sm font-semibold text-[#170d07] transition hover:brightness-110 disabled:opacity-50"
                                  disabled={pendingKey === `preset:${stateKey}`}
                                  onClick={() => {
                                    void applyPreset(team.id, membership.userId);
                                  }}
                                  type="button"
                                >
                                  {pendingKey === `preset:${stateKey}` ? "Saving..." : "Apply"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[var(--forge-border-strong)]/10 bg-[var(--forge-surface)] p-6 shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--forge-muted)]">
          Primary Manager
        </p>
        <p className="mt-2 text-sm text-[var(--forge-muted)]">
          Assign one accountable manager per rep while preserving multi-team memberships.
        </p>

        {localReps.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--forge-muted)]">
            No reps are available for manager assignment yet.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {localReps.map((rep) => {
              const currentManagerId =
                stagedManagerByRepId[rep.id] ?? rep.primaryManagerId ?? "";
              const assignedManager = managers.find((manager) => manager.id === rep.primaryManagerId);
              const isPending = pendingKey === `rep:${rep.id}`;

              return (
                <div
                  className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-4"
                  key={rep.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{rep.name}</p>
                      <p className="mt-1 text-xs text-[var(--forge-muted)]">
                        {assignedManager ? (
                          <span>Current: {assignedManager.name}</span>
                        ) : (
                          <span className="text-[var(--forge-ember)]">No manager assigned</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--forge-gold)]/60 disabled:opacity-50"
                        disabled={isPending}
                        onChange={(event) => {
                          setStagedManagerByRepId((current) => ({
                            ...current,
                            [rep.id]: event.target.value,
                          }));
                        }}
                        value={currentManagerId}
                      >
                        <option value="">Select manager</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))}
                      </select>
                      {hasStagedManager(rep.id) ? (
                        <button
                          className="rounded-xl bg-[linear-gradient(135deg,var(--forge-gold),var(--forge-ember))] px-3 py-2 text-sm font-semibold text-[#170d07] transition hover:brightness-110 disabled:opacity-50"
                          disabled={isPending}
                          onClick={() => {
                            void applyPrimaryManager(rep.id);
                          }}
                          type="button"
                        >
                          {isPending ? "Saving..." : "Apply"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
