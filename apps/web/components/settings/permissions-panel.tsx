"use client";

import { useState } from "react";
import type { TeamPermissionKey } from "@/lib/access/permissions";
import {
  ForgeButton,
  ForgeChip,
  ForgeManagementTable,
  ForgeMobileTableCards,
} from "../forge";
import {
  SettingsDrawerButton,
  SettingsDrawerGroup,
  SettingsEditorDrawer,
  SettingsEditorPanel,
  SettingsEditorWorkbench,
} from "./settings-workbench";
import { SettingsTableShell } from "./settings-readability";

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

export async function assignPrimaryManagerRequest(
  fetchFn: FetchFn,
  repId: string,
  managerId: string,
): Promise<RequestResult<{ managerId?: string }>> {
  const response = await fetchFn(
    `/api/organizations/members/${repId}/primary-manager`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    },
  );
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
      presetKeys.every(
        (permissionKey, index) => permissionKey === currentKeys[index],
      )
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
  const [selectedTeamId, setSelectedTeamId] = useState(
    () => teams[0]?.id ?? "",
  );
  const [stagedManagerByRepId, setStagedManagerByRepId] = useState<
    Record<string, string>
  >({});
  const [stagedPresetByKey, setStagedPresetByKey] = useState<
    Record<string, string>
  >({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selectedTeam =
    teams.find((team) => team.id === selectedTeamId) ?? teams[0] ?? null;
  const selectedTeamManagers = selectedTeam
    ? memberships.filter(
        (membership) =>
          membership.teamId === selectedTeam.id &&
          membership.membershipType === "manager",
      )
    : [];
  const selectedTeamReps = selectedTeam
    ? memberships.filter(
        (membership) =>
          membership.teamId === selectedTeam.id &&
          membership.membershipType === "rep",
      )
    : [];
  const selectedRepIds = new Set(
    selectedTeamReps.map((membership) => membership.userId),
  );
  const visiblePrimaryManagerReps = selectedTeam
    ? localReps.filter((rep) => selectedRepIds.has(rep.id))
    : [];
  const primaryManagerEmptyMessage = selectedTeam
    ? "No reps on this team yet. Add rep membership from /settings/teams."
    : "Select a team to manage primary manager assignments.";
  const activePresetCount = selectedTeam
    ? selectedTeamManagers.filter((membership) =>
        resolvePresetName(
          selectedTeam.id,
          membership.userId,
          localGrants,
          presets,
        ),
      ).length
    : 0;

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
    setNotice(
      shouldClearPreset
        ? "Permission preset cleared."
        : "Permission preset updated.",
    );
  }

  const hasStagedManager = (repId: string) => repId in stagedManagerByRepId;
  const hasStagedPreset = (stateKey: string) => stateKey in stagedPresetByKey;

  function renderPresetRows() {
    if (!selectedTeam) {
      return (
        <tr>
          <td className="px-4 py-4 text-[var(--forge-muted)]" colSpan={4}>
            Select a team to manage preset assignments.
          </td>
        </tr>
      );
    }

    if (selectedTeamManagers.length === 0) {
      return (
        <tr>
          <td className="px-4 py-4 text-[var(--forge-muted)]" colSpan={4}>
            No managers on this team yet. Add team membership from
            /settings/teams.
          </td>
        </tr>
      );
    }

    return selectedTeamManagers.map((membership) => {
      const stateKey = `${selectedTeam.id}:${membership.userId}`;
      const resolvedPresetName = resolvePresetName(
        selectedTeam.id,
        membership.userId,
        localGrants,
        presets,
      );
      const stagedPresetId = stagedPresetByKey[stateKey];
      const currentPreset = stagedPresetId ?? resolvedPresetName ?? "";
      const isPending = pendingKey === `preset:${stateKey}`;

      return (
        <tr key={stateKey}>
          <td className="px-4 py-3 text-sm font-semibold text-[var(--forge-text)]">
            {managers.find((manager) => manager.id === membership.userId)
              ?.name ?? membership.userId}
          </td>
          <td className="px-4 py-3 text-sm text-[var(--forge-muted)]">
            {resolvedPresetName ?? "No preset applied"}
          </td>
          <td className="px-4 py-3">
            <label className="block">
              <span className="sr-only">Preset for manager</span>
              <select
                className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60 disabled:opacity-50"
                disabled={isPending}
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
            </label>
          </td>
          <td className="px-4 py-3 text-right">
            {hasStagedPreset(stateKey) ? (
              <ForgeButton
                disabled={isPending}
                onClick={() => {
                  void applyPreset(selectedTeam.id, membership.userId);
                }}
                size="sm"
                type="button"
                variant="primary"
              >
                {isPending ? "Saving..." : "Apply"}
              </ForgeButton>
            ) : (
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--forge-muted)]">
                Saved
              </span>
            )}
          </td>
        </tr>
      );
    });
  }

  const permissionControls = (
    <SettingsEditorDrawer data-permissions-control-drawer="">
      <div className="space-y-5">
        <SettingsDrawerGroup label="Team context">
          {teams.length === 0 ? (
            <p className="px-3 text-sm text-[var(--forge-muted)]">
              Create a team before assigning permissions.
            </p>
          ) : (
            teams.map((team) => {
              const managerCount = memberships.filter(
                (membership) =>
                  membership.teamId === team.id &&
                  membership.membershipType === "manager",
              ).length;
              const repCount = memberships.filter(
                (membership) =>
                  membership.teamId === team.id &&
                  membership.membershipType === "rep",
              ).length;

              return (
                <SettingsDrawerButton
                  active={selectedTeam?.id === team.id}
                  icon="verified_user"
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  type="button"
                >
                  {team.name} · {managerCount} managers · {repCount} reps
                </SettingsDrawerButton>
              );
            })
          )}
        </SettingsDrawerGroup>

        <SettingsDrawerGroup label="Permission presets">
          {presets.length === 0 ? (
            <p className="px-3 text-sm text-[var(--forge-muted)]">
              No permission presets configured.
            </p>
          ) : (
            presets.map((preset) => (
              <div
                className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3"
                key={preset.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--forge-text)]">
                    {preset.name}
                  </p>
                  <ForgeChip tone="gold">{preset.role}</ForgeChip>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--forge-muted)]">
                  {preset.permissions.length} permissions
                </p>
              </div>
            ))
          )}
        </SettingsDrawerGroup>

        <SettingsDrawerGroup label="Counts">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3">
              <p className="text-xs font-medium text-[var(--forge-muted)]">
                Teams
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--forge-text)]">
                {teams.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-4 py-3">
              <p className="text-xs font-medium text-[var(--forge-muted)]">
                Reps
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--forge-text)]">
                {localReps.length}
              </p>
            </div>
          </div>
        </SettingsDrawerGroup>
      </div>
    </SettingsEditorDrawer>
  );

  return (
    <SettingsEditorWorkbench
      data-permissions-workspace="matrix"
      drawer={permissionControls}
      workbench="permissions"
    >
      <div className="space-y-5" data-permissions-assignment-matrix="">
        <SettingsEditorPanel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[var(--forge-muted)]">
                Team Preset Assignments
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--forge-text)]">
                {selectedTeam ? selectedTeam.name : "Select a team"}
              </h3>
              <p className="mt-2 text-sm text-[var(--forge-muted)]">
                Apply a permission preset to each manager membership on the
                selected team.
              </p>
            </div>
            <ForgeChip
              tone={
                activePresetCount === selectedTeamManagers.length &&
                activePresetCount > 0
                  ? "success"
                  : "muted"
              }
            >
              {activePresetCount}/{selectedTeamManagers.length} assigned
            </ForgeChip>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--forge-danger)_26%,transparent)] bg-[color-mix(in_srgb,var(--forge-danger)_10%,transparent)] px-4 py-3 text-sm text-[var(--forge-danger)]">
              {error}
            </div>
          ) : null}
          {notice ? (
            <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--forge-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--forge-success)_10%,transparent)] px-4 py-3 text-sm text-[var(--forge-success)]">
              {notice}
            </div>
          ) : null}

          <SettingsTableShell className="mt-5">
            <ForgeManagementTable
              mobileCards={
                <ForgeMobileTableCards>
                  {!selectedTeam || selectedTeamManagers.length === 0 ? (
                    <p className="text-sm text-[var(--forge-muted)]">
                      {selectedTeam
                        ? "No managers on this team yet. Add team membership from /settings/teams."
                        : "Select a team to manage preset assignments."}
                    </p>
                  ) : (
                    selectedTeamManagers.map((membership) => {
                      const stateKey = `${selectedTeam.id}:${membership.userId}`;
                      const resolvedPresetName = resolvePresetName(
                        selectedTeam.id,
                        membership.userId,
                        localGrants,
                        presets,
                      );
                      const stagedPresetId = stagedPresetByKey[stateKey];
                      const currentPreset =
                        stagedPresetId ?? resolvedPresetName ?? "";
                      const isPending = pendingKey === `preset:${stateKey}`;

                      return (
                        <div
                          className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4"
                          key={`${stateKey}:card`}
                        >
                          <p className="text-sm font-semibold text-[var(--forge-text)]">
                            {managers.find(
                              (manager) => manager.id === membership.userId,
                            )?.name ?? membership.userId}
                          </p>
                          <p className="mt-1 text-xs text-[var(--forge-muted)]">
                            Current preset:{" "}
                            {resolvedPresetName ?? "No preset applied"}
                          </p>
                          <label className="mt-3 block">
                            <span className="sr-only">Preset for manager</span>
                            <select
                              className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60 disabled:opacity-50"
                              disabled={isPending}
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
                          </label>
                          {hasStagedPreset(stateKey) ? (
                            <ForgeButton
                              className="mt-3"
                              disabled={isPending}
                              onClick={() => {
                                void applyPreset(
                                  selectedTeam.id,
                                  membership.userId,
                                );
                              }}
                              size="sm"
                              type="button"
                              variant="primary"
                            >
                              {isPending ? "Saving..." : "Apply"}
                            </ForgeButton>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </ForgeMobileTableCards>
              }
            >
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-medium text-[var(--forge-muted)]">
                  <tr>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Current preset</th>
                    <th className="px-4 py-3">Staged preset</th>
                    <th className="px-4 py-3 text-right">Apply</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                  {renderPresetRows()}
                </tbody>
              </table>
            </ForgeManagementTable>
          </SettingsTableShell>
        </SettingsEditorPanel>

        <SettingsEditorPanel>
          <p className="text-xs font-medium text-[var(--forge-muted)]">
            Primary Manager
          </p>
          <p className="mt-2 text-sm text-[var(--forge-muted)]">
            Assign one accountable manager per rep while preserving multi-team
            memberships.
          </p>

          {visiblePrimaryManagerReps.length === 0 ? (
            <p className="mt-5 text-sm text-[var(--forge-muted)]">
              {primaryManagerEmptyMessage}
            </p>
          ) : (
            <SettingsTableShell className="mt-5">
              <ForgeManagementTable
                mobileCards={
                  <ForgeMobileTableCards>
                    {visiblePrimaryManagerReps.map((rep) => {
                      const currentManagerId =
                        stagedManagerByRepId[rep.id] ??
                        rep.primaryManagerId ??
                        "";
                      const assignedManager = managers.find(
                        (manager) => manager.id === rep.primaryManagerId,
                      );
                      const isPending = pendingKey === `rep:${rep.id}`;

                      return (
                        <div
                          className="rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 p-4"
                          key={`${rep.id}:mobile`}
                        >
                          <p className="text-sm font-semibold text-[var(--forge-text)]">
                            {rep.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--forge-muted)]">
                            Current:{" "}
                            {assignedManager?.name ?? "No manager assigned"}
                          </p>
                          <label className="mt-3 block">
                            <span className="sr-only">
                              Primary manager for {rep.name}
                            </span>
                            <select
                              className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60 disabled:opacity-50"
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
                          </label>
                          {hasStagedManager(rep.id) ? (
                            <ForgeButton
                              className="mt-3"
                              disabled={isPending}
                              onClick={() => {
                                void applyPrimaryManager(rep.id);
                              }}
                              size="sm"
                              type="button"
                              variant="primary"
                            >
                              {isPending ? "Saving..." : "Apply"}
                            </ForgeButton>
                          ) : null}
                        </div>
                      );
                    })}
                  </ForgeMobileTableCards>
                }
              >
                <table className="w-full text-left text-sm">
                  <thead className="text-xs font-medium text-[var(--forge-muted)]">
                    <tr>
                      <th className="px-4 py-3">Rep</th>
                      <th className="px-4 py-3">Current manager</th>
                      <th className="px-4 py-3">Staged manager</th>
                      <th className="px-4 py-3 text-right">Apply</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--forge-border-strong)]/10">
                    {visiblePrimaryManagerReps.map((rep) => {
                      const currentManagerId =
                        stagedManagerByRepId[rep.id] ??
                        rep.primaryManagerId ??
                        "";
                      const assignedManager = managers.find(
                        (manager) => manager.id === rep.primaryManagerId,
                      );
                      const isPending = pendingKey === `rep:${rep.id}`;

                      return (
                        <tr key={rep.id}>
                          <td className="px-4 py-3 text-sm font-semibold text-[var(--forge-text)]">
                            {rep.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--forge-muted)]">
                            {assignedManager?.name ?? "No manager assigned"}
                          </td>
                          <td className="px-4 py-3">
                            <label className="block">
                              <span className="sr-only">
                                Primary manager for {rep.name}
                              </span>
                              <select
                                className="w-full rounded-xl border border-[var(--forge-border-strong)]/20 bg-[var(--forge-surface-2)]/50 px-3 py-2 text-sm text-[var(--forge-text)] outline-none transition focus:border-[var(--forge-gold)]/60 disabled:opacity-50"
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
                            </label>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {hasStagedManager(rep.id) ? (
                              <ForgeButton
                                disabled={isPending}
                                onClick={() => {
                                  void applyPrimaryManager(rep.id);
                                }}
                                size="sm"
                                type="button"
                                variant="primary"
                              >
                                {isPending ? "Saving..." : "Apply"}
                              </ForgeButton>
                            ) : (
                              <span className="text-xs uppercase tracking-[0.16em] text-[var(--forge-muted)]">
                                Saved
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ForgeManagementTable>
            </SettingsTableShell>
          )}
        </SettingsEditorPanel>
      </div>
    </SettingsEditorWorkbench>
  );
}
